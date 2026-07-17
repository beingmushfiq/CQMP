import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn, CalendarPlus } from 'lucide-react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface Props {
  onVisitorBooking?: () => void;
}

export const LoginForm: React.FC<Props> = ({ onVisitorBooking }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();

  useKeyboardShortcut({
    'v': () => {
      if (onVisitorBooking) onVisitorBooking();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
          <div className="text-center mb-8">
            {/* Brand logo */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/30">
                <img src="/favicon.svg" alt="CQMP Icon" className="w-full h-full" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CQMP Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">Clinic Queue Management Platform</p>
          </div>


          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="name@cqmp.local"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Visitor booking CTA */}
        {onVisitorBooking && (
          <button
            onClick={onVisitorBooking}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer"
          >
            <CalendarPlus className="w-5 h-5" />
            Book an Appointment (Visitor) [V]
          </button>
        )}
      </div>
    </div>
  );
};
