
import React, { useState, useEffect } from 'react';
import { Syllabus, User } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadSyllabus from './components/UploadSyllabus';
import StudyHistory from './components/StudyHistory';
import Login from './components/Login';
import ChatBot from './components/ChatBot';
import { ApiService } from './services/api';

const App: React.FC = () => {
  console.log("App component rendering start");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'history'>('upload');
  const [currentSyllabus, setCurrentSyllabus] = useState<Syllabus | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and last session on mount
  useEffect(() => {
    const user = ApiService.getCurrentUser();
    if (user && ApiService.isAuthenticated()) {
      setCurrentUser(user);
      ApiService.getHistory(user.email).then((history) => {
        if (history.length > 0) {
          setCurrentSyllabus(history[0]);
          setActiveTab('dashboard');
        }
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    ApiService.getHistory(user.email).then((history) => {
      if (history.length > 0) {
        setCurrentSyllabus(history[0]);
        setActiveTab('dashboard');
      } else {
        setActiveTab('upload');
      }
    });
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    setCurrentSyllabus(null);
    setActiveTab('upload');
  };

  const handleSyllabusReady = async (syllabus: any) => {
    if (!currentUser) return;

    const fullSyllabus: Syllabus = {
      ...syllabus,
      userEmail: currentUser.email
    };

    try {
      const saved = await ApiService.saveSyllabus(fullSyllabus);
      setCurrentSyllabus(saved);
      setActiveTab('dashboard');
      setRefreshHistory(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to save syllabus. Please try again.');
    }
  };

  const handleSelectHistory = (syllabus: Syllabus) => {
    setCurrentSyllabus(syllabus);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return isLoading ? (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    ) : (
      <Login onLogin={handleLogin} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return currentSyllabus ? (
          <Dashboard
            syllabus={currentSyllabus}
            onUpdate={(updated) => {
              setCurrentSyllabus(updated);
              setRefreshHistory(prev => prev + 1);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-book-open text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">No active course selected</h2>
            <p className="text-slate-500 mt-2 mb-8">Let's analyze your first syllabus to get started.</p>
            <button
              onClick={() => setActiveTab('upload')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Analyze New Syllabus
            </button>
          </div>
        );
      case 'upload':
        return <UploadSyllabus onSyllabusReady={handleSyllabusReady} />;
      case 'history':
        return (
          <StudyHistory
            key={refreshHistory}
            userEmail={currentUser.email}
            onSelect={handleSelectHistory}
            onRefresh={() => setRefreshHistory(prev => prev + 1)}
            onSyllabusDeleted={(id) => {
              if (currentSyllabus?.id === id) setCurrentSyllabus(null);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
      <ChatBot currentSyllabus={currentSyllabus} />
    </Layout>
  );
};

export default App;
