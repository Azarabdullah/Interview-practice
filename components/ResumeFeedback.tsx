import React from 'react';
import { ResumeAnalysis } from '../types';
import { Award, AlertTriangle, Lightbulb, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ResumeFeedbackProps {
  analysis: ResumeAnalysis;
  onContinue: () => void;
}

const ResumeFeedback: React.FC<ResumeFeedbackProps> = ({ analysis, onContinue }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Score Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4">
           <h2 className="text-3xl font-bold text-white">Resume Analysis</h2>
           <p className="text-slate-400 text-lg leading-relaxed">{analysis.summary}</p>
        </div>
        
        <div className="relative flex-shrink-0">
           <div className="w-32 h-32 rounded-full border-8 border-slate-700 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                 <circle 
                   cx="50" cy="50" r="46" 
                   fill="transparent" 
                   stroke="currentColor" 
                   strokeWidth="8"
                   className="text-emerald-500"
                   strokeDasharray={`${analysis.score * 2.89} 289`}
                   strokeLinecap="round"
                 />
              </svg>
              <div className="text-center">
                 <span className="text-4xl font-bold text-white">{analysis.score}</span>
                 <span className="block text-xs text-slate-400 uppercase tracking-wide">Score</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <Award className="w-6 h-6" />
            <h3 className="font-bold text-lg">Strengths</h3>
          </div>
          <ul className="space-y-3">
             {analysis.strengths.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500/50 flex-shrink-0" />
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-bold text-lg">Areas to Improve</h3>
          </div>
          <ul className="space-y-3">
             {analysis.weaknesses.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <Lightbulb className="w-6 h-6" />
            <h3 className="font-bold text-lg">Action Plan</h3>
          </div>
          <ul className="space-y-3">
             {analysis.improvements.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300">
                 <TrendingUp className="w-5 h-5 text-blue-500/50 flex-shrink-0" />
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onContinue}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105"
        >
           Start Mock Interview
        </button>
      </div>
    </div>
  );
};

export default ResumeFeedback;
