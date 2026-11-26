
import React, { useState, useEffect } from 'react';
import { Syllabus } from '../types';
import { ApiService } from '../services/api';

interface StudyHistoryProps {
  userEmail: string;
  onSelect: (s: Syllabus) => void;
  onRefresh: () => void;
  onSyllabusDeleted?: (id: string) => void;
}

const StudyHistory: React.FC<StudyHistoryProps> = ({ userEmail, onSelect, onRefresh, onSyllabusDeleted }) => {
  const [history, setHistory] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getHistory(userEmail).then(setHistory).finally(() => setLoading(false));
  }, [userEmail]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this course tracker?')) {
      try {
        await ApiService.deleteSyllabus(id);
        onSyllabusDeleted?.(id);
        onRefresh();
      } catch (err) {
        console.error(err);
        alert('Failed to delete. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-6">
          <i className="fas fa-folder-open text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-800">No courses found</h3>
        <p className="text-slate-500 text-center px-6">Analyze a new syllabus to start building your history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your Learning Library</h2>
        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">{history.length} Saved Plans</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map(s => {
          const allTopics = s.modules.flatMap(m => m.topics);
          const completed = allTopics.filter(t => t.status === 'completed').length;
          const progressPercent = Math.round((completed / allTopics.length) * 100) || 0;

          return (
            <div 
              key={s.id}
              onClick={() => onSelect(s)}
              className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative"
            >
              <button 
                onClick={(e) => handleDelete(e, s.id)}
                className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors p-2"
                title="Delete track"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
              
              <div className="mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  {s.role}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {s.title}
              </h3>
              
              <div className="space-y-4 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Course Progress</span>
                  <span className="text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <i className="fas fa-layer-group text-slate-300"></i>
                      {s.modules.length} Modules
                   </div>
                   <div className="text-[10px] text-slate-400 font-bold">
                      {new Date(s.createdAt).toLocaleDateString()}
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudyHistory;
