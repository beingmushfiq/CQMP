import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioAnnouncementEngine';
import type { AnnouncementItem } from '../audio/types';


export const AudioTickerBanner: React.FC = () => {
  const [activeItem, setActiveItem] = useState<AnnouncementItem | null>(null);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((item) => {
      setActiveItem(item);
    });
    return unsubscribe;
  }, []);

  if (!activeItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[90%] bg-slate-900/90 dark:bg-black/90 border border-amber-500/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-white flex items-center gap-4"
      >
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 animate-pulse">
          <Volume2 className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Audio Announcement ({activeItem.type.replace('_', ' ')})
          </p>
          {activeItem.textBn && (
            <p className="text-base sm:text-lg font-bold text-white leading-tight truncate">
              {activeItem.textBn}
            </p>
          )}
          {activeItem.textEn && (
            <p className="text-xs sm:text-sm text-slate-300 font-medium truncate">
              {activeItem.textEn}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
