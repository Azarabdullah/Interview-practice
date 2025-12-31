import React, { useState } from 'react';
import { AppState, Difficulty, ResumeAnalysis } from './types';
import FileUpload from './components/FileUpload';
import ResumeFeedback from './components/ResumeFeedback';
import LiveInterview from './components/LiveInterview';
import { analyzeResume } from './services/geminiService';
import { Brain, Sparkles, ChevronRight, Mic, Briefcase, Zap, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [appState, setAppState] = useState<AppState>('UPLOAD');
  const [resumeText, setResumeText] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async () => {
    if (!resumeText) return;
    setAppState('ANALYZING');
    setError(null);
    try {
      const result = await analyzeResume(resumeText);
      setAnalysis(result);
      setAppState('FEEDBACK');
    } catch (err) {
      console.error(err);
      setError("Failed to analyze resume. Please try again or check your API key.");
      setAppState('UPLOAD');
    }
  };

  const startInterview = () => {
    setAppState('LIVE_INTERVIEW');
  };

  const StepIndicator = ({ active, label, step }: { active: boolean; label: string, step: number }) => {
     // Determine state: 0=past, 1=current, 2=future based on appState mapping
     let state = 'future';
     const states = ['UPLOAD', 'ANALYZING', 'FEEDBACK', 'INTERVIEW_SETUP', 'LIVE_INTERVIEW'];
     const currentIndex = states.indexOf(appState);
     // Map visual steps: Resume (0,1) -> Feedback (2) -> Interview (3,4)
     const visualStepIndex = step;
     let currentVisualStep = 0;
     if (currentIndex >= 2) currentVisualStep = 1;
     if (currentIndex >= 3) currentVisualStep = 2;

     if (visualStepIndex < currentVisualStep) state = 'completed';
     else if (visualStepIndex === currentVisualStep) state = 'current';
     
     return (
       <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${state === 'current' ? 'bg-white/10 border border-white/10 shadow-lg backdrop-blur-md' : 'opacity-60'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
             state === 'completed' ? 'bg-emerald-500 text-white' : 
             state === 'current' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
             {state === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : visualStepIndex + 1}
          </div>
          <span className={`text-sm font-medium ${state === 'current' ? 'text-white' : 'text-slate-400'}`}>{label}</span>
       </div>
     );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6">
        <div className="max-w-6xl mx-auto">
           <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAppState('UPLOAD')}>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/30 transition-shadow">
                  <Brain className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  InterView.ai
                </span>
              </div>
              
              <div className="hidden md:flex items-center gap-2">
                 <StepIndicator active={appState === 'UPLOAD' || appState === 'ANALYZING'} label="Resume" step={0} />
                 <div className="w-8 h-[1px] bg-slate-700"></div>
                 <StepIndicator active={appState === 'FEEDBACK'} label="Analysis" step={1} />
                 <div className="w-8 h-[1px] bg-slate-700"></div>
                 <StepIndicator active={appState === 'INTERVIEW_SETUP' || appState === 'LIVE_INTERVIEW'} label="Interview" step={2} />
              </div>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-12 relative z-10">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
            {error}
          </div>
        )}

        {appState === 'UPLOAD' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="text-center mb-12 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-medium mb-6">
                 <Sparkles className="w-4 h-4" />
                 <span>Powered by Gemini 2.5 Flash</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                Master Your Interview <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Before It Happens</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Upload your resume to get AI-powered feedback and practice with a real-time voice interviewer that adapts to your profile.
              </p>
            </div>
            <FileUpload 
              onContentChange={setResumeText} 
              onSubmit={handleAnalysis}
              isProcessing={false}
            />
          </div>
        )}

        {appState === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-4 border-purple-500/20"></div>
              <div className="absolute inset-4 rounded-full border-4 border-t-purple-500 animate-spin-slow reverse"></div>
              <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold text-white mt-8 tracking-tight">Analyzing Profile...</h2>
            <p className="text-slate-400 mt-2 text-lg">Identifying your unique strengths and growth areas</p>
          </div>
        )}

        {appState === 'FEEDBACK' && analysis && (
          <ResumeFeedback 
            analysis={analysis} 
            onContinue={() => setAppState('INTERVIEW_SETUP')} 
          />
        )}

        {appState === 'INTERVIEW_SETUP' && (
           <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Choose Your Challenge</h2>
                <p className="text-slate-400 text-lg">Select a difficulty level to tailor the AI interviewer's persona.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                 {[
                   { id: Difficulty.EASY, icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50', desc: "Standard behavioral questions. Good for warm-ups." },
                   { id: Difficulty.MEDIUM, icon: Brain, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50', desc: "Technical deep dives & scenarios. Balanced difficulty." },
                   { id: Difficulty.HARD, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50', desc: "Complex system design & pressure testing. For experts." }
                 ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setDifficulty(level.id)}
                      className={`relative p-8 rounded-3xl border transition-all duration-300 flex flex-col items-center gap-6 group text-left
                        ${difficulty === level.id 
                        ? 'bg-slate-800/80 border-white/20 shadow-2xl scale-105 z-10' 
                        : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 ' + level.border
                      }`}
                    >
                       <div className={`p-4 rounded-2xl ${level.bg} ${level.color} transition-transform group-hover:scale-110 duration-300`}>
                          <level.icon className="w-8 h-8" />
                       </div>
                       <div>
                         <h3 className={`text-xl font-bold mb-2 ${difficulty === level.id ? 'text-white' : 'text-slate-300'}`}>{level.id}</h3>
                         <p className="text-sm text-slate-400 leading-relaxed text-center md:text-left">
                           {level.desc}
                         </p>
                       </div>
                       
                       {difficulty === level.id && (
                         <div className="absolute top-4 right-4">
                           <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                         </div>
                       )}
                    </button>
                 ))}
              </div>

              <div className="flex justify-center">
                 <button 
                   onClick={startInterview}
                   className="group relative flex items-center gap-4 bg-white text-slate-900 text-xl font-bold py-5 px-12 rounded-full shadow-xl shadow-white/10 transition-all hover:scale-105 hover:shadow-white/20"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <span className="relative flex items-center gap-3">
                       <Mic className="w-6 h-6 text-indigo-600" />
                       Start Live Interview
                    </span>
                 </button>
              </div>
           </div>
        )}

        {appState === 'LIVE_INTERVIEW' && (
          <LiveInterview 
            resumeText={resumeText} 
            difficulty={difficulty} 
            onEndSession={() => setAppState('FEEDBACK')} 
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-slate-600 text-sm relative z-10">
        <p>© {new Date().getFullYear()} InterView.ai • Built with Google Gemini 2.5</p>
      </footer>
    </div>
  );
};

export default App;