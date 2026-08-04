import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocketStatus } from '../../hooks/useSocketStatus';

interface HeaderBarProps {
  clock: string;
  title?: string;
  subtitle?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = React.memo(({ clock, title = 'CQMP Live Board', subtitle = 'Doctor Waiting Room' }) => {
  const socketStatus = useSocketStatus();

  return (
    <header className="w-full flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-3.5 h-10 bg-indigo-500 rounded-full shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white truncate">
            {title}
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {/* Connection Status Indicator (Green Connected, Orange Reconnecting, Red Offline) */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-sm">
          {socketStatus === 'connected' && (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Connected</span>
            </>
          )}

          {socketStatus === 'reconnecting' && (
            <>
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Reconnecting</span>
            </>
          )}

          {socketStatus === 'offline' && (
            <>
              <WifiOff className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Offline</span>
            </>
          )}
        </div>

        {/* Live Clock — 32–40px typography */}
        <div className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-xl shadow-lg">
          <span
            style={{ fontSize: 'clamp(32px, 3vw, 40px)' }}
            className="font-black font-mono text-white tracking-tight tabular-nums leading-none"
          >
            {clock}
          </span>
        </div>
      </div>
    </header>
  );
});

HeaderBar.displayName = 'HeaderBar';
