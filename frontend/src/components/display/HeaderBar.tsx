import React from 'react';

interface HeaderBarProps {
  clock: string;
  title?: string;
  subtitle?: string;
  isPublicView?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = React.memo(({ clock, title = 'CQMP Live Board', subtitle = 'Doctor Waiting Room' }) => {

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
