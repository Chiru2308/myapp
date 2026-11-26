
import React, { useState } from 'react';
import { User } from '../types';
import { ApiService } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = isSignUp
        ? await ApiService.registerUser(email, password)
        : await ApiService.loginUser(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-6 shadow-2xl shadow-indigo-200">
            <i className="fas fa-graduation-cap text-white text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">SmartSyllabus</h1>
          <p className="text-slate-500 mt-2 font-medium">Your personalized AI study companion</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 p-8 md:p-10 border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                <i className="fas fa-exclamation-circle text-sm"></i>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {isSignUp && <p className="text-[10px] text-slate-400 ml-1">Must be at least 6 characters.</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 mt-4 ${
                isSubmitting || !email || !password
                ? 'bg-slate-200 text-slate-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-indigo-200'
              }`}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-shield-alt"></i>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Your data is synced to the cloud. Sign in from any device to access your study plans.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          Built for students & aspirants worldwide
        </p>
      </div>
    </div>
  );
};

export default Login;
