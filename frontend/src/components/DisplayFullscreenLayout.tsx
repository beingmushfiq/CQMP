import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize, Minimize, Volume2, VolumeX,
  Sun, Moon, User, LogOut,
} from 'lucide-react';
import { TvDisplay } from './TvDisplay';
import { UserProfile } from './UserProfile';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getStorageBaseUrl } from '../utils/api';

/**
 * DisplayFullscreenLayout
 *
 * Public-facing fullscreen display wrapper — rendered at /display and for TV-role users.
 * No sidebar, no header, no navigation chrome.
 *
 * A thin floating control bar appears on mouse movement and auto-hides after 5 s of idle.
 * Logout / Profile are only shown when an authenticated session exists.
 */
export const DisplayFullscreenLayout: React.FC = () => {
  const { token, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('cqmp_audio_enabled');
    return saved !== 'false';
  });

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fullscreen sync ──────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ── Idle auto-hide (5 s of no movement) ─────────────────────────────
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 5000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    window.addEventListener('touchstart', resetHideTimer);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      window.removeEventListener('mousemove', resetHideTimer);
      window.removeEventListener('touchstart', resetHideTimer);
    };
  }, [resetHideTimer]);

  // ── Audio toggle ─────────────────────────────────────────────────────
  const toggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    localStorage.setItem('cqmp_audio_enabled', String(next));
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-950">
      {/* ── Full-height Display — fills this w-screen h-screen shell ── */}
      <div className="w-full h-full">
        <TvDisplay />
      </div>

      {/* ── Floating Control Bar (auto-hides on idle) ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 right-3 z-50 flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5 bg-white/85 dark:bg-surface-card/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-2 shadow-lg">

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isFullscreen
                  ? <Minimize className="w-4 h-4" />
                  : <Maximize className="w-4 h-4" />}
              </button>

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

              {/* Audio toggle */}
              <button
                onClick={toggleAudio}
                title={isAudioEnabled ? 'Mute announcements' : 'Enable announcements'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isAudioEnabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    : 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                }`}
              >
                {isAudioEnabled
                  ? <Volume2 className="w-4 h-4" />
                  : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title="Toggle theme"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {theme === 'dark'
                  ? <Sun className="w-4 h-4" />
                  : <Moon className="w-4 h-4" />}
              </button>

              {/* Auth-only controls — hidden for unauthenticated public viewers */}
              {token && (
                <>
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

                  {/* Profile */}
                  <button
                    onClick={() => setProfileOpen(true)}
                    title="Profile"
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {user?.avatar
                      ? <img
                          src={`${getStorageBaseUrl()}/storage/${user.avatar}`}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      : <User className="w-4 h-4" />}
                  </button>

                  {/* Logout — calls hardened logout: JWT + Socket.IO + redirect */}
                  <button
                    onClick={logout}
                    title="Logout"
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile modal */}
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};
