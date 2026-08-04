import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { QueueItem } from '../../store/useQueueStore';

interface NextQueueGridProps {
  items: QueueItem[];
}

export const NextQueueGrid: React.FC<NextQueueGridProps> = React.memo(({ items }) => {
  // Max 5 upcoming patients
  const upcoming = items.filter((i) => i.status === 'Waiting').slice(0, 5);

  return (
    <div
      className="w-full h-full bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      style={{ padding: '2cqh 2cqw', gap: '1.5cqh' }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 shrink-0" style={{ paddingBottom: '1.2cqh' }}>
        <div
          className="flex items-center gap-[1cqw] text-indigo-400 font-bold uppercase tracking-widest"
          style={{ fontSize: 'clamp(10px, 1.2cqw, 18px)' }}
        >
          <Users className="text-indigo-400" style={{ width: '1.6cqw', height: '1.6cqw' }} />
          <span>Upcoming Queue ({upcoming.length})</span>
        </div>
        <span
          className="font-bold text-slate-400 uppercase tracking-widest"
          style={{ fontSize: 'clamp(7px, 0.75cqw, 11px)' }}
        >
          Max 5 Patients Shown
        </span>
      </div>

      {upcoming.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500" style={{ gap: '1cqh' }}>
          <Users className="opacity-40 text-indigo-400" style={{ width: '5cqw', height: '5cqw' }} />
          <span className="font-bold text-slate-400" style={{ fontSize: 'clamp(10px, 1.5cqw, 22px)' }}>No Waiting Patients</span>
          <p style={{ fontSize: 'clamp(8px, 0.9cqw, 13px)' }}>The queue is currently empty</p>
        </div>
      ) : (
        /* Patient Cards Grid — 2-col, max 5 cards, fills remaining height */
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-[1.2cqh] auto-rows-fr overflow-hidden">
          {upcoming.map((item, index) => {
            const isFirst = index === 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-2xl flex items-center transition-all shadow-lg overflow-hidden ${
                  isFirst
                    ? 'bg-indigo-950/50 border-indigo-500/80 ring-2 ring-indigo-500/30'
                    : item.priority === 'Reserved'
                    ? 'bg-slate-800/80 border-indigo-500/40'
                    : 'bg-slate-800/60 border-slate-700/80'
                }`}
                style={{ padding: '1cqh 1.5cqw', gap: '1.5cqw' }}
              >
                {/* Serial Number */}
                <span
                  className={`font-black leading-none shrink-0 tabular-nums ${
                    isFirst ? 'text-indigo-400' : 'text-slate-300'
                  }`}
                  style={{ fontSize: 'clamp(24px, 4cqw, 56px)' }}
                >
                  #{item.serial_no}
                </span>

                {/* Details */}
                <div className="flex-1 min-w-0" style={{ gap: '0.4cqh' }}>
                  <div
                    className="font-bold text-white truncate leading-tight"
                    style={{ fontSize: 'clamp(10px, 1.5cqw, 22px)' }}
                  >
                    {item.patient.name}
                  </div>

                  <div className="flex items-center flex-wrap" style={{ gap: '0.4cqw', marginTop: '0.4cqh' }}>
                    {isFirst && (
                      <span
                        className="bg-indigo-500/20 text-indigo-300 font-bold rounded-full border border-indigo-500/30 uppercase"
                        style={{ fontSize: 'clamp(7px, 0.7cqw, 11px)', padding: '0.2cqh 0.7cqw' }}
                      >
                        Next Up
                      </span>
                    )}
                    {item.priority === 'Reserved' && (
                      <span
                        className="bg-purple-500/20 text-purple-300 font-bold rounded-full border border-purple-500/30 uppercase"
                        style={{ fontSize: 'clamp(7px, 0.7cqw, 11px)', padding: '0.2cqh 0.7cqw' }}
                      >
                        Reserved
                      </span>
                    )}
                    {item.priority === 'Emergency' && (
                      <span
                        className="bg-rose-500/20 text-rose-300 font-bold rounded-full border border-rose-500/30 uppercase"
                        style={{ fontSize: 'clamp(7px, 0.7cqw, 11px)', padding: '0.2cqh 0.7cqw' }}
                      >
                        Emergency
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
});

NextQueueGrid.displayName = 'NextQueueGrid';
