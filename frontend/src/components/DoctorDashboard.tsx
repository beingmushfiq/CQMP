import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore } from '../store/useQueueStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../utils/api';
import { Play, Pause, ChevronRight, UserCheck, AlertCircle, Clock, LogOut, Sun, Moon, Stethoscope, Coffee, ShieldAlert, FileText, Monitor, Calendar } from 'lucide-react';

import { useThemeStore } from '../store/useThemeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { getStorageBaseUrl } from '../utils/api';
import { UserProfile } from './UserProfile';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useDisplayModeContext } from './DisplayModeContext';
import { AudioControlPanel } from './AudioControlPanel';


const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export const DoctorDashboard: React.FC = () => {
  const { queueDay, items, fetchTodayQueue, openQueue, callNext, completeItem, skipItem, toggleQueuePause, resetQueue } = useQueueStore();
  const { logout, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [openError, setOpenError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [displayLoading, setDisplayLoading] = useState(false);

  const { mode: displayMode, setMode: setDisplayMode, resume: resumeDisplay } = useDisplayModeContext();

  const activeItem = items.find((i) => i.status === 'Called');
  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no);

  useKeyboardShortcut({
    '1': () => { if (!selectedDoctorId && doctors[0]) handleSelectDoctor(doctors[0].id); },
    '2': () => { if (!selectedDoctorId && doctors[1]) handleSelectDoctor(doctors[1].id); },
    '3': () => { if (!selectedDoctorId && doctors[2]) handleSelectDoctor(doctors[2].id); },
    'o': () => { if (selectedDoctorId && !queueDay && !opening) handleOpenQueue(); },
    'p': () => { if (selectedDoctorId && queueDay) toggleQueuePause(); },
    'n': () => { if (selectedDoctorId && queueDay && !activeItem && waitingItems.length > 0) callNext(); },
    'c': () => { if (selectedDoctorId && queueDay && activeItem) completeItem(activeItem.id); },
    's': () => { if (selectedDoctorId && queueDay && activeItem) skipItem(activeItem.id); },
    'd': () => { if (selectedDoctorId && queueDay) document.getElementById('delay-input')?.focus(); },
    'q': () => logout(),
  });

  useEffect(() => {
    api.get('/me').then(() => {
      const list = [{ id: 1, name: getSetting('doctor_name', 'Dr. Muhammad Asif Sattar'), specialization: getSetting('doctor_specialization', 'General Practitioner') }];
      setDoctors(list);
      if (list.length === 1) handleSelectDoctor(list[0].id);
    });
  }, []);

  const handleSelectDoctor = (id: number) => {
    resetQueue();
    setSelectedDoctorId(id);
    setOpenError(null);
    fetchTodayQueue(id);
  };

  const handleOpenQueue = async () => {
    if (!selectedDoctorId) return;
    setOpening(true);
    setOpenError(null);
    try {
      await openQueue(selectedDoctorId);
    } catch (err: any) {
      setOpenError(err?.response?.data?.message || t('doctor.alert.open.failed'));
    } finally {
      setOpening(false);
    }
  };

  const submitDelay = async () => {
    if (!selectedDoctorId) return;
    try {
      await api.post('/doctor/delay', { doctor_id: selectedDoctorId, delay_minutes: delayMinutes });
      alert(t('doctor.alert.delay.updated', { mins: delayMinutes }));
    } catch {
      alert(t('doctor.alert.delay.failed'));
    }
  };

  // Doctor Selection Screen
  if (!selectedDoctorId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white flex items-center justify-center p-6 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-8 rounded-xl shadow-premium-lg text-center"
        >
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{t('doctor.select.chamber')}</h2>
          <div className="space-y-3">
            {doctors.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-700 p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white group"
              >
                <div>
                  <h3 className="font-semibold text-sm">{doc.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">{doc.specialization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">[{idx + 1}]</span>
                  <ChevronRight className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={() => logout()} className="text-rose-500 dark:text-rose-400 text-xs font-medium cursor-pointer hover:underline">
              {t('doctor.sign.out')} [Q]
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Doctor Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 px-4 md:px-6 py-3 md:py-4 rounded-xl shadow-premium">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <img src={getSetting('logo_path') ? `${getStorageBaseUrl()}/storage/${getSetting('logo_path')}` : '/favicon.svg'} alt="Logo" className="w-8 h-8 rounded-lg shadow-md" />
              <div>
                <h1 className="text-sm font-bold">{doctors.find(d => d.id === selectedDoctorId)?.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('doctor.control.panel')}</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${queueDay?.status === 'opened' ? 'bg-emerald-400' : queueDay?.status === 'paused' ? 'bg-amber-400' : 'bg-rose-500'}`}></span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  queueDay?.status === 'opened'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : queueDay?.status === 'paused'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {queueDay?.status === 'opened' ? t('doctor.status.open') : queueDay?.status === 'paused' ? t('doctor.status.paused') : t('doctor.status.closed')}
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-xs hidden lg:inline">{user?.name}</span>
              <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hidden sm:flex">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => logout()} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('doctor.sign.out')}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {!queueDay ? (
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-8 rounded-xl text-center space-y-4 shadow-premium">
            <AlertCircle className="w-10 h-10 text-indigo-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('doctor.queue.closed')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{t('doctor.queue.open.desc')}</p>
            {openError && (
              <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg">{openError}</p>
            )}
            <button
              onClick={handleOpenQueue}
              disabled={opening}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
            >
              {opening ? t('doctor.queue.opening') : t('doctor.queue.open.btn')}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Control Column */}
            <div className="space-y-6">
              {/* Queue Status */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-xl space-y-3 shadow-premium">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">{t('doctor.queue.control')}</h2>
                <button
                  onClick={toggleQueuePause}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm cursor-pointer transition-all active:scale-[0.98] min-h-[48px] ${
                    queueDay.status === 'opened'
                      ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {queueDay.status === 'opened' ? <><Pause className="w-4 h-4" /> {t('doctor.pause')} [P]</> : <><Play className="w-4 h-4" /> {t('doctor.resume')} [P]</>}
                </button>
              </motion.div>

              {/* Tomorrow Bookings Quick Overview (Read-Only) */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-xl space-y-3 shadow-premium">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Tomorrow's Bookings
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Read-Only
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Expected patient reservations for tomorrow</p>
                <div className="pt-1 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Reserved Serials:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">Auto-converts on Open</span>
                </div>
              </motion.div>

              {/* Doctor Delay */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-xl space-y-3 shadow-premium">
                <h2 className="text-xs font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {t('doctor.announce.delay')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">{t('doctor.delay.desc')}</p>
                <div className="flex gap-2">
                  <input
                    id="delay-input"
                    type="number"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs min-h-[44px]"
                    placeholder={t('doctor.delay.mins')}
                  />
                  <button onClick={submitDelay} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-semibold text-xs cursor-pointer active:scale-[0.98] transition-all min-h-[44px]">
                    {t('doctor.delay.apply')}
                  </button>
                </div>
                <p className="text-slate-400 text-[10px] text-right">{t('doctor.delay.press.d')}</p>
              </motion.div>

              {/* Display Mode Controls */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-xl space-y-3 shadow-premium">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  Display Controls
                </h2>
                <p className="text-slate-400 dark:text-slate-500 text-[10px]">Controls the waiting room TV display</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => { setDisplayLoading(true); try { await resumeDisplay(); } finally { setDisplayLoading(false); } }}
                    disabled={displayLoading || displayMode === 'NORMAL'}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                      displayMode === 'NORMAL'
                        ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" /> Normal
                  </button>
                  <button
                    onClick={async () => { setDisplayLoading(true); try { await setDisplayMode('BREAK'); } finally { setDisplayLoading(false); } }}
                    disabled={displayLoading || displayMode === 'BREAK'}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                      displayMode === 'BREAK'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" /> Break
                  </button>
                  <button
                    onClick={async () => { setDisplayLoading(true); try { await setDisplayMode('REPORT'); } finally { setDisplayLoading(false); } }}
                    disabled={displayLoading || displayMode === 'REPORT'}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                      displayMode === 'REPORT'
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200 dark:border-slate-700 hover:border-indigo-500/40'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Report
                  </button>
                  <button
                    onClick={async () => { setDisplayLoading(true); try { await setDisplayMode('EMERGENCY'); } finally { setDisplayLoading(false); } }}
                    disabled={displayLoading || displayMode === 'EMERGENCY'}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                      displayMode === 'EMERGENCY'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border-slate-200 dark:border-slate-700 hover:border-rose-500/40'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Emergency
                  </button>
                </div>
                {displayMode !== 'NORMAL' && (
                  <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-semibold">TV is in {displayMode} mode</p>
                )}
              </motion.div>

              {/* Audio Announcement Controls */}
              <AudioControlPanel />
            </div>


            {/* Middle Main Active Patient Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Consultation Panel */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-xl relative overflow-hidden shadow-premium">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-4">{t('doctor.inside.chamber')}</h2>

                <AnimatePresence mode="wait">
                  {activeItem ? (
                    <motion.div
                      key={activeItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeItem.patient.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{t('doctor.serial')} {activeItem.serial_no} | {t('doctor.phone')} {activeItem.patient.phone}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => completeItem(activeItem.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.98] cursor-pointer text-sm transition-all min-h-[48px]"
                        >
                          <UserCheck className="w-4 h-4" /> {t('doctor.complete.visit')}
                        </button>
                        <button
                          onClick={() => skipItem(activeItem.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-semibold py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-[0.98] cursor-pointer text-sm transition-all min-h-[48px]"
                        >
                          {t('doctor.skip')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center space-y-3">
                      <p className="text-slate-400 dark:text-slate-500 text-xs">{t('doctor.no.patient.chamber')}</p>
                      <button
                        onClick={callNext}
                        disabled={waitingItems.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3.5 rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.98] cursor-pointer transition-all min-h-[48px]"
                      >
                        {t('doctor.call.next')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Waiting List */}
              <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-xl space-y-4 shadow-premium">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white">{t('doctor.waiting.queue')} ({waitingItems.length})</h2>

                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {waitingItems.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-xs py-4 text-center">{t('doctor.no.waiting')}</p>
                  ) : (
                    waitingItems.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-slate-50 dark:bg-slate-800/30 border p-3 rounded-xl flex justify-between items-center text-xs ${
                          item.priority === 'Emergency' ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">#{item.serial_no}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.patient.name}</span>
                          {item.priority === 'Emergency' && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full font-bold">{t('doctor.emergency')}</span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Navbar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-surface-card/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-700/80 px-2 py-2">
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-1 px-3 py-1.5 text-indigo-600 dark:text-indigo-400">
            <Stethoscope className="w-5 h-5 scale-110" />
            <span className="text-[10px] font-semibold">{t('nav.doctor').split(' ')[0]}</span>
            <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          </div>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            {user?.avatar ? (
              <img src={`${getStorageBaseUrl()}/storage/${user.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-indigo-600/15 dark:bg-indigo-600/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[8px]">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
            <span className="text-[10px] font-semibold">{t('nav.profile')}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-[10px] font-semibold">{theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{t('nav.logout')}</span>
          </button>
        </div>
      </nav>

      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};
