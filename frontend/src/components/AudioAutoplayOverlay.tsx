import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles } from 'lucide-react';

export const AudioAutoplayOverlay: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked) return null;

  const handleUnlock = () => {
    // Speak a silent micro-utterance to unlock browser AudioContext / SpeechSynthesis
    if ('speechSynthesis' in window) {
      const silent = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(silent);
    }
    setUnlocked(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(99,102,241,0.2)]">
            <Volume2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Enable Live Audio Announcements</h3>
            <p className="text-xs text-slate-400">
              Browser security requires a single click to enable voice announcements for patients in the waiting room.
            </p>
          </div>

          <button
            onClick={handleUnlock}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" /> Enable TV Audio Speaker
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
