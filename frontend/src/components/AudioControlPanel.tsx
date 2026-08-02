import React, { useState } from 'react';
import { Volume2, Send } from 'lucide-react';
import api from '../utils/api';


export const AudioControlPanel: React.FC = () => {
  const [customTextBn, setCustomTextBn] = useState('');
  const [customTextEn, setCustomTextEn] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleTestSpeaker = async () => {
    try {
      setLoading(true);
      await api.post('/announcements/test');
      setMsg('Speaker test signal sent.');
    } catch {
      setMsg('Failed to dispatch speaker test.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTextBn && !customTextEn) return;

    try {
      setLoading(true);
      await api.post('/announcements/custom', {
        text_bn: customTextBn || undefined,
        text_en: customTextEn || undefined,
      });
      setCustomTextBn('');
      setCustomTextEn('');
      setMsg('Custom announcement dispatched to all speakers.');
    } catch {
      setMsg('Failed to send announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-2xl space-y-4 shadow-premium">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          Audio Announcement Controls
        </h2>
        <button
          onClick={handleTestSpeaker}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" /> Test Speakers
        </button>
      </div>

      <form onSubmit={handleSendCustom} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={customTextBn}
            onChange={(e) => setCustomTextBn(e.target.value)}
            placeholder="বাংলা ঘোষণা (e.g. অনুগ্রহ করে অপেক্ষা করুন)"
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={customTextEn}
            onChange={(e) => setCustomTextEn(e.target.value)}
            placeholder="English Announcement (optional)"
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading || (!customTextBn && !customTextEn)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Broadcast Spoken Notice
          </button>
          {msg && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{msg}</span>}
        </div>
      </form>
    </div>
  );
};
