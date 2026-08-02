import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore, type QueueItem } from '../store/useQueueStore';
import { echo } from '../utils/echo';
import api, { createPublicApi, getStorageBaseUrl } from '../utils/api';
import { Monitor, Volume2, VolumeX, UserCheck, Play, Sun, Moon, Bookmark, Coffee, ShieldAlert, FileText, Loader2, LogOut, Maximize, Minimize, User } from 'lucide-react';

import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { UserProfile } from './UserProfile';
import { useDisplayModeContext } from './DisplayModeContext';
import { useAudioSync } from '../hooks/useAudioSync';
import { AudioTickerBanner } from './AudioTickerBanner';
import { AudioAutoplayOverlay } from './AudioAutoplayOverlay';


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
  // True when an overlay mode is active (takes priority over queue rendering)
  const isBreakMode = displayState.mode === 'BREAK' || displayState.mode === 'LUNCH' || displayState.mode === 'PRAYER';
  const isEmergencyMode = displayState.mode === 'EMERGENCY';
  const isReportMode = displayState.mode === 'REPORT';
  const isOfflineMode = displayState.mode === 'OFFLINE' || displayState.mode === 'MAINTENANCE';

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
        const docList = [{ id: 1, name: getSetting('doctor_name', 'Dr. Asif'), specialization: getSetting('doctor_specialization', 'General Physician') }];
        setDoctors(docList);
      }
    }).catch(() => {
      const docList = [{ id: 1, name: getSetting('doctor_name', 'Dr. Asif'), specialization: getSetting('doctor_specialization', 'General Physician') }];
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

  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no).slice(0, 5);

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

  // ── Single Doctor TV Display (Digital Signage optimized) ──
  return (
    <div className="h-full bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Ambient blurs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* ── Display Mode Overlays (State Machine) ── */}
      <AnimatePresence>

        {/* BREAK / LUNCH / PRAYER overlay */}
        {(isBreakMode || queueDay?.status === 'paused') && (
          <motion.div
            key="break-overlay"
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
                <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">
                  {displayState.title_bn || t('tv.on.break')}
                </h1>
                <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-600 dark:text-slate-300">
                  {displayState.title_en || t('tv.on.break.subtitle')}
                </p>
                <p className="text-lg md:text-2xl lg:text-3xl text-slate-400 dark:text-slate-500 font-semibold mt-2">
                  {displayState.message_en || t('tv.on.break.wait')}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 md:gap-4 text-amber-500/70 dark:text-amber-400/60">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="text-sm md:text-xl font-bold uppercase tracking-[0.2em]">{t('tv.queue.paused')}</span>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-400 animate-ping" style={{ animationDelay: '0.5s' }} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* EMERGENCY overlay */}
        {isEmergencyMode && (
          <motion.div
            key="emergency-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-rose-50/90 via-white/80 to-red-50/90 dark:from-surface-dark/92 dark:via-surface-dark/88 dark:to-rose-950/40"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
              className="text-center space-y-6 md:space-y-10 px-8 max-w-4xl"
            >
              <div className="inline-flex items-center justify-center w-28 h-28 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full bg-rose-500/20 border-4 border-rose-500/50 dark:border-rose-400/50 shadow-[0_0_80px_rgba(239,68,68,0.30)]">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <ShieldAlert style={{ width: 'clamp(3.5rem, 6vw, 7rem)', height: 'clamp(3.5rem, 6vw, 7rem)' }} className="text-rose-500 dark:text-rose-400" />
                </motion.div>
              </div>
              <div className="space-y-3 md:space-y-5">
                <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">
                  {displayState.title_bn || 'জরুরি বিজ্ঞপ্তি'}
                </h1>
                <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-600 dark:text-slate-300">
                  {displayState.title_en || 'Emergency Notice'}
                </p>
                {displayState.message_en && (
                  <p className="text-lg md:text-2xl lg:text-3xl text-slate-400 dark:text-slate-500 font-semibold mt-2">
                    {displayState.message_en}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 md:gap-4 text-rose-500/70 dark:text-rose-400/60">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-rose-400 animate-ping" />
                <span className="text-sm md:text-xl font-bold uppercase tracking-[0.2em]">Emergency</span>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-rose-400 animate-ping" style={{ animationDelay: '0.4s' }} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* REPORT overlay */}
        {isReportMode && (
          <motion.div
            key="report-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-indigo-50/80 via-white/70 to-slate-50/80 dark:from-surface-dark/90 dark:via-surface-dark/85 dark:to-indigo-950/30"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
              className="text-center space-y-6 md:space-y-10 px-8 max-w-4xl"
            >
              <div className="inline-flex items-center justify-center w-28 h-28 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full bg-indigo-500/15 border-4 border-indigo-500/40 dark:border-indigo-400/40 shadow-[0_0_80px_rgba(99,102,241,0.20)]">
                <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                  <FileText style={{ width: 'clamp(3.5rem, 6vw, 7rem)', height: 'clamp(3.5rem, 6vw, 7rem)' }} className="text-indigo-500 dark:text-indigo-400" />
                </motion.div>
              </div>
              <div className="space-y-3 md:space-y-5">
                <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
                  {displayState.title_bn || 'রিপোর্ট চলছে'}
                </h1>
                <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-600 dark:text-slate-300">
                  {displayState.title_en || 'Report in Progress'}
                </p>
                <p className="text-lg md:text-2xl lg:text-3xl text-slate-400 dark:text-slate-500 font-semibold mt-2">
                  {displayState.message_en || 'Service will resume shortly.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 md:gap-4 text-indigo-500/70 dark:text-indigo-400/60">
                <Loader2 className="w-5 h-5 md:w-7 md:h-7 animate-spin" />
                <span className="text-sm md:text-xl font-bold uppercase tracking-[0.2em]">Please Wait</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* OFFLINE / MAINTENANCE overlay */}
        {isOfflineMode && (
          <motion.div
            key="offline-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-slate-100/90 via-white/80 to-slate-200/80 dark:from-surface-dark/95 dark:via-surface-dark/90 dark:to-slate-900/60"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
              className="text-center space-y-6 md:space-y-10 px-8 max-w-4xl"
            >
              <div className="inline-flex items-center justify-center w-28 h-28 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full bg-slate-300/30 border-4 border-slate-400/30 dark:border-slate-600/40">
                <Monitor style={{ width: 'clamp(3.5rem, 6vw, 7rem)', height: 'clamp(3.5rem, 6vw, 7rem)' }} className="text-slate-400 dark:text-slate-500" />
              </div>
              <div className="space-y-3 md:space-y-5">
                <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-slate-500 dark:text-slate-400 tracking-tight leading-none">
                  {displayState.title_bn || 'সেবা বন্ধ'}
                </h1>
                <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-500 dark:text-slate-400">
                  {displayState.title_en || 'Service Unavailable'}
                </p>
                <p className="text-lg md:text-2xl lg:text-3xl text-slate-400 dark:text-slate-500 font-semibold mt-2">
                  {displayState.message_en || 'Please check back shortly.'}
                </p>
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
              <AudioToggle />
              <button onClick={toggleFullscreen} className="flex bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700/80 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer transition-all items-center gap-2" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
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
        {/* Left: Doctor Info (2nd most important) + Now Calling (1st) */}
        <div className="lg:col-span-1 bg-white/70 dark:bg-surface-card/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 md:p-6 lg:p-8 flex flex-col items-center text-center shadow-premium min-h-0">
          <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[10px] md:text-sm uppercase mb-3 md:mb-5">
            <Volume2 className="w-4 h-4 md:w-5 md:h-5 animate-pulse" /> {t('tv.live')}
          </div>

          {/* Doctor Info Card — 2nd most important, enlarged */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-5 md:p-7 lg:p-8 rounded-xl flex flex-col items-center gap-4 md:gap-5 mb-4 md:mb-6 text-center">
            {/* Doctor photo +30% */}
            <img
              src={getSetting('doctor_image') ? `${getStorageBaseUrl()}/storage/${getSetting('doctor_image')}` : '/doctor_portrait.png'}
              alt="Doctor"
              className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700/50 shadow-md shrink-0"
            />
            <div className="min-w-0 w-full">
              {/* Doctor name +50%, bold */}
              <h3 className="font-black text-xl md:text-3xl lg:text-4xl xl:text-5xl text-slate-900 dark:text-white leading-tight">
                {doctors.find((d) => d.id === selectedDoctorId)?.name}
              </h3>
              {/* Specialization +40% */}
              <p className="text-indigo-600 dark:text-indigo-400 text-sm md:text-xl lg:text-2xl xl:text-3xl font-bold uppercase tracking-wide mt-1 md:mt-2">
                {doctors.find((d) => d.id === selectedDoctorId)?.specialization}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700/80 w-full mb-4 md:mb-5" />

          {/* Now Calling — serial is hero but ~20% smaller than before */}
          <div className="space-y-2 md:space-y-4 w-full">
            <p className="text-[10px] md:text-sm lg:text-base text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('tv.now.calling')}</p>
            <AnimatePresence mode="wait">
              {activeItem ? (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-3 md:p-5 lg:p-6 rounded-xl flex items-center gap-3 md:gap-4 lg:gap-5"
                >
                  {/* Serial: hero but ~20% reduced — text-6xl instead of text-7xl at lg */}
                  <span className="text-3xl md:text-5xl lg:text-6xl font-black leading-none text-indigo-600 dark:text-indigo-400 shrink-0">
                    #{activeItem.serial_no}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-base md:text-xl lg:text-3xl font-black text-slate-900 dark:text-white truncate">{activeItem.patient.name}</div>
                  </div>
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
              onClick={() => speakAnnouncement(activeItem.serial_no, true)}
              className="mt-3 md:mt-5 w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold py-2 md:py-3 px-3 md:px-4 rounded-lg text-xs md:text-sm cursor-pointer transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('tv.repeat.audio')}
            </button>
          )}
        </div>

        {/* Right: Up Next — optimized for large-screen readability */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-surface-card/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 md:p-6 lg:p-8 flex flex-col shadow-premium min-h-0">
          <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 md:mb-5 flex items-center gap-2 md:gap-4 shrink-0">
            <UserCheck className="w-5 h-5 md:w-7 md:h-7 lg:w-9 lg:h-9 text-indigo-600 dark:text-indigo-400" /> {t('tv.up.next')}
          </h2>
          {/* Queue list — no inner scroll; clamped to available height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {waitingItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm md:text-xl font-semibold">{t('tv.no.waiting')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 h-full auto-rows-fr">
                {waitingItems.map((item, index) => {
                  const showPlaceholder = (index + 1) % 4 === 0 && index < waitingItems.length - 1;
                  return (
                  <React.Fragment key={item.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`bg-slate-50 dark:bg-slate-800/30 border p-4 md:p-6 lg:p-8 rounded-xl flex items-center gap-4 md:gap-5 lg:gap-7 ${
                      index === 0
                        ? 'border-indigo-500/60 ring-2 ring-indigo-500/25 bg-indigo-50/40 dark:bg-indigo-950/20'
                        : item.priority === 'Reserved'
                        ? 'border-indigo-500/30 ring-1 ring-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Serial — ~20% smaller than before (text-6xl not text-7xl at lg) */}
                    <span className={`text-3xl md:text-5xl lg:text-6xl font-black leading-none shrink-0 ${
                      index === 0 ? 'text-indigo-600 dark:text-indigo-400'
                      : item.priority === 'Reserved' ? 'text-indigo-400 dark:text-indigo-500'
                      : 'text-slate-400 dark:text-slate-500'
                    }`}>#{item.serial_no}</span>
                    <div className="flex-1 min-w-0">
                      {/* Patient name — cleaner contrast */}
                      <div className="text-base md:text-xl lg:text-3xl font-black text-slate-900 dark:text-white truncate leading-tight">{item.patient.name}</div>
                      <div className="flex items-center gap-2 mt-1.5 md:mt-2">
                        {item.priority === 'Reserved' && (
                          <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs md:text-sm font-bold px-2 py-0.5 rounded-full">{t('tv.reserved')}</span>
                        )}
                        {item.priority === 'Emergency' && (
                          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs md:text-sm font-bold px-2 py-0.5 rounded-full">{t('tv.emergency')}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Placeholder slot after every 4 items */}
                  {showPlaceholder && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (index + 1) * 0.08 }}
                      className="p-4 md:p-5 lg:p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 flex items-center justify-center gap-2 md:gap-3 col-span-1"
                    >
                      <Bookmark className="w-4 h-4 md:w-5 md:h-5 text-slate-300 dark:text-slate-600" />
                      <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">
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

      {/* Footer / Announcements — improved typography, no jitter */}
      <div className="bg-white/70 dark:bg-surface-card/40 border border-slate-200/80 dark:border-slate-700/80 mx-4 md:mx-6 lg:mx-10 mb-3 md:mb-4 p-3 md:p-4 lg:p-5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-5 shrink-0 relative z-10">
        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm md:text-xl lg:text-2xl font-black uppercase tracking-wider px-3 md:px-5 lg:px-6 py-1.5 md:py-2.5 rounded-lg shrink-0 whitespace-nowrap">
          {t('footer.notice')}
        </span>
        {/* Ticker text — steady, no pulse-jitter, high readability */}
        <div className="text-sm md:text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-700 dark:text-slate-200 text-center leading-snug tracking-wide">
          {t('reception.print.footer')}
        </div>
      </div>

      {!embedded && <MobileBottomNav onDoctors={() => { setViewMode('single'); setSelectedDoctorId(null); }} />}
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AudioTickerBanner />
      <AudioAutoplayOverlay />
    </div>
  );
};
