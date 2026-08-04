import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, UserCheck } from 'lucide-react';
import type { QueueItem } from '../../store/useQueueStore';

interface CurrentSerialHeroProps {
  activeItem?: QueueItem | null;
  onRepeatAudio?: (serialNo: number) => void;
}

export const CurrentSerialHero: React.FC<CurrentSerialHeroProps> = React.memo(({ activeItem, onRepeatAudio }) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-sm">
          <UserCheck className="w-5 h-5 animate-pulse text-indigo-400" />
          <span>Now Calling</span>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
          In Consultation Room
        </span>
      </div>

      {/* Main Serial Display */}
      <AnimatePresence mode="wait">
        {activeItem ? (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center text-center space-y-3 py-2"
          >
            {/* Current Serial Number: clamp(90px, 8vw, 120px) */}
            <div
              style={{ fontSize: 'clamp(90px, 8vw, 120px)' }}
              className="font-black leading-none tracking-tighter text-indigo-400 drop-shadow-[0_0_25px_rgba(99,102,241,0.3)] tabular-nums"
            >
              #{activeItem.serial_no}
            </div>

            {/* Patient Name */}
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-white truncate max-w-full px-2">
              {activeItem.patient.name}
            </div>

            {/* Repeat Audio Announcement Button */}
            {onRepeatAudio && (
              <button
                onClick={() => onRepeatAudio(activeItem.serial_no)}
                className="mt-2 inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold py-2.5 px-6 rounded-2xl text-sm transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Volume2 className="w-5 h-5 text-indigo-400" />
                <span>Repeat Call Audio</span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center text-slate-500 space-y-2"
          >
            <div className="text-xl font-bold text-slate-400">Waiting for Next Patient...</div>
            <p className="text-sm">Please stand by in the waiting area</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CurrentSerialHero.displayName = 'CurrentSerialHero';
