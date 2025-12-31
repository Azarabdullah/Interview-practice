import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Difficulty } from '../types';
import { Mic, MicOff, PhoneOff, Activity, Volume2, AlertCircle, RefreshCw, Radio } from 'lucide-react';

interface LiveInterviewProps {
  resumeText: string;
  difficulty: Difficulty;
  onEndSession: () => void;
}

const LiveInterview: React.FC<LiveInterviewProps> = ({ resumeText, difficulty, onEndSession }) => {
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false); // Ref to track mute state in callbacks
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<string>('Initializing...');
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting');
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  
  // Stream & Processing Refs
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Audio Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session & Logic Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mountedRef = useRef<boolean>(true);
  const isConnectedRef = useRef<boolean>(false);
  const currentConnectionIdRef = useRef<string>("");
  const isErrorRef = useRef<boolean>(false);
  
  // Retry Logic Refs
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<any>(null); // Using any for timeout to handle browser/node types
  const MAX_RETRIES = 3;

  // Visualizer Animation
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    
    // Clear any pending retry
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }
    
    // Stop all playing audio sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Disconnect audio nodes
    if (processorRef.current) {
      try { 
        processorRef.current.disconnect(); 
        processorRef.current.onaudioprocess = null; // Remove handler
      } catch (e) {}
    }
    if (inputSourceRef.current) {
      try { inputSourceRef.current.disconnect(); } catch (e) {}
    }

    // Close Audio Contexts
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch(e) {}
    }
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      try { inputContextRef.current.close(); } catch(e) {}
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Close Gemini Session
    if (sessionPromiseRef.current) {
      const currentPromise = sessionPromiseRef.current;
      sessionPromiseRef.current = null; // Detach immediately to prevent double close
      
      currentPromise.then(session => {
        try {
          console.log("Closing session...");
          session.close();
        } catch (e) {
          // Session might already be closed, which is fine
        }
      }).catch((e) => {
          // Ignore errors from the promise if it failed to connect
      });
    }
  }, []);

  const connect = async (isRetry = false) => {
    // Validate API Key presence
    if (!process.env.API_KEY) {
      setStatus("API Key missing. Please check configuration.");
      setConnectionState('error');
      return;
    }

    if (!isRetry) {
        retryCountRef.current = 0;
    }

    const connectionId = Math.random().toString(36).substring(7);
    currentConnectionIdRef.current = connectionId;

    cleanup();
    
    setConnectionState('connecting');
    isErrorRef.current = false;
    
    if (isRetry) {
        setStatus(`Connection disrupted. Retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
    } else {
        setStatus('Initializing audio...');
    }

    try {
      if (!mountedRef.current) return;

      // 1. Get User Media
      if (!isRetry) setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      if (currentConnectionIdRef.current !== connectionId) {
          stream.getTracks().forEach(t => t.stop());
          return;
      }
      streamRef.current = stream;

      // 2. Setup Audio Contexts
      // Output Context (24kHz as per Google recommendations for high quality output)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      // Input Context (16kHz for speech recognition)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;
      
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // 3. Connect to Gemini Live
      if (!mountedRef.current) return;
      if (!isRetry) setStatus('Connecting to AI Interviewer...');
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Limit resume context size to avoid overwhelming the prompt/token limits for system instruction
      const truncatedResume = resumeText.substring(0, 3000);
      
      const systemInstruction = `
        You are an experienced, professional interviewer. 
        You are conducting a ${difficulty} level interview.
        The candidate has provided the following resume content:
        ---
        ${truncatedResume}
        ---
        
        Guidelines:
        - Briefly welcome the candidate.
        - Ask relevant questions based on the resume and difficulty level.
        - Keep responses concise (under 30s) and conversational.
        - Listen to the candidate's answers and follow up.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (!mountedRef.current || currentConnectionIdRef.current !== connectionId) return;
            console.log('Live session connected:', connectionId);
            
            // Success! Reset retries.
            retryCountRef.current = 0;
            
            setStatus('Interview in progress');
            setConnectionState('connected');
            isConnectedRef.current = true;
            
            // Setup Input Processing
            try {
                const source = inputCtx.createMediaStreamSource(stream);
                inputSourceRef.current = source;
                
                // Use 4096 buffer size for stability (approx 256ms latency)
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                
                processor.onaudioprocess = (e) => {
                  // Use ref here to get the latest mute state inside the closure
                  if (isMutedRef.current || !isConnectedRef.current || currentConnectionIdRef.current !== connectionId) return;

                  const inputData = e.inputBuffer.getChannelData(0);
                  
                  // Visualizer
                  let sum = 0;
                  for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                  const rms = Math.sqrt(sum / inputData.length);
                  setAudioLevel(prev => Math.max(rms * 100, prev * 0.9));

                  const pcmBlob = createBlob(inputData);
                  
                  // Send to Gemini
                  if (sessionPromiseRef.current) {
                      sessionPromiseRef.current.then(session => {
                        if (isConnectedRef.current && currentConnectionIdRef.current === connectionId) {
                           try {
                               session.sendRealtimeInput({ media: pcmBlob });
                           } catch (sendError) {
                               // Silent fail on send error to prevent crashing loops
                           }
                        }
                      }).catch(err => {
                        // Silent fail on promise error
                      });
                  }
                };

                source.connect(processor);
                processor.connect(inputCtx.destination); // Mute input to local speakers
            } catch (err) {
                console.error("Error setting up audio input:", err);
                if (isConnectedRef.current) {
                    isConnectedRef.current = false;
                    isErrorRef.current = true;
                    setConnectionState('error');
                    setStatus('Audio setup failed.');
                }
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             if (!mountedRef.current || currentConnectionIdRef.current !== connectionId) return;
             
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
               try {
                 const currentCtx = audioContextRef.current;
                 if (!currentCtx || currentCtx.state === 'closed') return;

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
                 console.error("Error decoding audio response:", err);
               }
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
               console.log("Model interrupted by user");
               sourcesRef.current.forEach(s => {
                 try { s.stop(); } catch(e){}
               });
               sourcesRef.current.clear();
               if (audioContextRef.current) {
                 nextStartTimeRef.current = audioContextRef.current.currentTime;
               }
             }
          },
          onclose: (e) => {
            console.log('Session closed', e);
            if (!mountedRef.current || currentConnectionIdRef.current !== connectionId) return;
            
            isConnectedRef.current = false;
            
            if (!isErrorRef.current) {
                setStatus('Session ended');
                setConnectionState('ended');
            }
          },
          onerror: (err) => {
            if (!mountedRef.current || currentConnectionIdRef.current !== connectionId) return;
            
            isConnectedRef.current = false;
            isErrorRef.current = true;

            // Retry Logic
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                console.warn(`Session error caught (attempting retry ${retryCountRef.current}/${MAX_RETRIES}):`, err);
                const delay = 1000 * retryCountRef.current;
                
                setStatus(`Reconnecting (Attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
                
                retryTimeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) connect(true);
                }, delay);
                return;
            }
            
            console.error("Session error fatal:", err);

            // Format error message for user if retries failed
            let errorMessage = 'Connection disrupted.';
            if (err instanceof Error) {
                if (err.message.includes('Network')) {
                    errorMessage = 'Network error. Please check your connection.';
                } else if (err.message.includes('401') || err.message.includes('permission')) {
                    errorMessage = 'Unauthorized. Please check API Key.';
                } else if (err.message.includes('503')) {
                    errorMessage = 'Service unavailable. Try again later.';
                }
            }
            
            setStatus(errorMessage);
            setConnectionState('error');
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;

    } catch (error) {
      console.error("Fatal connection error:", error);
      
      // Handle initial connection failure retry
      if (mountedRef.current && currentConnectionIdRef.current === connectionId) {
          
          const isNetworkError = error instanceof Error && (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('Failed to fetch'));
          
          if (isNetworkError && retryCountRef.current < MAX_RETRIES) {
             retryCountRef.current++;
             const delay = 1000 * retryCountRef.current;
             setStatus(`Connection failed. Retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
             retryTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) connect(true);
             }, delay);
             return;
          }

          setStatus('Connection failed. Please check your mic and network.');
          setConnectionState('error');
          isErrorRef.current = true;
          cleanup();
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const toggleMute = () => {
    setIsMuted(prev => {
        const next = !prev;
        isMutedRef.current = next; // Sync ref
        return next;
    });
  };

  const getStatusTitle = () => {
    switch (connectionState) {
        case 'connected': return 'Interview in Progress';
        case 'error': return 'Connection Error';
        case 'ended': return 'Interview Ended';
        default: return 'Connecting...';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-5xl mx-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden animate-fade-in">
       
       {/* Ambient glow for connected state */}
       <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] transition-all duration-1000 ${
         connectionState === 'connected' ? 'bg-indigo-500/20 opacity-100' : 'bg-red-500/10 opacity-0'
       }`} />

       {/* Top Status Bar */}
       <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-full border border-white/5 backdrop-blur-sm">
             <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
             <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">
                {connectionState === 'connected' ? 'LIVE' : 'OFFLINE'}
             </span>
          </div>
          <div className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-300 uppercase tracking-wider">
             {difficulty} Mode
          </div>
       </div>
       
       {/* Main Visualizer */}
       <div className="relative z-10 mb-16 mt-8">
         {/* Outer glow rings */}
         <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-100 ${
            connectionState === 'connected' ? 'bg-indigo-500/30' : 'bg-transparent'
         }`} style={{ transform: `scale(${1 + audioLevel * 0.08})` }} />

         <div 
           className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
             connectionState === 'connected' 
               ? 'bg-gradient-to-br from-indigo-600 to-purple-700 shadow-indigo-500/50' 
               : connectionState === 'error' 
                 ? 'bg-slate-800 border-2 border-red-500/50' 
                 : 'bg-slate-800 border-2 border-slate-700'
           }`}
           style={{
             transform: connectionState === 'connected' ? `scale(${1 + Math.min(audioLevel * 0.05, 0.3)})` : 'scale(1)'
           }}
         >
            {/* Inner pulsing core */}
            {connectionState === 'connected' && (
               <div className="absolute inset-2 rounded-full border border-white/20 animate-pulse"></div>
            )}

            {connectionState === 'connected' ? (
              <Activity className="w-20 h-20 text-white/90" />
            ) : connectionState === 'error' ? (
              <AlertCircle className="w-20 h-20 text-red-400" />
            ) : connectionState === 'ended' ? (
              <PhoneOff className="w-20 h-20 text-slate-400" />
            ) : (
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
            )}
         </div>
       </div>

       {/* Status Text */}
       <div className="text-center mb-12 relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{getStatusTitle()}</h2>
          <p className={`text-lg font-medium h-6 transition-colors ${connectionState === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
             {status}
          </p>
       </div>

       {/* Control Bar */}
       <div className="flex items-center gap-8 z-10 p-4 bg-slate-950/50 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
          <button 
            onClick={toggleMute}
            disabled={connectionState !== 'connected'}
            className={`p-5 rounded-full transition-all duration-200 hover:scale-110 ${
              isMuted 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' 
                : connectionState !== 'connected' 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 border border-indigo-400/50'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {connectionState === 'error' && (
            <button 
               onClick={() => connect(false)} 
               className="p-5 rounded-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-600 transition-all hover:scale-110"
               title="Retry Connection"
            >
               <RefreshCw className="w-6 h-6" />
            </button>
          )}

          <button 
            onClick={onEndSession}
            className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold flex items-center gap-3 transition-all hover:shadow-red-600/30 shadow-lg hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
            {connectionState === 'ended' ? 'Back to Feedback' : 'End Interview'}
          </button>
          
          <div className="w-[1px] h-10 bg-white/10 mx-2"></div>

          <div className="p-4 text-slate-500">
             <Radio className={`w-6 h-6 ${connectionState === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-slate-700'}`} />
          </div>
       </div>
    </div>
  );
};

export default LiveInterview;