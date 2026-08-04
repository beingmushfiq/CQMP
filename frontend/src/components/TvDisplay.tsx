import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore, type QueueItem } from '../store/useQueueStore';
import { echo } from '../utils/echo';
import api, { createPublicApi, getStorageBaseUrl } from '../utils/api';
import { Monitor, Volume2, VolumeX, Play, Sun, Moon, Coffee, LogOut, Maximize, Minimize, User } from 'lucide-react';

import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { UserProfile } from './UserProfile';
import { useDisplayModeContext } from './DisplayModeContext';
import { useAudioSync } from '../hooks/useAudioSync';
import { AudioTickerBanner } from './AudioTickerBanner';
import { AudioAutoplayOverlay } from './AudioAutoplayOverlay';

import { HeaderBar } from './display/HeaderBar';
import { DoctorInfoCard } from './display/DoctorInfoCard';
import { CurrentSerialHero } from './display/CurrentSerialHero';
import { NextQueueGrid } from './display/NextQueueGrid';
import { AnnouncementTicker } from './display/AnnouncementTicker';
import { ModeOverlays } from './display/ModeOverlays';


const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

interface TvDisplayProps {
  embedded?: boolean;
}

export const TvDisplay: React.FC<TvDisplayProps> = ({ embedded = false }) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  useAudioSync(selectedDoctorId ?? undefined);
  const { queueDay: authQueueDay, items: authItems, fetchTodayQueue, subscribeToQueue } = useQueueStore();
  const { theme, toggleTheme } = useThemeStore();
  const { logout, user } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();
  const [doctors, setDoctors] = useState<any[]>([]);

  // ── Centralized Display State Machine ──
  const displayState = useDisplayModeContext();
  const isBreakMode = displayState.mode === 'BREAK' || displayState.mode === 'LUNCH' || displayState.mode === 'PRAYER';

  // Public API instance — used when no auth token is present (public TV view)
  const publicApi = React.useMemo(() => createPublicApi(), []);
  // True when the TV is opened without a staff login (public display mode)
  const isPublicView = !localStorage.getItem('cqmp_token');

  // Public-mode queue state (replaces store when unauthenticated)
  const [pubQueueDay, setPubQueueDay] = useState<any>(null);
  const [pubItems, setPubItems] = useState<QueueItem[]>([]);

  // Unified queue state — use public state when not logged in
  const queueDay = isPublicView ? pubQueueDay : authQueueDay;
  const items = isPublicView ? pubItems : authItems;


  const [viewMode, setViewMode] = useState<'single' | 'lobby'>('single');
  const [lobbyQueues, setLobbyQueues] = useState<Record<number, { called: QueueItem | null; waiting: QueueItem[] }>>({});
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('cqmp_audio_enabled');
    return saved !== 'false'; // defaults to true
  });

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
    publicApi.get('/public/doctors').then((res) => {
      const docs = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (docs.length > 0) {
        setDoctors(docs);
      } else {
        const docList = [{ id: 1, name: getSetting('doctor_name', 'Dr. Muhammad Asif Sattar (MBBS MPH)'), specialization: getSetting('doctor_specialization', 'General Practitioner') }];
        setDoctors(docList);
      }
    }).catch(() => {
      const docList = [{ id: 1, name: getSetting('doctor_name', 'Dr. Muhammad Asif Sattar (MBBS MPH)'), specialization: getSetting('doctor_specialization', 'General Practitioner') }];
      setDoctors(docList);
    });
  }, []);

  const lastAnnouncedSerialRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (viewMode !== 'lobby' || doctors.length === 0) return;

    const activeChannels: string[] = [];

    // Choose data source based on auth state
    const fetchQueue = (doc: any) =>
      isPublicView
        ? publicApi.get(`/public/queue?doctor_id=${doc.id}`)
        : api.get(`/queue/today?doctor_id=${doc.id}`);

    const parseItems = (res: any): any[] => {
      const raw = res.data.items;
      return Array.isArray(raw) ? raw : (raw?.data || []);
    };

    const fetchAllQueues = async () => {
      const queues: typeof lobbyQueues = {};
      for (const doc of doctors) {
        try {
          const res = await fetchQueue(doc);
          const qItems = parseItems(res);
          queues[doc.id] = {
            called: qItems.find((i: any) => i.status === 'Called') || null,
            waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3),
          };

          // Only subscribe via WebSocket when authenticated
          if (!isPublicView) {
            const qDayId = res.data.queue_day?.id;
            if (qDayId) {
              const channelName = `queue.${qDayId}`;
              if (!activeChannels.includes(channelName)) activeChannels.push(channelName);
              const ch = echo.channel(channelName);
              const handleUpdated = (e: { queue_item: QueueItem }) => {
                if (e?.queue_item?.status === 'Called') speakAnnouncement(e.queue_item.serial_no);
                refreshLobbyData();
              };
              const handleGeneral = () => refreshLobbyData();
              ch.listen('QueueUpdated', handleUpdated).listen('.QueueUpdated', handleUpdated)
                .listen('QueueCreated', handleGeneral).listen('.QueueCreated', handleGeneral)
                .listen('QueueCompleted', handleGeneral).listen('.QueueCompleted', handleGeneral)
                .listen('EmergencyInserted', handleGeneral).listen('.EmergencyInserted', handleGeneral)
                .listen('QueueDeleted', handleGeneral).listen('.QueueDeleted', handleGeneral)
                .listen('QueueFrozen', handleGeneral).listen('.QueueFrozen', handleGeneral)
                .listen('QueueResumed', handleGeneral).listen('.QueueResumed', handleGeneral);
            }
          }
        } catch { /* ignore */ }
      }
      setLobbyQueues(queues);
    };

    fetchAllQueues();

    // Public mode: poll every 10 s since WebSocket requires auth
    const pollTimer = isPublicView ? setInterval(fetchAllQueues, 10_000) : null;

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      activeChannels.forEach((ch) => echo.leave(ch));
    };
  }, [viewMode, doctors, isPublicView]);

  const refreshLobbyData = async () => {
    const queues: typeof lobbyQueues = {};
    const fetchQueue = (doc: any) =>
      isPublicView
        ? publicApi.get(`/public/queue?doctor_id=${doc.id}`)
        : api.get(`/queue/today?doctor_id=${doc.id}`);
    const parseItems = (res: any): any[] => {
      const raw = res.data.items;
      return Array.isArray(raw) ? raw : (raw?.data || []);
    };
    for (const doc of doctors) {
      try {
        const res = await fetchQueue(doc);
        const qItems = parseItems(res);
        queues[doc.id] = {
          called: qItems.find((i: any) => i.status === 'Called') || null,
          waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3),
        };
      } catch { /* ignore */ }
    }
    setLobbyQueues(queues);
  };

  // ── Single-doctor view: fetch queue for selected doctor ──────────────
  useEffect(() => {
    if (!selectedDoctorId || viewMode !== 'single') return;

    if (isPublicView) {
      // Public mode: poll /public/queue every 10 s (no WebSocket auth needed)
      const fetchPublic = async () => {
        try {
          const res = await publicApi.get(`/public/queue?doctor_id=${selectedDoctorId}`);
          setPubQueueDay(res.data.queue_day ?? null);
          const raw: any[] = Array.isArray(res.data.items) ? res.data.items : [];
          setPubItems(raw as QueueItem[]);
          // Announce newly called serial
          const called = raw.find((i: any) => i.status === 'Called');
          if (called && called.serial_no !== lastAnnouncedSerialRef.current) {
            lastAnnouncedSerialRef.current = called.serial_no;
            speakAnnouncement(called.serial_no);
          }
        } catch { /* silent — display stays with last known state */ }
      };
      fetchPublic();
      const timer = setInterval(fetchPublic, 10_000);
      return () => clearInterval(timer);
    } else {
      // Auth mode: use store + WebSocket
      fetchTodayQueue(selectedDoctorId);

      return () => {};
    }
  }, [selectedDoctorId, viewMode, isPublicView]);

  useEffect(() => {
    if (isPublicView || !queueDay?.id || viewMode !== 'single') return;
    subscribeToQueue(queueDay.id);
  }, [queueDay?.id, viewMode, isPublicView]);


  const activeItem = items.find((i) => i.status === 'Called');

  useEffect(() => {
    if (viewMode !== 'single' || !activeItem) return;
    if (activeItem.status === 'Called' && activeItem.serial_no !== lastAnnouncedSerialRef.current) {
      lastAnnouncedSerialRef.current = activeItem.serial_no;
      speakAnnouncement(activeItem.serial_no);
    }
  }, [activeItem, viewMode]);

  const speakAnnouncement = (serialNo: number, force = false) => {
    if (!isAudioEnabled && !force) return;
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

  // ── Audio toggle button (shared) ──
  const AudioToggle = () => (
    <button
      onClick={() => {
        const nextState = !isAudioEnabled;
        setIsAudioEnabled(nextState);
        localStorage.setItem('cqmp_audio_enabled', String(nextState));
      }}
      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-1.5 ${
        isAudioEnabled
          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30'
      }`}
      title={isAudioEnabled ? t('tv.audio.on') : t('tv.audio.off')}
    >
      {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      <span className="text-[10px] md:text-xs font-bold hidden sm:inline select-none leading-none">
        {isAudioEnabled ? t('tv.audio.on') : t('tv.audio.off')}
      </span>
    </button>
  );

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
        <button onClick={toggleFullscreen} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          <span className="text-[10px] font-semibold">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>
        <button onClick={() => setProfileOpen(true)} className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
          {user?.avatar ? (
            <img src={`${getStorageBaseUrl()}/storage/${user.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover" />
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
          <div className="mt-4 md:mt-6 flex justify-between items-center gap-2">
            <button onClick={toggleFullscreen} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer transition-all" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
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
        {/* On Break Overlay for lobby — driven by centralized Display State Machine */}
        <AnimatePresence>
          {(isBreakMode || queueDay?.status === 'paused') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-amber-50/80 via-white/70 to-orange-50/80 dark:from-surface-dark/90 dark:via-surface-dark/85 dark:to-amber-950/30"
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                className="text-center space-y-6 md:space-y-10 px-8 max-w-4xl"
              >
                <div className="inline-flex items-center justify-center w-28 h-28 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full bg-amber-400/20 border-4 border-amber-400/50 dark:border-amber-500/50 shadow-[0_0_80px_rgba(245,158,11,0.25)]">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                    <Coffee style={{ width: 'clamp(3.5rem, 6vw, 7rem)', height: 'clamp(3.5rem, 6vw, 7rem)' }} className="text-amber-500 dark:text-amber-400" />
                  </motion.div>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">{t('tv.on.break')}</h1>
                  <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-600 dark:text-slate-300">{t('tv.on.break.subtitle')}</p>
                  <p className="text-lg md:text-2xl lg:text-3xl text-slate-400 dark:text-slate-500 font-semibold">{t('tv.on.break.wait')}</p>
                </div>
                <div className="flex items-center justify-center gap-3 md:gap-4 text-amber-500/70 dark:text-amber-400/60">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-sm md:text-xl font-bold uppercase tracking-[0.2em]">{t('tv.queue.paused')}</span>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-400 animate-ping" style={{ animationDelay: '0.5s' }} />
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
            <AudioToggle />
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

  // ── Single Doctor TV Display (Commercial Digital Signage for 32" Google TV) ──
  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="w-screen h-screen max-w-[100vw] max-h-[100vh] bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden select-none p-[32px] box-border transition-colors duration-300">
      {/* Ambient Signage Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Display Mode Overlays (State Machine) ── */}
      <ModeOverlays />

      {/* ── Top Header Bar (Clock 32-40px & Socket Connection Status) ── */}
      <HeaderBar
        clock={clock}
        title={currentDoctor?.name || getSetting('doctor_name', 'CQMP Live Board')}
        subtitle={currentDoctor?.specialization || getSetting('doctor_specialization', 'Doctor Waiting Room')}
      />

      {/* ── Main Layout Canvas (1366x768 baseline, 12-Column Grid) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 my-2 items-stretch overflow-hidden">
        {/* Left Column (5 Cols): Doctor Info Card (#2 Focus) + Current Serial Hero (Calling Hero, 90-120px) */}
        <div className="col-span-5 flex flex-col gap-5 min-h-0 overflow-hidden">
          <DoctorInfoCard doctor={currentDoctor} />
          <CurrentSerialHero
            activeItem={activeItem}
            onRepeatAudio={(serialNo) => speakAnnouncement(serialNo, true)}
          />
        </div>

        {/* Right Column (7 Cols): Next Queue Cards (Max 5 Patients) + Dedicated Wait Time Card */}
        <div className="col-span-7 flex flex-col min-h-0 overflow-hidden">
          <NextQueueGrid items={items} />
        </div>
      </div>

      {/* ── Bottom Announcement Ticker Banner (Height 60-70px, Font 28-32px, Smooth Marquee) ── */}
      <AnnouncementTicker />

      {!embedded && <MobileBottomNav onDoctors={() => { setViewMode('single'); setSelectedDoctorId(null); }} />}
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AudioTickerBanner />
      <AudioAutoplayOverlay />
    </div>
  );
};
