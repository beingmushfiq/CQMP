import React, { useEffect, useState } from 'react';
import { useQueueStore, type QueueItem } from '../store/useQueueStore';
import { echo } from '../utils/echo';
import api from '../utils/api';
import { Monitor, Volume2, UserCheck, Play, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface TvDisplayProps {
  onBack?: () => void;
}

export const TvDisplay: React.FC<TvDisplayProps> = ({ onBack }) => {
  const { queueDay, items, fetchTodayQueue } = useQueueStore();
  const { theme, toggleTheme } = useThemeStore();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'lobby'>('single');
  const [lobbyQueues, setLobbyQueues] = useState<Record<number, { called: QueueItem | null; waiting: QueueItem[] }>>({});

  useEffect(() => {
    api.get('/me').then(() => {
      const docList = [
        { id: 1, name: 'Dr. Sarah Rahman', specialization: 'Cardiologist' }
      ];
      setDoctors(docList);
    });
  }, []);

  // Fetch all doctor queues for lobby view
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
            waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3)
          };
          
          // Connect Reverb channels for each doctor to update lobby list in real-time
          const qDayId = res.data.queue_day?.id;
          if (qDayId) {
            echo.channel(`queue.${qDayId}`)
              .listen('QueueUpdated', (e: { queue_item: QueueItem }) => {
                if (e.queue_item.status === 'Called') {
                  speakAnnouncement(e.queue_item.serial_no);
                }
                refreshLobbyData();
              })
              .listen('QueueCreated', () => refreshLobbyData())
              .listen('QueueCompleted', () => refreshLobbyData());
          }
        } catch (e) {
          // ignore
        }
      }
      setLobbyQueues(queues);
    };

    if (doctors.length > 0) {
      fetchAllQueues();
    }

    return () => {
      doctors.forEach((doc) => {
        echo.leave(`queue.${doc.id}`);
      });
    };
  }, [viewMode, doctors]);

  const refreshLobbyData = async () => {
    const queues: typeof lobbyQueues = {};
    for (const doc of doctors) {
      const res = await api.get(`/queue/today?doctor_id=${doc.id}`);
      const qItems = res.data.items.data || [];
      queues[doc.id] = {
        called: qItems.find((i: any) => i.status === 'Called') || null,
        waiting: qItems.filter((i: any) => i.status === 'Waiting').slice(0, 3)
      };
    }
    setLobbyQueues(queues);
  };

  useEffect(() => {
    if (!selectedDoctorId || viewMode !== 'single') return;

    fetchTodayQueue(selectedDoctorId);

    const channel = echo.channel(`queue.${queueDay?.id || selectedDoctorId}`);
    channel.listen('QueueUpdated', (e: { queue_item: QueueItem }) => {
      if (e.queue_item.status === 'Called') {
        speakAnnouncement(e.queue_item.serial_no);
      }
    });

    return () => {
      echo.leave(`queue.${queueDay?.id || selectedDoctorId}`);
    };
  }, [selectedDoctorId, queueDay?.id, viewMode]);

  const speakAnnouncement = (serialNo: number) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Helper to generate a bold voice setting (lower pitch, slower rate, max volume)
    const makeUtterance = (text: string, lang: string, rate: number) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate; // Clear, deliberate speed
      utterance.pitch = 0.85; // Slightly lower pitch for a deeper, bolder sound
      utterance.volume = 1.0;  // Full volume
      return utterance;
    };

    const textBn = `সিরিয়াল নম্বর ${serialNo}, অনুগ্রহ করে চিকিৎসকের কক্ষে প্রবেশ করুন।`;
    const textEn = `Serial number ${serialNo}, please enter the doctor's room.`;

    const announce = () => {
      const utteranceBn = makeUtterance(textBn, 'bn-BD', 0.8);
      const utteranceEn = makeUtterance(textEn, 'en-US', 0.85);

      window.speechSynthesis.speak(utteranceBn);
      setTimeout(() => {
        window.speechSynthesis.speak(utteranceEn);
      }, 3500);
    };

    // Speak 3 times with a clear 5-second gap between announcements
    // Loop 1 (0 seconds)
    announce();

    // Loop 2 (8 seconds - allows 3s for loop 1 to finish, followed by a 5s interval)
    setTimeout(() => {
      announce();
    }, 8500);

    // Loop 3 (17 seconds - allows 3s for loop 2 to finish, followed by a 5s interval)
    setTimeout(() => {
      announce();
    }, 17000);
  };

  const handleSelectDoctor = (id: number) => {
    setViewMode('single');
    setSelectedDoctorId(id);
  };



  const activeItem = items.find((i) => i.status === 'Called');
  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no).slice(0, 5);

  if (!selectedDoctorId && viewMode === 'single') {
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
          <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
            <Monitor className="w-6 h-6 text-indigo-500 dark:text-indigo-400" /> Select TV Display
          </h2>
          
          <div className="space-y-4">
            {doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className="w-full bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-800 p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white"
              >
                <div>
                  <h3 className="font-semibold text-lg">{doc.name}</h3>
                  <p className="text-slate-555 dark:text-slate-400 text-sm">{doc.specialization}</p>
                </div>
                <Play className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              </button>
            ))}
          </div>
          {onBack && (
            <button onClick={onBack} className="mt-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-sm font-medium cursor-pointer">
              Back to Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  // Clinic Split view for Lobby
  if (viewMode === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-8 transition-colors duration-200">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-indigo-500 dark:text-indigo-400">
              Master Lobby display board
            </h1>
            <p className="text-slate-555 dark:text-slate-400 text-sm mt-1">Split status display for all active chambers</p>
          </div>
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-850 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all text-sm cursor-pointer"
              >
                Back to Portal
              </button>
            )}
            <button
              onClick={() => { setViewMode('single'); setSelectedDoctorId(null); }}
              className="bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-850 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all text-sm cursor-pointer"
            >
              Change View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 flex-1 items-stretch">
          {doctors.map((doc) => {
            const data = lobbyQueues[doc.id] || { called: null, waiting: [] };
            return (
              <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">{doc.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-6">{doc.specialization}</p>

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 text-center mb-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Calling Now</p>
                    {data.called ? (
                      <div className="mt-3">
                        <div className="text-5xl font-black text-indigo-650 dark:text-indigo-400">#{data.called.serial_no}</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{data.called.patient.name}</div>
                      </div>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 font-medium py-4">No active call</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-3">Up Next</h3>
                  <div className="space-y-2">
                    {data.waiting.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-xs">Queue is empty.</p>
                    ) : (
                      data.waiting.map((waitItem) => (
                        <div key={waitItem.id} className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-850 flex justify-between text-sm">
                          <span className="font-bold text-indigo-650 dark:text-indigo-400">#{waitItem.serial_no}</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{waitItem.patient.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">~{waitItem.estimated_wait}m</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-4 rounded-2xl flex items-center overflow-hidden">
          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md mr-4 shrink-0">
            Notice
          </span>
          <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap animate-pulse">
            Bilingual audio announcements are synthesized dynamically inside the chamber. Please wait.
          </div>
        </div>
      </div>
    );
  }

  // Single Doctor screen
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-8 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
            {doctors.find((d) => d.id === selectedDoctorId)?.name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-semibold uppercase tracking-wider">Live Chamber Display Board</p>
        </div>
        <div className="flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-slate-650 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-500 transition-all text-sm font-semibold cursor-pointer shadow-sm"
            >
              Back to Portal
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSelectedDoctorId(null)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-slate-650 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-500 transition-all text-sm font-semibold cursor-pointer shadow-sm"
          >
            Change View
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-8 flex-1 items-stretch relative z-10">
        {/* Left Side: Calling Now & Doctor Info Panel (Smaller Column) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-850 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[10px] uppercase animate-pulse">
            <Volume2 className="w-4 h-4" /> Live Chamber Broadcast
          </div>

          <div className="w-full mt-4 flex flex-col items-center">
            {/* Doctor Info Card */}
            <div className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex items-center gap-4 mb-6 text-left shadow-sm">
              <img
                src="/doctor_portrait.png"
                alt="Doctor Portrait"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-850 shadow-sm"
              />
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  {doctors.find((d) => d.id === selectedDoctorId)?.name}
                </h3>
                <p className="text-indigo-650 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                  {doctors.find((d) => d.id === selectedDoctorId)?.specialization}
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80 w-full mb-6"></div>

            {/* Now Calling */}
            <div className="space-y-3 w-full py-4">
              <h2 className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Now Calling</h2>
              {activeItem ? (
                <div className="space-y-3">
                  <div className="text-7xl font-black text-indigo-650 dark:text-indigo-400 leading-none filter drop-shadow-[0_4px_12px_rgba(99,102,241,0.2)] dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse">
                    #{activeItem.serial_no}
                  </div>
                  <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{activeItem.patient.name}</div>
                </div>
              ) : (
                <div>
                  <div className="text-xl text-slate-400 dark:text-slate-550 font-extrabold tracking-tight">Please wait...</div>
                  <p className="text-slate-450 dark:text-slate-600 text-xs mt-1">Chamber is preparing</p>
                </div>
              )}
            </div>
          </div>

          {activeItem && (
            <button
              onClick={() => speakAnnouncement(activeItem.serial_no)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/25 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <Volume2 className="w-3.5 h-3.5" /> Repeat Audio Call
            </button>
          )}
        </div>

        {/* Right Side: Up Next Patients List (Bigger Column) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-850 rounded-3xl p-8 flex flex-col shadow-xl">
          <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-650 dark:text-indigo-400" /> Up Next Patients
          </h2>

          <div className="flex-1">
            {waitingItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-600 text-sm font-semibold">No waiting patients.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waitingItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`bg-slate-50 dark:bg-slate-950/70 border p-5 rounded-2xl flex justify-between items-center transition-all ${
                      index === 0
                        ? 'border-indigo-500/50 ring-2 ring-indigo-500/25 bg-indigo-50/20 dark:bg-indigo-950/25 shadow-md scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-4xl font-black ${index === 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-550'}`}>
                        #{item.serial_no}
                      </span>
                      <div>
                        <div className="text-lg font-extrabold text-slate-800 dark:text-white">{item.patient.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">Est. wait: ~{item.estimated_wait} mins</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-3 overflow-hidden shadow-sm relative z-10">
        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 text-sm font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg shrink-0">
          বিশেষ নোটিশ
        </span>
        <div className="text-xl font-bold text-slate-750 dark:text-slate-300 text-center animate-pulse">
          অনুগ্রহ করে ডিসপ্লে স্ক্রিনে আপনার সিরিয়াল নম্বরটি লক্ষ্য করুন। সিরিয়াল পার হয়ে গেলে রিসেপশনিস্টকে জানান।
        </div>
      </div>
    </div>
  );
};
