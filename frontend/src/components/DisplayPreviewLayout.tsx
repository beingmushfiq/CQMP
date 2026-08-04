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

      {/* Scaled TV Viewport — renders at 1280×720, scaled to fit */}
      <div className="flex-1 min-h-0 relative bg-slate-950 flex items-center justify-center overflow-hidden p-4">
        <TvScaledViewport />
      </div>
    </div>
  );
};

/**
 * Renders TvDisplay at its native 1280×720 TV resolution
 * and scales it down to fit the available preview space using CSS transform.
 * This ensures every pixel, font-size, and layout looks exactly as it
 * would on a real 32" Google TV.
 */
const TV_WIDTH = 1280;
const TV_HEIGHT = 720;

const TvScaledViewport: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scaleX = width / TV_WIDTH;
      const scaleY = height / TV_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    /* Outer container fills the preview area */
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      {/* Fixed 16:9 aspect shell that the scale is applied to */}
      <div
        style={{
          width: TV_WIDTH,
          height: TV_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          // Keep the element in flow at the scaled-down size so the container doesn't overflow
          flexShrink: 0,
        }}
        className="rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] ring-1 ring-slate-700/60"
      >
        <TvDisplay embedded />
      </div>
    </div>
  );
};
