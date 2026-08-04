import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, FileText, ShieldAlert, WifiOff, Loader2 } from 'lucide-react';
import { useDisplayModeContext } from '../DisplayModeContext';
import { useLanguageStore } from '../../store/useLanguageStore';

export const ModeOverlays: React.FC = React.memo(() => {
  const displayState = useDisplayModeContext();
  const { t } = useLanguageStore();

  const mode = displayState.mode;

  const isBreak = mode === 'BREAK' || mode === 'LUNCH' || mode === 'PRAYER';
  const isReport = mode === 'REPORT';
  const isEmergency = mode === 'EMERGENCY';
  const isOffline = mode === 'OFFLINE' || mode === 'MAINTENANCE';

  if (mode === 'NORMAL') {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {/* ── BREAK MODE ── */}
      {isBreak && (
        <motion.div
          key="break-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-slate-950/90 p-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8 max-w-3xl flex flex-col items-center"
          >
            <div className="w-40 h-40 rounded-full bg-amber-500/10 border-4 border-amber-500/40 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.25)]">
              <Coffee className="w-20 h-20 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-amber-400 tracking-tight leading-none">
                {displayState.title_bn || 'বিরতি চলছে'}
              </h1>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-200">
                {displayState.title_en || 'Doctor is on Break'}
              </h2>
              {displayState.resume_time && (
                <p className="text-xl md:text-2xl text-amber-300 font-semibold pt-2">
                  Expected Resume: {displayState.resume_time}
                </p>
              )}
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-widest text-lg">
              <span>{t('tv.queue.paused') || 'Queue Paused'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── REPORT MODE ── */}
      {isReport && (
        <motion.div
          key="report-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-slate-950/90 p-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8 max-w-3xl flex flex-col items-center"
          >
            <div className="w-40 h-40 rounded-full bg-indigo-500/10 border-4 border-indigo-500/40 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.25)]">
              <FileText className="w-20 h-20 text-indigo-400" />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-indigo-400 tracking-tight leading-none">
                {displayState.title_bn || 'রিপোর্ট দেখা হচ্ছে'}
              </h1>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-200">
                {displayState.title_en || 'Doctor is Reviewing Reports'}
              </h2>
              <p className="text-2xl text-slate-400 font-semibold pt-2">
                {displayState.message_en || 'Please Wait...'}
              </p>
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold uppercase tracking-widest text-lg">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Please Wait</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── EMERGENCY MODE ── */}
      {isEmergency && (
        <motion.div
          key="emergency-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-rose-950/95 border-8 border-rose-600 p-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8 max-w-3xl flex flex-col items-center"
          >
            <div className="w-40 h-40 rounded-full bg-rose-600/20 border-4 border-rose-500 flex items-center justify-center shadow-[0_0_80px_rgba(225,29,72,0.4)]">
              <ShieldAlert className="w-24 h-24 text-rose-500 animate-pulse" />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-rose-400 tracking-tight leading-none">
                {displayState.title_bn || 'জরুরি বিজ্ঞপ্তি'}
              </h1>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                {displayState.title_en || 'Emergency Notice'}
              </h2>
              {displayState.message_en && (
                <p className="text-2xl text-rose-200 font-semibold pt-2">
                  {displayState.message_en}
                </p>
              )}
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-rose-600/30 border border-rose-500 text-rose-200 font-black uppercase tracking-widest text-lg">
              <span>Emergency Case in Progress</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── OFFLINE MODE ── */}
      {isOffline && (
        <motion.div
          key="offline-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-slate-950/90 p-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8 max-w-3xl flex flex-col items-center"
          >
            <div className="w-40 h-40 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
              <WifiOff className="w-20 h-20 text-slate-500" />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-400 tracking-tight leading-none">
                {displayState.title_bn || 'সেবা বন্ধ'}
              </h1>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-300">
                {displayState.title_en || 'Service Unavailable'}
              </h2>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ModeOverlays.displayName = 'ModeOverlays';
