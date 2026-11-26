
import React, { useState, useMemo } from 'react';
import { Syllabus, TopicStatus, Module, Timetable, Topic } from '../types';
import { ApiService } from '../services/api';
import { generateTimetable } from '../services/gemini';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  syllabus: Syllabus;
  onUpdate: (updated: Syllabus) => void;
}

const ImportanceStars: React.FC<{ level: 'High' | 'Medium' | 'Low' }> = ({ level }) => {
  const configs = {
    High: { color: 'text-red-500 bg-red-50', icon: 'fa-fire', stars: 3, label: 'High Priority' },
    Medium: { color: 'text-amber-500 bg-amber-50', icon: 'fa-bolt', stars: 2, label: 'Medium' },
    Low: { color: 'text-blue-500 bg-blue-50', icon: 'fa-leaf', stars: 1, label: 'Standard' },
  };

  const config = configs[level];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.color} border border-current border-opacity-10`}>
      <div className="flex gap-0.5">
        {[...Array(3)].map((_, i) => (
          <i key={i} className={`fas fa-star text-[8px] ${i < config.stars ? 'opacity-100' : 'opacity-20'}`}></i>
        ))}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{config.label}</span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ syllabus, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'curriculum' | 'timetable'>('curriculum');
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);

  const allTopics = syllabus.modules.flatMap(m => m.topics);
  const completed = allTopics.filter(t => t.status === TopicStatus.COMPLETED).length;
  const progressPercent = Math.round((completed / allTopics.length) * 100) || 0;
  const totalHours = allTopics.reduce((acc, t) => acc + t.estimatedHours, 0);
  const remainingHours = allTopics
    .filter(t => t.status !== TopicStatus.COMPLETED)
    .reduce((acc, t) => acc + t.estimatedHours, 0);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return syllabus.modules;
    const query = searchQuery.toLowerCase();
    return syllabus.modules.map(m => ({
      ...m,
      topics: m.topics.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      )
    })).filter(m => m.topics.length > 0);
  }, [syllabus.modules, searchQuery]);

  const handleStatusChange = async (moduleId: string, topicId: string, status: TopicStatus) => {
    try {
      const updated = await ApiService.updateTopicStatus(syllabus.id, moduleId, topicId, status);
      if (updated) onUpdate(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    }
  };

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(syllabus.dailyStudyHours || 2);

  const handleUpdateGoal = async () => {
    setIsGeneratingTimetable(true);
    try {
      const updatedSyllabus = { ...syllabus, dailyStudyHours: tempGoal };
      
      // 1. Generate new timetable with the NEW goal immediately
      const timetable = await generateTimetable(updatedSyllabus);
      const finalSyllabus = { ...updatedSyllabus, timetable };
      
      // 2. Save everything in one go
      const saved = await ApiService.saveSyllabus(finalSyllabus);
      
      onUpdate(saved);
      setIsEditingGoal(false);
      setActiveView('timetable');
    } catch (err) {
      console.error("Update Goal Error:", err);
      alert('Failed to update goal. Please try again.');
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const handleGenerateTimetable = async (targetSyllabus?: Syllabus) => {
    setIsGeneratingTimetable(true);
    try {
      // If it's a React event or missing, use the default syllabus state
      const syllabusToUse = (targetSyllabus && 'modules' in targetSyllabus) ? targetSyllabus : syllabus;
      
      const timetable = await generateTimetable(syllabusToUse);
      const updatedSyllabus = { ...syllabusToUse, timetable };
      const saved = await ApiService.saveSyllabus(updatedSyllabus);
      onUpdate(saved);
      setActiveView('timetable');
    } catch (err) {
      console.error("Regeneration Error:", err);
      alert('Failed to generate timetable. Please try again.');
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const handleExportPDF = () => {
    if (!syllabus.timetable) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('SmartSyllabus Study Plan', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(syllabus.title, pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`User: ${syllabus.userEmail} | Exam: ${syllabus.examDate || 'Flexible'} | Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 38, { align: 'center' });

    let startY = 50;

    syllabus.timetable.days.forEach((day) => {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Day ${day.dayNumber}`, 14, startY);

      const tableData = day.tasks.map(task => {
        let priorityTag = '';
        if (task.importance === 'High') priorityTag = ' [!!! HIGH]';
        else if (task.importance === 'Medium') priorityTag = ' [!! MED]';
        else priorityTag = ' [! LOW]';

        return [
          `${task.topicTitle}${priorityTag}`,
          `${task.duration}h`
        ];
      });

      autoTable(doc, {
        startY: startY + 5,
        head: [['Topic & Priority', 'Time']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'center' }
        }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`${syllabus.title.replace(/\s+/g, '_')}_Study_Plan.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {(syllabus.isFallback || syllabus.timetable?.isFallback) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-800 shadow-sm animate-in slide-in-from-top duration-500">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
            <i className="fas fa-robot"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">AI Service Limitation</p>
            <p className="text-xs opacity-90">Google AI services are currently experiencing high demand. We've generated a <b>local fallback</b> for you so you can keep studying. Try regenerating later for an AI-optimized plan.</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 rounded-lg text-[10px] font-bold transition-colors"
          >
            Retry Now
          </button>
        </div>
      )}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
              {syllabus.role}
            </span>
            {syllabus.examDate && (
              <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider">
                <i className="far fa-calendar-check mr-1"></i> Exam: {new Date(syllabus.examDate).toLocaleDateString()}
              </span>
            )}
            {!isEditingGoal ? (
              <span 
                onClick={() => setIsEditingGoal(true)}
                className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-emerald-100 cursor-pointer group"
              >
                <i className="far fa-clock mr-1"></i> Goal: {syllabus.dailyStudyHours}h/day
                <i className="fas fa-pen ml-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                <input 
                  type="range" min="1" max="12" step="1" 
                  value={tempGoal} 
                  onChange={(e) => setTempGoal(parseInt(e.target.value))}
                  className="w-16 h-1 bg-emerald-200 rounded-lg accent-emerald-600"
                />
                <span className="text-[10px] font-black text-emerald-700">{tempGoal}h</span>
                <button onClick={handleUpdateGoal} className="text-emerald-700 hover:text-emerald-900"><i className="fas fa-check"></i></button>
                <button onClick={() => setIsEditingGoal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{syllabus.title}</h1>
          <p className="text-slate-500 mt-1">{syllabus.description}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-slate-100 stroke-current"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-600 stroke-current"
                strokeWidth="3"
                strokeDasharray={`${progressPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">{progressPercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Overall Progress</p>
            <p className="text-lg font-bold text-slate-700">{completed} / {allTopics.length} Topics</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="fa-clock" label="Est. Learning Time" value={`${totalHours}h`} color="blue" />
        <StatCard icon="fa-hourglass-half" label="Hours Remaining" value={`${remainingHours}h`} color="orange" />
        <StatCard icon="fa-layer-group" label="Course Modules" value={syllabus.modules.length.toString()} color="purple" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveView('curriculum')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'curriculum' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Curriculum
            </button>
            <button
              onClick={() => setActiveView('timetable')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'timetable' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Study Plan
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeView === 'curriculum' && (
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Search topics..."
                  className="pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none w-full md:w-64 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {activeView === 'timetable' && syllabus.timetable && (
              <button
                onClick={handleExportPDF}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <i className="fas fa-file-pdf"></i>
                Export Plan
              </button>
            )}
            {!syllabus.timetable && activeView === 'timetable' && (
              <button
                onClick={() => handleGenerateTimetable()}
                disabled={isGeneratingTimetable}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isGeneratingTimetable ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                AI Frame Timetable
              </button>
            )}
            {syllabus.timetable && activeView === 'timetable' && (
              <button
                onClick={() => handleGenerateTimetable()}
                disabled={isGeneratingTimetable}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
              >
                {isGeneratingTimetable ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-redo"></i>}
                Regenerate
              </button>
            )}
          </div>
        </div>

        {activeView === 'curriculum' ? (
          <div className="grid gap-6 pb-12">
            {filteredModules.length > 0 ? (
              filteredModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onStatusChange={(topicId, status) => handleStatusChange(module.id, topicId, status)}
                />
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <i className="fas fa-search text-slate-200 text-5xl mb-4"></i>
                <p className="text-slate-500">No topics matched your search.</p>
              </div>
            )}
          </div>
        ) : (
          <TimetableContent
            timetable={syllabus.timetable}
            isGenerating={isGeneratingTimetable}
            onGenerate={handleGenerateTimetable}
            dailyHours={syllabus.dailyStudyHours}
          />
        )}
      </div>
    </div>
  );
};

const TimetableContent: React.FC<{ timetable?: Timetable; isGenerating: boolean; onGenerate: () => void; dailyHours?: number }> = ({ timetable, isGenerating, onGenerate, dailyHours }) => {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
          <i className="fas fa-calendar-alt text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-800">Framing Your Timetable...</h3>
        <p className="text-slate-500 mt-2 text-center max-sm px-6">AI is prioritizing high-importance topics to optimize your {dailyHours}h daily sessions.</p>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-6">
          <i className="fas fa-calendar-check text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-800 text-center">No Timetable Yet</h3>
        <p className="text-slate-500 mt-2 mb-8 text-center max-w-sm px-6">Generate a structured study schedule that focuses on what matters most for your exam.</p>
        <button
          onClick={() => onGenerate()}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          Create Study Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 md:p-8 rounded-3xl text-white shadow-lg shadow-indigo-100">
        <h4 className="text-xl font-black mb-2 flex items-center gap-2">
          <i className="fas fa-brain opacity-80"></i>
          AI Strategy
        </h4>
        <p className="opacity-90 leading-relaxed text-sm md:text-base font-medium">{timetable.summary}</p>
      </div>

      <div className="grid gap-10">
        {timetable.days.map((day) => (
          <div key={day.dayNumber} className="relative pl-12">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200"></div>
            <div className="absolute left-[-16px] top-0 w-8 h-8 rounded-full bg-white border-4 border-indigo-600 flex items-center justify-center text-[10px] font-black text-indigo-600 z-10 shadow-sm">
              {day.dayNumber}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h5 className="font-bold text-slate-800 mb-5 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="far fa-calendar-alt text-slate-300"></i>
                  Day {day.dayNumber}
                </span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {day.tasks.reduce((sum, t) => sum + t.duration, 0)} Hours Active
                </span>
              </h5>

              <div className="space-y-4">
                {day.tasks.map((task, tIdx) => {
                  const levelColors = {
                    High: 'border-red-100 bg-red-50/30',
                    Medium: 'border-amber-100 bg-amber-50/30',
                    Low: 'border-slate-100 bg-slate-50/30',
                  };
                  return (
                    <div key={tIdx} className={`p-4 rounded-2xl border transition-all ${levelColors[task.importance]}`}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">
                              {task.moduleTitle}
                            </span>
                            <span className="text-[9px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                              <i className="far fa-clock mr-1 opacity-60"></i>{task.duration}h
                            </span>
                            <ImportanceStars level={task.importance} />
                          </div>
                          <h6 className="font-bold text-slate-700 leading-tight">
                            {task.topicTitle}
                          </h6>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{task.goal}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
};

const ModuleCard: React.FC<{ module: Module; onStatusChange: (tid: string, s: TopicStatus) => void }> = ({ module, onStatusChange }) => {
  const completed = module.topics.filter(t => t.status === TopicStatus.COMPLETED).length;
  const percent = Math.round((completed / module.topics.length) * 100) || 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-lg">
      <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base font-black shadow-lg shadow-indigo-100">
            {module.topics.length}
          </div>
          <div>
            <h4 className="font-black text-slate-800">{module.title}</h4>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Section Breakdown</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-black text-slate-700">{percent}% Complete</span>
          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${percent}%` }}></div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {module.topics.map(topic => (
          <div key={topic.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group">
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-1.5">
                <h5 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{topic.title}</h5>
                <ImportanceStars level={topic.importance} />
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">{topic.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <i className="far fa-clock"></i>
                  {topic.estimatedHours}h Study
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusToggle currentStatus={topic.status} onSelect={(s) => onStatusChange(topic.id, s)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusToggle: React.FC<{ currentStatus: TopicStatus; onSelect: (s: TopicStatus) => void }> = ({ currentStatus, onSelect }) => {
  const options = [
    { value: TopicStatus.TODO, label: 'Wait', icon: 'fa-circle' },
    { value: TopicStatus.IN_PROGRESS, label: 'Active', icon: 'fa-spinner' },
    { value: TopicStatus.COMPLETED, label: 'Done', icon: 'fa-check-circle' },
  ];

  return (
    <div className="flex bg-slate-100/80 p-1 rounded-xl">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${currentStatus === opt.value
              ? (opt.value === TopicStatus.COMPLETED ? 'bg-green-600 text-white shadow-md' : opt.value === TopicStatus.IN_PROGRESS ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-700 shadow-sm')
              : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <i className={`fas ${opt.icon} ${currentStatus === opt.value ? '' : 'opacity-40'}`}></i>
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default Dashboard;
