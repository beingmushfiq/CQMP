import React, { useEffect, useState } from 'react';
import { useQueueStore } from '../store/useQueueStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../utils/api';
import { Play, Pause, ChevronRight, UserCheck, AlertCircle, Clock, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface DoctorDashboardProps {
  onBack?: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onBack }) => {
  const { queueDay, items, fetchTodayQueue, openQueue, callNext, completeItem, skipItem, toggleQueuePause, resetQueue } = useQueueStore();
  const { logout, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [openError, setOpenError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const activeItem = items.find((i) => i.status === 'Called');
  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no);

  // Register Keyboard Shortcuts
  useKeyboardShortcut({
    '1': () => {
      if (!selectedDoctorId && doctors[0]) handleSelectDoctor(doctors[0].id);
    },
    '2': () => {
      if (!selectedDoctorId && doctors[1]) handleSelectDoctor(doctors[1].id);
    },
    '3': () => {
      if (!selectedDoctorId && doctors[2]) handleSelectDoctor(doctors[2].id);
    },
    'o': () => {
      if (selectedDoctorId && !queueDay && !opening) handleOpenQueue();
    },
    'p': () => {
      if (selectedDoctorId && queueDay) toggleQueuePause();
    },
    'n': () => {
      if (selectedDoctorId && queueDay && !activeItem && waitingItems.length > 0) callNext();
    },
    'c': () => {
      if (selectedDoctorId && queueDay && activeItem) completeItem(activeItem.id);
    },
    's': () => {
      if (selectedDoctorId && queueDay && activeItem) skipItem(activeItem.id);
    },
    'd': () => {
      if (selectedDoctorId && queueDay) {
        document.getElementById('delay-input')?.focus();
      }
    },
    't': () => toggleTheme(),
    'q': () => logout(),
    'b': () => {
      if (onBack) {
        resetQueue();
        onBack();
      }
    },
    'escape': () => {
      if (onBack) {
        resetQueue();
        onBack();
      }
    }
  });

  useEffect(() => {
    // Fetch list of doctors on load
    api.get('/me').then(() => {
      setDoctors([
        { id: 1, name: 'Dr. Sarah Rahman', specialization: 'Cardiologist' }
      ]);
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
      setOpenError(err?.response?.data?.message || 'Failed to open queue. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  const submitDelay = async () => {
    if (!selectedDoctorId) return;
    try {
      await api.post('/doctor/delay', {
        doctor_id: selectedDoctorId,
        delay_minutes: delayMinutes,
      });
      alert(`Doctor delay of ${delayMinutes} mins updated.`);
    } catch (err) {
      alert('Failed to update delay.');
    }
  };


  if (!selectedDoctorId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white flex items-center justify-center p-6 transition-colors duration-200">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Select active Doctor chamber</h2>
          <div className="space-y-4">
            {doctors.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className="w-full bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-800 p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white relative group"
              >
                <div>
                  <h3 className="font-semibold text-lg">{doc.name}</h3>
                  <p className="text-slate-500 dark:text-slate-450 text-sm">{doc.specialization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1.5 py-0.5 rounded opacity-65 group-hover:opacity-100 font-bold">[{idx + 1}]</span>
                  <ChevronRight className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between items-center">
            {onBack && (
              <button onClick={onBack} className="text-indigo-600 hover:text-indigo-550 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-semibold cursor-pointer">
                Back to Portal [B]
              </button>
            )}
            <button onClick={() => logout()} className="text-rose-500 hover:text-rose-400 text-sm font-medium cursor-pointer">
              Sign Out [Q]
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="CQMP" className="w-9 h-9 rounded-xl shadow-md" />
            <div>
              <h1 className="text-2xl font-bold">{doctors.find(d => d.id === selectedDoctorId)?.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Doctor Control Panel</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            {/* Queue Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${queueDay?.status === 'opened' ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                queueDay?.status === 'opened'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {queueDay?.status === 'opened' ? 'Open' : 'Closed'}
              </span>
            </div>
            {onBack && (
              <button onClick={() => { resetQueue(); onBack(); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all">
                Back to Portal [B]
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="text-slate-500 dark:text-slate-400 text-sm hidden md:inline">Signed in as {user?.name}</span>
            <button onClick={() => logout()} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-4 py-2 rounded-lg text-sm cursor-pointer transition-all text-slate-800 dark:text-white">
              Sign Out [Q]
            </button>
          </div>
        </div>

        {!queueDay ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-indigo-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Queue Session is Closed</h2>
            <p className="text-slate-650 dark:text-slate-400">Open today's queue session to start receiving patients.</p>
            {openError && (
              <p className="text-rose-450 dark:text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg">{openError}</p>
            )}
            <button
              onClick={handleOpenQueue}
              disabled={opening}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {opening ? 'Opening...' : 'Open Queue Session [O]'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Control Column */}
            <div className="space-y-6">
              {/* Queue Status Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Queue Control</h2>
                <div className="flex gap-3">
                  <button
                    onClick={toggleQueuePause}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium cursor-pointer transition-colors ${
                      queueDay.status === 'opened'
                        ? 'bg-amber-600/10 hover:bg-amber-600/20 dark:bg-amber-600/20 dark:hover:bg-amber-600/35 text-amber-650 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {queueDay.status === 'opened' ? (
                      <>
                        <Pause className="w-5 h-5" /> Pause Queue [P]
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" /> Resume Queue [P]
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Doctor Delay Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Announce Delay
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Add temporary delays (breaks, emergencies) to adjust patient wait times.
                </p>
                <div className="flex gap-2">
                  <input
                    id="delay-input"
                    type="number"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Mins"
                  />
                  <button onClick={submitDelay} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium cursor-pointer">
                    Apply
                  </button>
                </div>
                <p className="text-slate-400 text-xs text-right mt-1">Press <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">D</kbd> to focus, <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Esc</kbd> to exit</p>
              </div>
            </div>

            {/* Middle Main Active Patient Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Consultation Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <h2 className="text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold mb-4">Inside Chamber / Called</h2>

                {activeItem ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{activeItem.patient.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">Serial: {activeItem.serial_no} | Phone: {activeItem.patient.phone}</p>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => completeItem(activeItem.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <UserCheck className="w-5 h-5" /> Complete Visit [C]
                      </button>
                      <button
                        onClick={() => skipItem(activeItem.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-350 font-semibold py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Skip Patient [S]
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-slate-500">No patient is currently inside the chamber.</p>
                    <button
                      onClick={callNext}
                      disabled={waitingItems.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
                    >
                      Call Next Patient [N]
                    </button>
                  </div>
                )}
              </div>

              {/* Waiting List Queue */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Waiting Queue ({waitingItems.length})</h2>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">Updated in real-time</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {waitingItems.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No waiting patients.</p>
                  ) : (
                    waitingItems.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex justify-between items-center ${
                          item.priority === 'Emergency' ? 'border-rose-500/30 bg-rose-955/5 dark:bg-rose-950/5' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">#{item.serial_no}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{item.patient.name}</span>
                            {item.priority === 'Emergency' && (
                              <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
                                Emergency
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Wait Time: ~{item.estimated_wait} mins</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
