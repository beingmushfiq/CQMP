import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';
import type { QueueItem } from '../../store/useQueueStore';

interface NextQueueGridProps {
  items: QueueItem[];
}

export const NextQueueGrid: React.FC<NextQueueGridProps> = React.memo(({ items }) => {
  // Max 5 upcoming patients
  const upcoming = items.filter((i) => i.status === 'Waiting').slice(0, 5);

  // Calculate estimated wait time (assume ~10 mins per patient)
  const avgWaitPerPatient = 10;
  const totalWaitTime = upcoming.length * avgWaitPerPatient;

  return (
    <div className="w-full h-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-4 min-h-0 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center gap-3 text-indigo-400 font-bold uppercase tracking-widest text-lg">
          <Users className="w-6 h-6 text-indigo-400" />
          <span>Upcoming Queue ({upcoming.length})</span>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Max 5 Patients Shown
        </span>
      </div>

      {/* Cards Layout Grid: 5 Upcoming Cards + 1 Dedicated Waiting Time Card */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr overflow-hidden">
        {upcoming.length === 0 ? (
          <div className="col-span-2 h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Users className="w-12 h-12 opacity-40 text-indigo-400" />
            <span className="text-xl font-bold text-slate-400">No Waiting Patients</span>
            <p className="text-sm">The queue is currently empty</p>
          </div>
        ) : (
          <>
            {upcoming.map((item, index) => {
              const isFirst = index === 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border rounded-2xl p-4 md:p-5 flex items-center gap-4 transition-all shadow-lg ${
                    isFirst
                      ? 'bg-indigo-950/50 border-indigo-500/80 ring-2 ring-indigo-500/30'
                      : item.priority === 'Reserved'
                      ? 'bg-slate-800/80 border-indigo-500/40'
                      : 'bg-slate-800/60 border-slate-700/80'
                  }`}
                >
                  {/* Serial Number (clamp(40px, 4vw, 56px)) */}
                  <span
                    style={{ fontSize: 'clamp(40px, 4vw, 56px)' }}
                    className={`font-black leading-none shrink-0 tabular-nums ${
                      isFirst ? 'text-indigo-400' : 'text-slate-300'
                    }`}
                  >
                    #{item.serial_no}
                  </span>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg md:text-xl lg:text-2xl font-bold text-white truncate leading-tight">
                      {item.patient.name}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      {isFirst && (
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30 uppercase">
                          Next Up
                        </span>
                      )}
                      {item.priority === 'Reserved' && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-500/30 uppercase">
                          Reserved
                        </span>
                      )}
                      {item.priority === 'Emergency' && (
                        <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-500/30 uppercase">
                          Emergency
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Dedicated Waiting Time Card */}
            <div className="bg-gradient-to-br from-slate-800/90 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Est. Average Wait Time
                </div>
                <div
                  style={{ fontSize: 'clamp(28px, 2.5vw, 40px)' }}
                  className="font-black text-white leading-none tracking-tight mt-1"
                >
                  ~{totalWaitTime} <span className="text-indigo-400 text-lg font-bold">mins</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

NextQueueGrid.displayName = 'NextQueueGrid';
