
import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'upload' | 'history';
  onTabChange: (tab: 'dashboard' | 'upload' | 'history') => void;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, user, onLogout }) => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Sidebar for Desktop */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <i className="fas fa-graduation-cap text-white text-xl"></i>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">SmartSyllabus V9</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem
            icon="fas fa-chart-pie"
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')}
          />
          <NavItem
            icon="fas fa-cloud-upload-alt"
            label="Analyze New"
            active={activeTab === 'upload'}
            onClick={() => onTabChange('upload')}
          />
          <NavItem
            icon="fas fa-history"
            label="Study History"
            active={activeTab === 'history'}
            onClick={() => onTabChange('history')}
          />
        </nav>

        <div className="pt-6 mt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Active Account</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="md:hidden flex justify-around bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 z-50 p-3 shadow-2xl">
        <button onClick={() => onTabChange('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-chart-pie text-lg"></i>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => onTabChange('upload')} className={`flex flex-col items-center gap-1 ${activeTab === 'upload' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-cloud-upload-alt text-lg"></i>
          <span className="text-[10px] font-bold">Upload</span>
        </button>
        <button onClick={() => onTabChange('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-history text-lg"></i>
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button onClick={onLogout} className="flex flex-col items-center gap-1 text-slate-300">
          <i className="fas fa-sign-out-alt text-lg"></i>
          <span className="text-[10px] font-bold">Exit</span>
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {/* Mobile Header User Info */}
        <div className="md:hidden flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-graduation-cap text-white text-sm"></i>
            </div>
            <span className="font-black text-slate-800 tracking-tight">SmartSyllabus V9</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-200">
            {user.email[0].toUpperCase()}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
  >
    <i className={`${icon} ${active ? 'text-white' : 'text-slate-400'}`}></i>
    <span>{label}</span>
  </button>
);

export default Layout;
