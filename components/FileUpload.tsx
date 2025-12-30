import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Resume</h2>
        <p className="text-slate-400 mb-6">Paste your resume text below or upload a plain text file (.txt, .md).</p>
        
        <div className="space-y-4">
          {/* File Input */}
          <div className="relative group">
            <input 
              type="file" 
              accept=".txt,.md" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${fileName ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 group-hover:border-emerald-400 group-hover:bg-slate-700/50'}`}>
              {fileName ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                  <p className="text-emerald-300 font-medium">{fileName}</p>
                  <p className="text-xs text-emerald-500/70 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:text-emerald-400 transition-colors" />
                  <p className="text-slate-300 font-medium">Click to upload file</p>
                  <p className="text-xs text-slate-500 mt-1">Supports .txt, .md</p>
                </>
              )}
            </div>
          </div>

          <div className="relative">
             <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
             </div>
             <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">Or Paste Text</span>
             </div>
          </div>

          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Experience&#10;Software Engineer at Tech Corp...&#10;&#10;Education&#10;BS Computer Science..."
            className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none placeholder-slate-600 font-mono text-sm"
          />

          <button
            onClick={onSubmit}
            disabled={!text || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${!text || isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-[1.02] shadow-lg shadow-emerald-500/20'}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 Analyzing...
              </span>
            ) : (
              'Analyze & Start'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
