import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, FileCode } from 'lucide-react';

interface FileUploadProps {
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onContentChange, onSubmit, isProcessing }) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
        onContentChange(content);
      };
      reader.readAsText(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onContentChange(e.target.value);
    setFileName('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      
      {/* Option 1: File Drop */}
      <div className="relative group h-full min-h-[300px]">
        <input 
          type="file" 
          accept=".txt,.md" 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className={`h-full bg-slate-900/50 backdrop-blur-md border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
          fileName 
            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
            : 'border-slate-700 group-hover:border-indigo-400/50 group-hover:bg-slate-800/50'
        }`}>
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${
            fileName ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {fileName ? <FileCode className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
          </div>
          
          {fileName ? (
            <>
              <p className="text-xl font-semibold text-white mb-2 break-all">{fileName}</p>
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span>Ready to analyze</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-white mb-2">Drop your resume</p>
              <p className="text-slate-400 text-sm max-w-[200px]">Supports .txt or .md format plain text files</p>
            </>
          )}
        </div>
      </div>

      {/* Option 2: Paste Text */}
      <div className="flex flex-col gap-4 h-full">
        <div className="relative flex-grow">
          <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border-x border-t border-slate-700/50 flex items-center px-4 gap-2 z-10">
             <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
             <span className="ml-2 text-xs text-slate-500 font-mono">resume.txt</span>
          </div>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="// Or paste your experience here..."
            className="w-full h-[300px] bg-slate-950/80 border border-slate-700/50 rounded-3xl pt-14 p-6 text-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none placeholder-slate-600 font-mono text-sm leading-relaxed shadow-xl"
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={!text || isProcessing}
          className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${
            !text || isProcessing 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-3">
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               Processing...
            </span>
          ) : (
            'Analyze & Continue'
          )}
        </button>
      </div>

    </div>
  );
};

export default FileUpload;