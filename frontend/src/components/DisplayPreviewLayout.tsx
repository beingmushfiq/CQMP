import React from 'react';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { TvDisplay } from './TvDisplay';
import { type TabId } from './Layout';

interface DisplayPreviewLayoutProps {
  onTabChange: (tab: TabId) => void;
}

export const DisplayPreviewLayout: React.FC<DisplayPreviewLayoutProps> = ({ onTabChange }) => {
  const openFullscreen = () => {
    window.open('/display', '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Control / Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white dark:bg-surface-card border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">TV Display Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Fullscreen Display
          </button>
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Embedded TV Viewport */}
      <div className="flex-1 min-h-0 relative bg-slate-950">
        <TvDisplay embedded />
      </div>
    </div>
  );
};
