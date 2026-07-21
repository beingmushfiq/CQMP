import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore, type QueueItem } from '../store/useQueueStore';
import { echo } from '../utils/echo';
import api from '../utils/api';
import { Monitor, Volume2, UserCheck, Play, Pause, Sun, Moon, Bookmark, Coffee, LogOut, Maximize, Minimize, User } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { UserProfile } from './UserProfile';

const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

interface TvDisplayProps {
  embedded?: boolean;
}

export const TvDisplay: React.FC<TvDisplayProps> = ({ embedded = false }) => {
  const { queueDay, items, fetchTodayQueue } = useQueueStore();
  const { theme, toggleTheme } = useThemeStore();
  const { logout, user } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'lobby'>('single');
  const [lobbyQueues, setLobbyQueues] = useState<Record<number, { called: QueueItem | null; waiting: QueueItem[] }>>({});
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    api.get('/me').then(() => {
      const docList = [{ id: 1, name: getSetting('doctor_name', 'Dr. Sarah Rahman'), specialization: getSetting('doctor_specialization', 'Cardiologist') }];
      setDoctors(docList);
    });
  }, []);

  useEffect(() => {
    if (viewMode !== 'lobby') return;

    const fetchAllQueues = async () => {
      const queues: typeof lobbyQueues = {};
      for (const doc of doctors) {
        try {
          const res = await api.get(`/queue/today?doctor_id=${doc.id}`);
          const qItems = res.data.items.data || [];
          queues[doc.id] = {
            called: qItems.find((i: any) => i.status === 'Called') || null,
            waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3),
          };

          const qDayId = res.data.queue_day?.id;
          if (qDayId) {
            echo.channel(`queue.${qDayId}`)
              .listen('QueueUpdated', (e: { queue_item: QueueItem }) => {
                if (e.queue_item.status === 'Called') speakAnnouncement(e.queue_item.serial_no);
                refreshLobbyData();
              })
              .listen('QueueCreated', () => refreshLobbyData())
              .listen('QueueCompleted', () => refreshLobbyData());
          }
        } catch { /* ignore */ }
      }
      setLobbyQueues(queues);
    };

    if (doctors.length > 0) fetchAllQueues();
    return () => { doctors.forEach((doc) => echo.leave(`queue.${doc.id}`)); };
  }, [viewMode, doctors]);

  const refreshLobbyData = async () => {
    const queues: typeof lobbyQueues = {};
    for (const doc of doctors) {
      const res = await api.get(`/queue/today?doctor_id=${doc.id}`);
      const qItems = res.data.items.data || [];
      queues[doc.id] = {
        called: qItems.find((i: any) => i.status === 'Called') || null,
        waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3),
      };
    }
    setLobbyQueues(queues);
  };

  useEffect(() => {
    if (!selectedDoctorId || viewMode !== 'single') return;
    fetchTodayQueue(selectedDoctorId);

    const channel = echo.channel(`queue.${queueDay?.id || selectedDoctorId}`);
    channel.listen('QueueUpdated', (e: { queue_item: QueueItem }) => {
      if (e.queue_item.status === 'Called') speakAnnouncement(e.queue_item.serial_no);
    });
    return () => { echo.leave(`queue.${queueDay?.id || selectedDoctorId}`); };
  }, [selectedDoctorId, queueDay?.id, viewMode]);

  const speakAnnouncement = (serialNo: number) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const makeUtterance = (text: string, lang: string, rate: number) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      u.pitch = 0.85;
      u.volume = 1.0;
      return u;
    };

    const announce = () => {
      window.speechSynthesis.speak(makeUtterance(`সিরিয়াল নম্বর ${serialNo}, অনুগ্রহ করে চিকিৎসকের কক্ষে প্রবেশ করুন।`, 'bn-BD', 0.8));
      setTimeout(() => {
        window.speechSynthesis.speak(makeUtterance(`Serial number ${serialNo}, please enter the doctor's room.`, 'en-US', 0.85));
      }, 3500);
    };

    announce();
    setTimeout(announce, 8500);
    setTimeout(announce, 17000);
  };

  const handleSelectDoctor = (id: number) => { setViewMode('single'); setSelectedDoctorId(id); };

  const activeItem = items.find((i) => i.status === 'Called');
  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no).slice(0, 5);

  // ── Theme toggle button (shared) ──
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );

  // ── Mobile Bottom Navbar (shared) ──
  const MobileBottomNav = ({ onDoctors }: { onDoctors?: () => void }) => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-surface-card/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-700/80 px-2 py-2">
      <div className="flex items-center justify-around">
        {onDoctors && (
          <button onClick={onDoctors} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 cursor-pointer">
            <Monitor className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{t('tv.doctors')}</span>
          </button>
        )}
        <button onClick={() => setProfileOpen(true)} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
          {user?.avatar ? (
            <img src={`http://localhost:8000/storage/${user.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] font-semibold">{t('tv.profile')}</span>
        </button>
        <button onClick={toggleTheme} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 cursor-pointer">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="text-[10px] font-semibold">{theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}</span>
        </button>
        <button onClick={logout} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('tv.log.out')}</span>
        </button>
      </div>
    </nav>
  );

  // ── Doctor Selection ──
  if (!selectedDoctorId && viewMode === 'single') {
    return (
      <div className="h-full bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white flex items-center justify-center p-4 md:p-6 transition-colors duration-300 pb-24 md:pb-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 md:p-8 rounded-xl shadow-premium-lg text-center"
        >
          <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
            <Monitor className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 dark:text-indigo-400" /> {t('tv.select')}
          </h2>
          <div className="space-y-2 md:space-y-3">
            {doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-700 p-3 md:p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs md:text-sm truncate">{doc.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs">{doc.specialization}</p>
                </div>
                <Play className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
          <div className="mt-4 md:mt-6 flex justify-between items-center">
            <button onClick={logout} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white text-xs font-medium cursor-pointer flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> {t('tv.log.out')}
            </button>
            <ThemeToggle />
          </div>
        </motion.div>
        {!embedded && <MobileBottomNav />}
        <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  // ── Lobby View ──
  if (viewMode === 'lobby') {
    return (
      <div className="h-full bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white flex flex-col justify-between p-4 md:p-6 lg:p-8 transition-colors duration-300 relative pb-24 md:pb-6 overflow-hidden">
        {/* On Break Overlay for lobby */}
        <AnimatePresence>
          {queueDay?.status === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-xl bg-white/60 dark:bg-surface-dark/80"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-center space-y-4 md:space-y-6 px-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-28 md:h-28 rounded-full bg-amber-500/15 border-2 border-amber-400/40 dark:border-amber-500/40 animate-pulse">
                  <Coffee className="w-8 h-8 md:w-14 md:h-14 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-8xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{t('tv.on.break')}</h1>
                  <p className="text-base md:text-2xl font-bold text-slate-500 dark:text-slate-400 mt-2 md:mt-3">{t('tv.on.break.subtitle')}</p>
                  <p className="text-sm md:text-lg text-slate-400 dark:text-slate-500 mt-1">{t('tv.on.break.wait')}</p>
                </div>
                <div className="flex items-center justify-center gap-2 md:gap-3 text-slate-400 dark:text-slate-500">
                  <Pause className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-semibold uppercase tracking-wider">{t('tv.queue.paused')}</span>
                  <Pause className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/80 dark:border-slate-700/80 pb-4 md:pb-6 gap-3 md:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400">{t('tv.master.lobby')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs mt-1">{t('tv.lobby.desc')}</p>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            <button onClick={toggleFullscreen} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 md:px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer transition-all flex items-center gap-1.5" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
            <button onClick={logout} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 md:px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer transition-all flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> {t('tv.log.out')}
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 my-4 md:my-8 flex-1">
          {doctors.map((doc) => {
            const data = lobbyQueues[doc.id] || { called: null, waiting: [] };
            return (
              <motion.div key={doc.id} {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 md:p-5 flex flex-col justify-between shadow-premium">
                <div>
                  <h2 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">{doc.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold uppercase tracking-wider mb-2 md:mb-4">{doc.specialization}</p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 text-center mb-3 md:mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('tv.calling.now')}</p>
                    {data.called ? (
                      <div className="mt-2">
                        <div className="text-2xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400">#{data.called.serial_no}</div>
                        <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-white mt-1">{data.called.patient.name}</div>
                      </div>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 text-xs py-2 md:py-3">{t('tv.no.active.call')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 md:mb-2">{t('tv.up.next.label')}</h3>
                  <div className="space-y-1 md:space-y-1.5">
                    {data.waiting.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-[10px]">{t('tv.queue.empty')}</p>
                    ) : (
                      data.waiting.map((w) => (
                        <div key={w.id} className="bg-slate-50 dark:bg-slate-800/30 p-1.5 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 flex justify-between text-[10px] md:text-xs">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">#{w.serial_no}</span>
                          <span className="text-slate-800 dark:text-white font-medium truncate mx-2">{w.patient.name}</span>
                          <span className="text-slate-400 dark:text-slate-500 shrink-0">~{w.estimated_wait}m</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-2 md:p-3 rounded-xl flex items-center overflow-hidden">
          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider px-1.5 md:px-2 py-0.5 rounded-md mr-2 md:mr-3 shrink-0">{t('footer.notice')}</span>
          <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap animate-pulse">
            Bilingual audio announcements are synthesized dynamically. Please wait.
          </div>
        </div>

        {!embedded && <MobileBottomNav onDoctors={() => { setViewMode('single'); setSelectedDoctorId(null); }} />}
        <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  // ── Single Doctor TV Display (Pixel TV optimized) ──
  return (
    <div className="h-full bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Ambient blurs */}
      <div className="absolute top-1/4 left-1/4 w-[200px] h-[200px] md:w-[500px] md:h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] md:w-[500px] md:h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── On Break Overlay ── */}
      <AnimatePresence>
        {queueDay?.status === 'paused' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-xl bg-white/60 dark:bg-surface-dark/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-center space-y-4 md:space-y-6 px-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-28 md:h-28 rounded-full bg-amber-500/15 border-2 border-amber-400/40 dark:border-amber-500/40 animate-pulse">
                <Coffee className="w-8 h-8 md:w-14 md:h-14 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-8xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{t('tv.on.break')}</h1>
                <p className="text-base md:text-2xl font-bold text-slate-500 dark:text-slate-400 mt-2 md:mt-3">{t('tv.on.break.subtitle')}</p>
                <p className="text-sm md:text-lg text-slate-400 dark:text-slate-500 mt-1">{t('tv.on.break.wait')}</p>
              </div>
              <div className="flex items-center justify-center gap-2 md:gap-3 text-slate-400 dark:text-slate-500">
                <Pause className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wider">{t('tv.queue.paused')}</span>
                <Pause className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/80 dark:border-slate-700/80 px-4 md:px-6 lg:px-10 py-3 md:py-4 shrink-0 relative z-10 gap-2 md:gap-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent truncate">
            {doctors.find((d) => d.id === selectedDoctorId)?.name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wider mt-0.5 md:mt-1">{t('tv.live.board')}</p>
        </div>
        <div className="flex gap-2 md:gap-4 items-center">
          {/* Live Clock */}
          <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 px-3 md:px-6 py-1.5 md:py-3 rounded-xl shadow-premium">
            <span className="text-xl md:text-3xl lg:text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight tabular-nums">{clock}</span>
          </div>
          {!embedded && (
            <>
              <button onClick={toggleFullscreen} className="hidden sm:flex bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700/80 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer transition-all items-center gap-2" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button onClick={logout} className="hidden sm:flex bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700/80 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer transition-all items-center gap-2">
                <LogOut className="w-4 h-4" /> {t('tv.log.out')}
              </button>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5 lg:gap-8 px-4 md:px-6 lg:px-10 py-3 md:py-4 flex-1 min-h-0 items-stretch relative z-10 overflow-hidden">
        {/* Left: Doctor Info + Now Calling */}
        <div className="lg:col-span-1 bg-white/70 dark:bg-surface-card/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 md:p-6 flex flex-col items-center text-center shadow-premium">
          <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[10px] md:text-sm uppercase animate-pulse mb-3 md:mb-5">
            <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> {t('tv.live')}
          </div>

          <div className="w-full bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 mb-3 md:mb-5 text-left">
            <img src={getSetting('doctor_image') ? `http://localhost:8000/storage/${getSetting('doctor_image')}` : '/doctor_portrait.png'} alt="Doctor" className="w-10 h-10 md:w-16 md:h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700/50 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm md:text-xl text-slate-900 dark:text-white truncate">{doctors.find((d) => d.id === selectedDoctorId)?.name}</h3>
              <p className="text-indigo-600 dark:text-indigo-400 text-[10px] md:text-sm font-semibold uppercase tracking-wider truncate">{doctors.find((d) => d.id === selectedDoctorId)?.specialization}</p>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700/80 w-full mb-3 md:mb-5" />

          <div className="space-y-2 md:space-y-3 w-full">
            <p className="text-[10px] md:text-sm text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('tv.now.calling')}</p>
            <AnimatePresence mode="wait">
              {activeItem ? (
                <motion.div key={activeItem.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-2 md:space-y-3">
                  <div className="text-4xl md:text-6xl lg:text-7xl font-black text-indigo-600 dark:text-indigo-400 leading-none drop-shadow-[0_4px_12px_rgba(99,102,241,0.15)] dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse">
                    #{activeItem.serial_no}
                  </div>
                  <div className="text-base md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{activeItem.patient.name}</div>
                </motion.div>
              ) : (
                <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm md:text-lg text-slate-400 dark:text-slate-500 font-bold">{t('tv.please.wait')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {activeItem && (
            <button
              onClick={() => speakAnnouncement(activeItem.serial_no)}
              className="mt-3 md:mt-5 w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold py-2 md:py-3 px-3 md:px-4 rounded-lg text-xs md:text-sm cursor-pointer transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('tv.repeat.audio')}
            </button>
          )}
        </div>

        {/* Right: Up Next — BIG for TV viewing */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-surface-card/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 md:p-6 lg:p-8 flex flex-col shadow-premium">
          <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-2 md:gap-4 shrink-0">
            <UserCheck className="w-5 h-5 md:w-7 md:h-7 lg:w-10 lg:h-10 text-indigo-600 dark:text-indigo-400" /> {t('tv.up.next')}
          </h2>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {waitingItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm md:text-lg font-semibold">{t('tv.no.waiting')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                {waitingItems.map((item, index) => {
                  const showPlaceholder = (index + 1) % 4 === 0 && index < waitingItems.length - 1;
                  return (
                  <React.Fragment key={item.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-slate-50 dark:bg-slate-800/30 border p-3 md:p-6 lg:p-8 rounded-xl flex items-center gap-3 md:gap-5 lg:gap-6 ${
                      index === 0
                        ? 'border-indigo-500/50 ring-2 ring-indigo-500/20'
                        : item.priority === 'Reserved'
                        ? 'border-indigo-500/30 ring-1 ring-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-700/50'
                    }`}
                  >
                    <span className={`text-3xl md:text-5xl lg:text-7xl font-black leading-none ${
                      index === 0 ? 'text-indigo-600 dark:text-indigo-400'
                      : item.priority === 'Reserved' ? 'text-indigo-400 dark:text-indigo-500'
                      : 'text-slate-400 dark:text-slate-500'
                    }`}>#{item.serial_no}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-base md:text-2xl lg:text-4xl font-black text-slate-900 dark:text-white truncate">{item.patient.name}</div>
                      <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                        {item.priority === 'Reserved' && (
                          <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[10px] md:text-sm font-bold px-1.5 md:px-2 py-0.5 rounded-full">{t('tv.reserved')}</span>
                        )}
                        {item.priority === 'Emergency' && (
                          <span className="bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[10px] md:text-sm font-bold px-1.5 md:px-2 py-0.5 rounded-full">{t('tv.emergency')}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Placeholder slot after every 4 items */}
                  {showPlaceholder && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (index + 1) * 0.1 }}
                      className="p-3 md:p-4 lg:p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 flex items-center justify-center gap-2 md:gap-3 col-span-1"
                    >
                      <Bookmark className="w-4 h-4 md:w-5 md:h-5 text-slate-300 dark:text-slate-600" />
                      <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">
                        {t('tv.reserved.slot')}
                      </span>
                    </motion.div>
                  )}
                  </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/70 dark:bg-surface-card/40 border border-slate-200/80 dark:border-slate-700/80 mx-4 md:mx-6 lg:mx-10 mb-3 md:mb-4 p-2 md:p-4 lg:p-5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 shrink-0 relative z-10">
        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-sm md:text-xl lg:text-2xl font-black uppercase tracking-wider px-3 md:px-4 lg:px-5 py-1.5 md:py-2.5 rounded-lg shrink-0">
          {t('footer.notice')}
        </span>
        <div className="text-sm md:text-2xl lg:text-4xl font-black text-slate-700 dark:text-slate-300 text-center animate-pulse leading-tight">
          {t('reception.print.footer')}
        </div>
      </div>

      {!embedded && <MobileBottomNav onDoctors={() => { setViewMode('single'); setSelectedDoctorId(null); }} />}
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};
