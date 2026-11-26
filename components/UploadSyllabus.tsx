
import React, { useState, useCallback } from 'react';
import { UserRole } from '../types';
import { analyzeSyllabus } from '../services/gemini';

interface UploadSyllabusProps {
  onSyllabusReady: (syllabus: any) => void;
}

const UploadSyllabus: React.FC<UploadSyllabusProps> = ({ onSyllabusReady }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [examDate, setExamDate] = useState('');
  const [studyHours, setStudyHours] = useState<number>(2);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'text' | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const extractPdfText = async (data: ArrayBuffer): Promise<string> => {
    // @ts-ignore
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result?.toString().split(',')[1] || null);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFileType('pdf');
      const arrayBuffer = await file.arrayBuffer();
      try {
        const text = await extractPdfText(arrayBuffer);
        setContent(text);
      } catch (err) {
        console.error("PDF extraction failed", err);
        alert("Could not read PDF text. Try taking a screenshot or pasting text.");
      }
    } else if (file.type === 'text/plain') {
      setFileType('text');
      const text = await file.text();
      setContent(text);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content && !imageBase64) return;

    setIsLoading(true);
    try {
      const result = await analyzeSyllabus(content, role, imageBase64 || undefined, examDate || undefined, studyHours);
      onSyllabusReady(result);
    } catch (err) {
      console.error('analyzeSyllabus error:', err);
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
      alert(`Failed to analyze syllabus. ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
          <i className="fas fa-magic text-white text-2xl"></i>
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Transform Your Syllabus</h2>
        <p className="text-slate-500 mt-2">Personalize your study path with your exam schedule.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
          {/* Persona Section */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i className="fas fa-user-graduate text-indigo-500"></i>
              I am a...
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(UserRole).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`relative px-4 py-4 rounded-2xl border-2 text-sm font-bold transition-all ${
                    role === r 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-600' 
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {role === r && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px]">
                      <i className="fas fa-check"></i>
                    </span>
                  )}
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* New Study Parameters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i className="fas fa-calendar-alt text-indigo-500"></i>
                Target Exam Date
              </label>
              <input 
                type="date"
                className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-600"
                value={examDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i className="fas fa-clock text-indigo-500"></i>
                Daily Study Hours
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range"
                  min="1"
                  max="16"
                  className="flex-1 accent-indigo-600"
                  value={studyHours}
                  onChange={(e) => setStudyHours(parseInt(e.target.value))}
                />
                <span className="w-12 text-center font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  {studyHours}h
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i className="fas fa-file-upload text-indigo-500"></i>
              Upload Document
            </label>
            <div className="flex flex-col items-center justify-center w-full">
              <label className={`flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                fileName ? 'border-green-400 bg-green-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-300'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all ${
                    fileName ? 'bg-green-100 text-green-600' : 'bg-white shadow-sm text-slate-400'
                  }`}>
                    <i className={`fas ${
                      fileType === 'pdf' ? 'fa-file-pdf' : 
                      fileType === 'image' ? 'fa-file-image' : 
                      fileType === 'text' ? 'fa-file-alt' : 'fa-cloud-arrow-up'
                    } text-2xl`}></i>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">
                    <span className="font-bold">{fileName || 'Drop your syllabus here'}</span>
                  </p>
                  <p className="text-xs text-slate-400">Supports PDF, Images, Word Copy-Paste, Text files</p>
                </div>
                <input type="file" className="hidden" accept="image/*,application/pdf,text/plain" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">or paste text</span>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              className="w-full h-44 p-5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none text-slate-600 text-sm leading-relaxed"
              placeholder="Paste the raw text of your syllabus, modules, or exam topics here..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (!fileName) setFileType('text');
              }}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isLoading || (!content && !imageBase64)}
            className={`group w-full py-5 rounded-2xl font-black text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${
              isLoading || (!content && !imageBase64) 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-indigo-200'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing Syllabus...
              </>
            ) : (
              <>
                Analyze & Track Now
                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
        <FeatureSmall icon="fa-bolt" title="AI Extraction" desc="Handles messy formatting automatically" />
        <FeatureSmall icon="fa-bullseye" title="Priority Focus" desc="Identifies high-impact exam topics" />
        <FeatureSmall icon="fa-calendar-check" title="Deadline Driven" desc="Auto-calculates study load for exam date" />
      </div>
    </div>
  );
};

const FeatureSmall: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex gap-4 p-4 rounded-2xl bg-white/50 border border-slate-100">
    <div className="text-indigo-600 mt-1">
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{desc}</p>
    </div>
  </div>
);

export default UploadSyllabus;
