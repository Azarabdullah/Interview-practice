import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Difficulty } from '../types';
import { Mic, MicOff, PhoneOff, Activity, Volume2 } from 'lucide-react';

interface LiveInterviewProps {
  resumeText: string;
  difficulty: Difficulty;
  onEndSession: () => void;
}

const LiveInterview: React.FC<LiveInterviewProps> = ({ resumeText, difficulty, onEndSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<string>('Initializing...');
  
  // Refs for audio handling to avoid re-renders closing resources
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Connection ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  // Animation frame for visualizer
  const animationFrameRef = useRef<number>();

  const cleanup = useCallback(() => {
    // Close session if possible (no explicit close method on session object in basic usage, but we close socket via library internals if exposed, or just stop sending)
    // The library handles cleanup on disconnect usually, but we need to stop our audio nodes.

    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Disconnect nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
    }

    // Close contexts
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      inputContextRef.current.close();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsConnected(false);
  }, []);

  const connect = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setStatus('Connecting to Gemini Live...');
      
      // Initialize Audio Contexts
      // Output (24kHz is standard for Gemini Flash Native Audio, but we can stick to standard 24k or 48k and resample if needed. 
      // The model output usually matches what we ask or defaults. The example uses 24000 for output context)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;
      
      const inputNode = inputCtx.createGain(); // Not strictly used in this path but good for structure
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // Initialize AI Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      aiRef.current = ai;

      const systemInstruction = `
        You are an experienced, professional interviewer. 
        You are conducting a ${difficulty} level interview.
        
        The candidate has provided the following resume content:
        ---
        ${resumeText.substring(0, 5000)}
        ---
        
        Your Goal:
        1. Start by briefly welcoming the candidate and asking them to introduce themselves based on their resume.
        2. Ask questions relevant to their experience and the ${difficulty} difficulty level.
        3. Keep your responses concise (under 30 seconds) and conversational.
        4. Do not read the resume back to them; use it to form questions.
        5. Be encouraging but rigorous.
      `;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Professional voice
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log('Live session connected');
            setStatus('Interview in progress');
            setIsConnected(true);
            
            // Start Audio Streaming Logic
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // ScriptProcessor for raw PCM capture (Buffer size 4096 is a good balance)
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return; // Simple software mute

              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer data
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setAudioLevel(prev => Math.max(rms * 100, prev * 0.9)); // Smooth decay

              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
               try {
                 const currentCtx = audioContextRef.current;
                 if (!currentCtx) return;

                 // Sync timing
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentCtx.currentTime);

                 const audioBytes = base64ToUint8Array(base64Audio);
                 const audioBuffer = await decodeAudioData(audioBytes, currentCtx, 24000, 1);
                 
                 const source = currentCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNode);
                 
                 source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                 });
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
               } catch (err) {
                 console.error("Error decoding audio", err);
               }
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
               console.log("Model interrupted");
               sourcesRef.current.forEach(s => {
                 try { s.stop(); } catch(e){}
               });
               sourcesRef.current.clear();
               if (audioContextRef.current) {
                 nextStartTimeRef.current = audioContextRef.current.currentTime;
               }
             }
          },
          onclose: () => {
            console.log('Session closed');
            setStatus('Session ended');
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Session error", err);
            setStatus('Connection error. Please restart.');
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start live session:", error);
      setStatus('Failed to connect. Check permissions.');
    }
  };

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-4xl mx-auto bg-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
       {/* Background Pulse Effect */}
       <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl transition-all duration-300 ${isConnected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
       
       {/* Main Visualizer Circle */}
       <div className="relative z-10 mb-12">
         <div 
           className="w-40 h-40 rounded-full bg-slate-900 border-4 border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-100"
           style={{
             transform: `scale(${1 + Math.min(audioLevel * 0.05, 0.2)})`
           }}
         >
            {isConnected ? (
              <Activity className="w-16 h-16 text-emerald-400 animate-pulse" />
            ) : (
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            )}
         </div>
         {/* Ripple rings */}
         {isConnected && (
            <>
               <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
               <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
            </>
         )}
       </div>

       {/* Status Text */}
       <h2 className="text-2xl font-semibold text-white mb-2 tracking-wide">{isConnected ? 'Interview in Progress' : 'Connecting...'}</h2>
       <p className="text-slate-400 mb-12 font-medium">{status}</p>

       {/* Controls */}
       <div className="flex items-center gap-6 z-10">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            onClick={onEndSession}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-5 h-5" />
            End Interview
          </button>
          
          <div className="p-4 rounded-full bg-slate-700 text-slate-400">
             <Volume2 className="w-6 h-6" />
          </div>
       </div>

       {/* Difficulty Badge */}
       <div className="absolute top-6 right-6 px-3 py-1 bg-slate-700/50 rounded-full border border-slate-600 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          Level: {difficulty}
       </div>
    </div>
  );
};

export default LiveInterview;
