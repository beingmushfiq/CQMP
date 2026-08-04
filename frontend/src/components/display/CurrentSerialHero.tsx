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
    <div
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      style={{ padding: '1.5cqh 2cqw', gap: '1.5cqh', flex: '0 0 auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80" style={{ paddingBottom: '1cqh' }}>
        <div
          className="flex items-center gap-[1cqw] text-indigo-400 font-bold uppercase tracking-widest"
          style={{ fontSize: 'clamp(9px, 1cqw, 14px)' }}
        >
          <UserCheck className="animate-pulse text-indigo-400" style={{ width: '1.4cqw', height: '1.4cqw' }} />
          <span>Now Calling</span>
        </div>
        <span
          className="font-semibold px-[1cqw] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider"
          style={{ fontSize: 'clamp(8px, 0.85cqw, 12px)', padding: '0.4cqh 1cqw' }}
        >
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
            className="flex flex-col items-center justify-center text-center"
            style={{ gap: '0.8cqh', padding: '1cqh 0' }}
          >
            {/* Current Serial Number */}
            <div
              className="font-black leading-none tracking-tighter text-indigo-400 drop-shadow-[0_0_25px_rgba(99,102,241,0.3)] tabular-nums"
              style={{ fontSize: 'clamp(48px, 9cqw, 120px)' }}
            >
              #{activeItem.serial_no}
            </div>

            {/* Patient Name */}
            <div
              className="font-bold text-white truncate max-w-full px-2"
              style={{ fontSize: 'clamp(14px, 2.5cqw, 36px)' }}
            >
              {activeItem.patient.name}
            </div>

            {/* Repeat Audio Button */}
            {onRepeatAudio && (
              <button
                onClick={() => onRepeatAudio(activeItem.serial_no)}
                className="inline-flex items-center gap-[0.6cqw] bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95"
                style={{ padding: '0.7cqh 1.8cqw', fontSize: 'clamp(8px, 0.9cqw, 13px)', marginTop: '0.5cqh' }}
              >
                <Volume2 className="text-indigo-400" style={{ width: '1.2cqw', height: '1.2cqw' }} />
                <span>Repeat Call Audio</span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center text-slate-500"
            style={{ padding: '2cqh 0', gap: '0.5cqh' }}
          >
            <div
              className="font-bold text-slate-400"
              style={{ fontSize: 'clamp(11px, 1.4cqw, 20px)' }}
            >
              Waiting for Next Patient...
            </div>
            <p style={{ fontSize: 'clamp(8px, 0.9cqw, 13px)' }}>Please stand by in the waiting area</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CurrentSerialHero.displayName = 'CurrentSerialHero';
