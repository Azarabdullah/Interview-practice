import React from 'react';
import { ResumeAnalysis } from '../types';
import { Award, AlertTriangle, Lightbulb, TrendingUp, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface ResumeFeedbackProps {
  analysis: ResumeAnalysis;
  onContinue: () => void;
}

const ResumeFeedback: React.FC<ResumeFeedbackProps> = ({ analysis, onContinue }) => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           
           <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                 {/* Background Circle */}
                 <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                 {/* Progress Circle */}
                 <circle 
                   cx="50" cy="50" r="45" 
                   fill="none" 
                   stroke={analysis.score >= 80 ? '#10b981' : analysis.score >= 60 ? '#f59e0b' : '#ef4444'} 
                   strokeWidth="8"
                   strokeDasharray={`${analysis.score * 2.83} 283`}
                   strokeLinecap="round"
                   className="transition-all duration-1000 ease-out"
                 />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                 <span className="text-5xl font-bold text-white tracking-tighter">{analysis.score}</span>
                 <span className="block text-sm text-slate-400 uppercase tracking-widest mt-1">/100</span>
              </div>
           </div>
           <h3 className="text-xl font-bold text-white mb-1">Resume Score</h3>
           <p className="text-sm text-slate-400">AI-calculated impact rating</p>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 flex flex-col justify-center shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white">Executive Summary</h3>
             </div>
             <p className="text-lg text-slate-300 leading-relaxed font-light">
               "{analysis.summary}"
             </p>
           </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-emerald-500/20 p-6 hover:bg-slate-900/60 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
               <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Top Strengths</h3>
          </div>
          <ul className="space-y-4">
             {analysis.strengths.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed group">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-amber-500/20 p-6 hover:bg-slate-900/60 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Growth Areas</h3>
          </div>
          <ul className="space-y-4">
             {analysis.weaknesses.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed group">
                 <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-blue-500/20 p-6 hover:bg-slate-900/60 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
               <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Action Plan</h3>
          </div>
          <ul className="space-y-4">
             {analysis.improvements.map((item, i) => (
               <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed group">
                 <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                   {i+1}
                 </div>
                 <span>{item}</span>
               </li>
             ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onContinue}
          className="group flex items-center gap-3 bg-white text-slate-950 text-lg font-bold py-4 px-8 rounded-full shadow-lg shadow-white/10 hover:shadow-white/20 transition-all hover:scale-105"
        >
           Start Mock Interview
           <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ResumeFeedback;