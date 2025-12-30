import React, { useState } from 'react';
import { AppState, Difficulty, ResumeAnalysis } from './types';
import FileUpload from './components/FileUpload';
import ResumeFeedback from './components/ResumeFeedback';
import LiveInterview from './components/LiveInterview';
import { analyzeResume } from './services/geminiService';
import { Brain, Sparkles, ChevronRight, Mic, Briefcase } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500/30">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppState('UPLOAD')}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              InterView.ai
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
             <span className={`px-3 py-1 rounded-full ${appState === 'UPLOAD' || appState === 'ANALYZING' ? 'text-emerald-400 bg-emerald-500/10' : ''}`}>Resume</span>
             <ChevronRight className="w-4 h-4" />
             <span className={`px-3 py-1 rounded-full ${appState === 'FEEDBACK' || appState === 'INTERVIEW_SETUP' ? 'text-emerald-400 bg-emerald-500/10' : ''}`}>Feedback</span>
             <ChevronRight className="w-4 h-4" />
             <span className={`px-3 py-1 rounded-full ${appState === 'LIVE_INTERVIEW' ? 'text-emerald-400 bg-emerald-500/10' : ''}`}>Interview</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-center">
            {error}
          </div>
        )}

        {appState === 'UPLOAD' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-12 max-w-2xl">
              <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                Master Your Interview with <span className="text-emerald-400">Real-Time AI</span>
              </h1>
              <p className="text-xl text-slate-400">
                Upload your resume, get instant expert feedback, and practice with our realistic voice AI interviewer.
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
            <div className="relative">
              <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-8">Analyzing Profile...</h2>
            <p className="text-slate-400 mt-2">Identifying your superpowers and areas for growth</p>
          </div>
        )}

        {appState === 'FEEDBACK' && analysis && (
          <ResumeFeedback 
            analysis={analysis} 
            onContinue={() => setAppState('INTERVIEW_SETUP')} 
          />
        )}

        {appState === 'INTERVIEW_SETUP' && (
           <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Choose Your Challenge</h2>
                <p className="text-slate-400">Select a difficulty level for your mock interview.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                 {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 group ${
                        difficulty === level 
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-xl shadow-emerald-500/10' 
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80'
                      }`}
                    >
                       <div className={`p-4 rounded-full ${difficulty === level ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:text-slate-200'}`}>
                          {level === Difficulty.EASY && <Briefcase className="w-6 h-6" />}
                          {level === Difficulty.MEDIUM && <Brain className="w-6 h-6" />}
                          {level === Difficulty.HARD && <Sparkles className="w-6 h-6" />}
                       </div>
                       <h3 className="text-xl font-bold">{level}</h3>
                       <p className="text-sm text-center text-slate-400">
                         {level === Difficulty.EASY ? 'Standard behavioral questions and basic background review.' : 
                          level === Difficulty.MEDIUM ? 'Technical deep dives and scenario-based questions.' : 
                          'Complex system design, pressure testing, and advanced problem solving.'}
                       </p>
                    </button>
                 ))}
              </div>

              <div className="flex justify-center">
                 <button 
                   onClick={startInterview}
                   className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105"
                 >
                    <Mic className="w-6 h-6" />
                    Start Live Interview
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
    </div>
  );
};

export default App;
