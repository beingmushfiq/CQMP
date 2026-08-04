import React from 'react';

interface HeaderBarProps {
  clock: string;
  title?: string;
  subtitle?: string;
  isPublicView?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = React.memo(({ clock, title = 'CQMP Live Board', subtitle = 'Doctor Waiting Room' }) => {
  return (
    <header className="w-full flex items-center justify-between border-b border-slate-800/80 shrink-0" style={{ paddingBottom: '1.5cqh', marginBottom: '1.5cqh' }}>
      {/* Left: accent bar + doctor name */}
      <div className="flex items-center gap-[1.5cqw] min-w-0">
        <div className="bg-indigo-500 rounded-full shrink-0" style={{ width: '0.4cqw', height: '4cqh' }} />
        <div className="min-w-0">
          <h1
            className="font-black tracking-tight text-white truncate leading-none"
            style={{ fontSize: 'clamp(14px, 2.2cqw, 30px)' }}
          >
            {title}
          </h1>
          <p
            className="text-slate-400 font-bold uppercase tracking-widest mt-[0.3cqh]"
            style={{ fontSize: 'clamp(9px, 0.85cqw, 13px)' }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Live Clock */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg shrink-0" style={{ padding: '0.6cqh 1.5cqw' }}>
        <span
          className="font-black font-mono text-white tracking-tight tabular-nums leading-none"
          style={{ fontSize: 'clamp(16px, 3.2cqw, 44px)' }}
        >
          {clock}
        </span>
      </div>
    </header>
  );
});

HeaderBar.displayName = 'HeaderBar';
