import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore } from '../store/useQueueStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api from '../utils/api';
import { Search, UserPlus, ShieldAlert, ArrowDownUp, PhoneCall, Printer, Trash2, CheckCircle2, SkipForward, X, AlertTriangle, Bookmark, Pause, Play, Volume2, VolumeX, Coffee, Monitor, FileText, Pencil, Check, StopCircle, RotateCcw, ChevronDown } from 'lucide-react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useDisplayModeContext } from './DisplayModeContext';
import { AudioControlPanel } from './AudioControlPanel';


const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

// ── Smart Default: localStorage-based patient memory ──
const SMART_DEFAULT_KEY = 'cqmp_smart_default';

function loadSmartDefault(): { name: string; phone: string } | null {
  try {
    const raw = localStorage.getItem(SMART_DEFAULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSmartDefault(name: string, phone: string) {
  try {
    localStorage.setItem(SMART_DEFAULT_KEY, JSON.stringify({ name, phone }));
  } catch { /* ignore */ }
}

export const ReceptionistDashboard: React.FC = () => {
  const { queueDay, items, fetchTodayQueue, registerWalkIn, insertEmergency, reinsertItem, deleteItem, completeItem, skipItem, toggleQueuePause, callNext, callItem, updateSerial, clearQueue, closeQueue } = useQueueStore();
  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => (a.queue_order ?? a.serial_no) - (b.queue_order ?? b.serial_no));
  const calledItem = items.find((i) => i.status === 'Called');
  const completedItems = items.filter((i) => i.status === 'Completed').sort((a, b) => (b.completed_at ? new Date(b.completed_at).getTime() - new Date(a.completed_at || 0).getTime() : (a.queue_order ?? a.serial_no) - (b.queue_order ?? b.serial_no)));
  const skippedItems = items.filter((i) => i.status === 'Skipped').sort((a, b) => (a.queue_order ?? a.serial_no) - (b.queue_order ?? b.serial_no));
  const { logout } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const [searchPhone, setSearchPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [ageNum, setAgeNum] = useState('');
  const [ageUnit, setAgeUnit] = useState<'Years' | 'Months'>('Years');
  const [customSerial, setCustomSerial] = useState<string>('');
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inline name edit state
  const [editingNameItemId, setEditingNameItemId] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const editingNameInputRef = useRef<HTMLInputElement>(null);

  // Inline custom serial edit state
  const [editingSerialItemId, setEditingSerialItemId] = useState<number | null>(null);
  const [editingSerialValue, setEditingSerialValue] = useState('');
  const editingSerialInputRef = useRef<HTMLInputElement>(null);

  // Chamber conflict modal state (when calling someone while chamber has patient)
  const [callConflictModal, setCallConflictModal] = useState<{ targetItem: any } | null>(null);

  // Reorder state
  const [reorderItemId, setReorderItemId] = useState<number | null>(null);
  const [reorderPosition, setReorderPosition] = useState('');
  const reorderInputRef = useRef<HTMLInputElement>(null);

  // Emergency/Reserved modal state
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // Clear Menu Dropdown state
  const [showClearMenu, setShowClearMenu] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [displayLoading, setDisplayLoading] = useState(false);

  const handleClearQueue = (target: 'all' | 'waiting' | 'completed' | 'skipped') => {
    setShowClearMenu(false);
    const messages = {
      waiting: t('reception.confirm.clear.waiting'),
      completed: t('reception.confirm.clear.completed'),
      skipped: t('reception.confirm.clear.skipped'),
      all: t('reception.confirm.clear.all'),
    };
    setConfirmModal({
      message: messages[target],
      onConfirm: async () => {
        try {
          await clearQueue(target);
          setToast({ message: `Queue cleared (${target}).`, type: 'success' });
          setTimeout(() => setToast(null), 3000);
        } catch {
          setToast({ message: 'Failed to clear queue.', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
      },
    });
  };

  const handleEndQueue = () => {
    setConfirmModal({
      message: t('reception.confirm.end.queue'),
      onConfirm: async () => {
        try {
          await closeQueue();
          setToast({ message: 'Queue session ended for today.', type: 'success' });
          setTimeout(() => setToast(null), 3000);
        } catch {
          setToast({ message: 'Failed to end queue session.', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
      },
    });
  };
  const { mode: displayMode, setMode: setDisplayMode, resume: resumeDisplay } = useDisplayModeContext();

  // Audio settings & logic
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('cqmp_receptionist_audio_enabled');
    return saved === 'true'; // defaults to false
  });
  const lastAnnouncedSerialRef = useRef<number | null>(null);

  const renamePatient = async (patientId: number, newName: string) => {
    if (!newName.trim()) return;
    try {
      await api.put(`/patients/${patientId}`, { name: newName.trim() });
      if (selectedDoctorId) fetchTodayQueue(selectedDoctorId);
      setToast({ message: `Name updated to "${newName.trim()}".`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to update patient name.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setEditingNameItemId(null);
      setEditingNameValue('');
    }
  };

  const handleSaveSerial = async (item: any, newSerialStr: string) => {
    const val = parseInt(newSerialStr.trim());
    if (isNaN(val) || val < 1) {
      setToast({ message: 'Please enter a valid serial number (1 or greater).', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      await updateSerial(item.id, val);
      setToast({ message: `Serial number updated to #${val}.`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to update serial number.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setEditingSerialItemId(null);
      setEditingSerialValue('');
    }
  };

  const handleInitiateCall = (targetItem: any) => {
    if (calledItem && calledItem.id !== targetItem.id) {
      setCallConflictModal({ targetItem });
    } else {
      performCall(targetItem.id);
    }
  };

  const performCall = async (targetItemId: number, prevAction: 'waiting' | 'complete' | 'skip' = 'waiting') => {
    try {
      await callItem(targetItemId, prevAction);
      const target = items.find(i => i.id === targetItemId);
      if (target) {
        speakAnnouncement(target.serial_no, true);
        setToast({ message: `Calling patient ${target.patient.name} (#${target.serial_no})!`, type: 'success' });
      }
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to call patient.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setCallConflictModal(null);
    }
  };

  // Focus inline inputs when they appear
  useEffect(() => {
    if (editingNameItemId !== null) {
      setTimeout(() => editingNameInputRef.current?.focus(), 50);
    }
  }, [editingNameItemId]);

  useEffect(() => {
    if (editingSerialItemId !== null) {
      setTimeout(() => editingSerialInputRef.current?.focus(), 50);
    }
  }, [editingSerialItemId]);

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

  useEffect(() => {
    if (!calledItem) return;
    if (calledItem.serial_no !== lastAnnouncedSerialRef.current) {
      lastAnnouncedSerialRef.current = calledItem.serial_no;
      speakAnnouncement(calledItem.serial_no);
    }
  }, [calledItem]);

  // Smart Default: load last used patient data on mount
  useEffect(() => {
    const saved = loadSmartDefault();
    if (saved) {
      setPatientName(saved.name);
      setSearchPhone(saved.phone);
    }
  }, []);

  // Focus reorder input when it appears
  useEffect(() => {
    if (reorderItemId !== null) {
      setTimeout(() => reorderInputRef.current?.focus(), 50);
    }
  }, [reorderItemId]);

  // Register Keyboard Shortcuts
  useKeyboardShortcut({
    '1': () => { if (!selectedDoctorId && doctors[0]) handleSelectDoctor(doctors[0].id); },
    '2': () => { if (!selectedDoctorId && doctors[1]) handleSelectDoctor(doctors[1].id); },
    '3': () => { if (!selectedDoctorId && doctors[2]) handleSelectDoctor(doctors[2].id); },
    'f': () => { if (selectedDoctorId) document.getElementById('patient-name-input')?.focus(); },
    'p': () => { if (selectedDoctorId) document.getElementById('patient-name-input')?.focus(); },
    'n': () => { if (selectedDoctorId) document.getElementById('patient-name-input')?.focus(); },
    's': () => { if (selectedDoctorId) document.getElementById('custom-serial-input')?.focus(); },
    'r': () => { if (selectedDoctorId && queueDay && !patientRecord?.is_blocked) handleRegister(false); },
    'e': () => { if (selectedDoctorId && queueDay) setShowPriorityModal(true); },
    'q': () => logout(),
    'escape': () => {
      if (showPriorityModal) setShowPriorityModal(false);
      else if (reorderItemId !== null) cancelReorder();
    },
  });

  const handlePrintSlip = (item: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const docName = doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor';
    const spec = doctors.find(d => d.id === selectedDoctorId)?.specialization || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${getSetting('site_title', 'CQMP')} Serial Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; text-align: center; padding: 20px; color: #000; }
            .serial { font-size: 40px; font-weight: bold; margin: 15px 0; }
            .divider { border-top: 1px dashed #000; margin: 15px 0; }
            .title { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="title font-bold">${getSetting('site_title', 'Clinic Queue System')}</div>
          <div class="divider"></div>
          <div>চিকিৎসক / Doctor:</div>
          <div style="font-weight: bold;">${docName}</div>
          <div style="font-size: 12px; color: #555;">${spec}</div>
          <div class="divider"></div>
          <div>আপনার সিরিয়াল নম্বর / Your Serial:</div>
          <div class="serial">#${item.serial_no}</div>
          <div>অনুমান সময় / Est. Wait:</div>
          <div style="font-weight: bold;">~${item.estimated_wait} Mins</div>
          <div class="divider"></div>
          <div style="font-size: 10px;">অপেক্ষা করার জন্য ধন্যবাদ। / Thank you.</div>
          <div style="font-size: 8px; color: #666; margin-top: 6px; letter-spacing: 0.5px; text-transform: uppercase;">POWERED BY DEVCENTERPOINT</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    api.get('/me').then(() => {
      const list = [
        { id: 1, name: getSetting('doctor_name', 'Dr. Muhammad Asif Sattar'), specialization: getSetting('doctor_specialization', 'General Practitioner') }
      ];
      setDoctors(list);
      if (list.length === 1) handleSelectDoctor(list[0].id);
    });
  }, []);

  const handleSelectDoctor = (docId: number) => {
    setSelectedDoctorId(docId);
    fetchTodayQueue(docId);
  };

  const handleSearchPatient = async () => {
    if (!searchPhone) return;
    try {
      const response = await api.get(`/patients?search=${searchPhone}`);
      const list = response.data.data;
      if (list.length > 0) {
        setPatientRecord(list[0]);
        setPatientName(list[0].name);
        // Smart Default: save this lookup for next time
        saveSmartDefault(list[0].name, searchPhone);
      } else {
        setPatientRecord(null);
        setPatientName('');
      }
    } catch (e) {
      setPatientRecord(null);
    }
  };

  const handleRegister = async (emergency = false) => {
    if (!patientName || !selectedDoctorId) return;
    try {
      const patRes = await api.post('/patients', {
        name: patientName,
        ...(searchPhone ? { phone: searchPhone } : {}),
        ...(ageNum.trim() ? { notes: `Age: ${ageNum.trim()} ${ageUnit}` } : {}),
      });
      const patientId = patRes.data.data.id;

      // Smart Default: save the last registered patient
      saveSmartDefault(patientName, searchPhone);

      if (emergency) {
        await insertEmergency(patientId);
      } else {
        const serial = customSerial ? parseInt(customSerial) : undefined;
        await registerWalkIn(patientId, serial);
      }

      const registeredName = patientName;
      setSearchPhone('');
      setPatientName('');
      setCustomSerial('');
      setAgeNum('');
      setAgeUnit('Years');
      setPatientRecord(null);
      fetchTodayQueue(selectedDoctorId);

      setToast({ message: `Patient ${registeredName} successfully added to the queue!`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Patient is blocked or registration failed.';
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ── Reserved/Emergency slot (no name needed) ──
  const handlePrioritySlot = async (priority: 'Reserved' | 'Emergency') => {
    if (!selectedDoctorId || !queueDay) return;
    setShowPriorityModal(false);

    const label = priority === 'Reserved' ? 'Reserved Slot' : 'Emergency Patient';

    try {
      // Create a generic patient record (no name/phone required)
      const patRes = await api.post('/patients', { name: label });
      const patientId = patRes.data.data.id;

      if (priority === 'Emergency') {
        await insertEmergency(patientId);
      } else {
        await registerWalkIn(patientId, undefined, 'Reserved');
      }

      fetchTodayQueue(selectedDoctorId);
      setToast({ message: `${label} added to the queue!`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Failed to add ${label}.`;
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ── Reorder / Reinsert handler ──
  const startReorder = useCallback((itemId: number) => {
    setReorderItemId(itemId);
    setReorderPosition('');
  }, []);

  const cancelReorder = useCallback(() => {
    setReorderItemId(null);
    setReorderPosition('');
  }, []);

  const executeReorder = useCallback(async (itemId: number, pos: number, labelDescription?: string) => {
    const reorderedItem = items.find(i => i.id === itemId);
    const itemLabel = reorderedItem ? `${reorderedItem.patient.name} (#${reorderedItem.serial_no})` : 'Patient';
    try {
      await reinsertItem(itemId, pos);
      const desc = labelDescription || (pos === 1 ? 'the front of the queue (next in line)' : `queue position #${pos}`);
      setToast({ message: `Moved ${itemLabel} to ${desc}.`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to reorder. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
    cancelReorder();
  }, [items, reinsertItem, cancelReorder]);

  const confirmReorder = useCallback(async () => {
    if (reorderItemId === null || reorderPosition === '') return;
    const pos = parseInt(reorderPosition);
    if (isNaN(pos) || pos < 1) {
      setToast({ message: 'Please enter a valid queue position (1 or greater).', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    await executeReorder(reorderItemId, pos);
  }, [reorderItemId, reorderPosition, executeReorder]);

  const handleDelete = async (itemId: number, serialNo: number) => {
    setConfirmModal({
      message: `Delete queue entry #${serialNo}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteItem(itemId);
          setToast({ message: `Entry #${serialNo} removed from queue.`, type: 'success' });
          setTimeout(() => setToast(null), 3000);
        } catch {
          setToast({ message: 'Failed to delete entry.', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
      },
    });
  };

  const AudioToggle = () => (
    <button
      onClick={() => {
        const nextState = !isAudioEnabled;
        setIsAudioEnabled(nextState);
        localStorage.setItem('cqmp_receptionist_audio_enabled', String(nextState));
      }}
      className={`p-1 px-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1.5 ${
        isAudioEnabled
          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30'
      }`}
      title={isAudioEnabled ? t('tv.audio.on') : t('tv.audio.off')}
    >
      {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      <span className="text-[10px] font-bold select-none leading-none">
        {isAudioEnabled ? t('tv.audio.on') : t('tv.audio.off')}
      </span>
    </button>
  );

  // Doctor Selection Screen
  if (!selectedDoctorId) {
    return (
      <div className="flex items-center justify-center h-full p-6">
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
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-700 p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white relative group"
              >
                <div>
                  <h3 className="font-semibold text-sm">{doc.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">{doc.specialization}</p>
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">[{idx + 1}]</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Queue Management Interface
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: t('stats.waiting'), value: waitingItems.length, color: 'text-amber-500 dark:text-amber-400' },
          { label: 'In Chamber', value: calledItem ? 1 : 0, color: 'text-indigo-500 dark:text-indigo-400' },
          { label: t('stats.completed'), value: completedItems.length, color: 'text-emerald-500 dark:text-emerald-400' },
          { label: t('stats.skipped'), value: skippedItems.length, color: 'text-rose-500 dark:text-rose-400' },
        ].map((stat) => (
          <motion.div key={stat.label} {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-3.5 md:p-4 rounded-xl shadow-premium">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
            <p className={`text-xl md:text-2xl font-black mt-0.5 md:mt-1 ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Patient Registration Column */}
        <div className="space-y-4 md:space-y-6">
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-4 md:p-6 rounded-xl space-y-4 shadow-premium">
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <UserPlus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {t('reception.register')}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {t('reception.name')} <span className="font-normal text-slate-400 dark:text-slate-600">(N)</span>
                </label>
                <input
                  id="patient-name-input"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                  placeholder={t('reception.name.placeholder')}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {t('reception.phone')} <span className="font-normal text-slate-400 dark:text-slate-600">{t('reception.phone.optional')}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="search-phone-input"
                    type="text"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                    placeholder={t('reception.phone.placeholder')}
                  />
                  <button
                    onClick={handleSearchPatient}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-lg cursor-pointer text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0"
                    title="Look up patient by phone"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Age — optional */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Age <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={ageNum}
                    onChange={(e) => setAgeNum(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-20 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <select
                    value={ageUnit}
                    onChange={(e) => setAgeUnit(e.target.value as 'Years' | 'Months')}
                    className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="Years">Years</option>
                    <option value="Months">Months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {t('reception.custom.serial')} <span className="font-normal text-slate-400 dark:text-slate-600">(S)</span>
                </label>
                <input
                  id="custom-serial-input"
                  type="number"
                  min={1}
                  value={customSerial}
                  onChange={(e) => setCustomSerial(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                  placeholder="e.g. 15"
                />
              </div>

              {patientRecord?.is_blocked && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="font-bold">{t('reception.patient.blocked')}</p>
                    <p>{patientRecord.blocked_reason}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => handleRegister(false)}
                  disabled={!queueDay || patientRecord?.is_blocked || !patientName}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-all"
                >
                  Add Queue [R]
                </button>
                <button
                  onClick={() => setShowPriorityModal(true)}
                  disabled={!queueDay}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-xs cursor-pointer shadow-md shadow-rose-600/10 transition-all"
                >
                  Emergency [E]
                </button>
              </div>
            </div>
          </motion.div>

          {/* Display Mode Controls */}
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-4 md:p-5 rounded-xl space-y-3 shadow-premium">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Display Controls
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-[10px]">Controls the waiting room TV display</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  setDisplayLoading(true);
                  try { await resumeDisplay(); setToast({ message: 'TV Display set to Normal', type: 'success' }); }
                  catch (err: any) { setToast({ message: err?.response?.data?.message || 'Failed to set Display mode', type: 'error' }); }
                  finally { setDisplayLoading(false); }
                }}
                disabled={displayLoading || displayMode === 'NORMAL'}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                  displayMode === 'NORMAL'
                    ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
                }`}
              >
                <Play className="w-3.5 h-3.5" /> Normal
              </button>
              <button
                onClick={async () => {
                  setDisplayLoading(true);
                  try { await setDisplayMode('BREAK'); setToast({ message: 'TV Display set to Break Mode', type: 'success' }); }
                  catch (err: any) { setToast({ message: err?.response?.data?.message || 'Failed to set Break mode', type: 'error' }); }
                  finally { setDisplayLoading(false); }
                }}
                disabled={displayLoading || displayMode === 'BREAK'}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                  displayMode === 'BREAK'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" /> Break
              </button>
              <button
                onClick={async () => {
                  setDisplayLoading(true);
                  try { await setDisplayMode('REPORT'); setToast({ message: 'TV Display set to Report Mode', type: 'success' }); }
                  catch (err: any) { setToast({ message: err?.response?.data?.message || 'Failed to set Report mode', type: 'error' }); }
                  finally { setDisplayLoading(false); }
                }}
                disabled={displayLoading || displayMode === 'REPORT'}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                  displayMode === 'REPORT'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200 dark:border-slate-700 hover:border-indigo-500/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Report
              </button>
              <button
                onClick={async () => {
                  setDisplayLoading(true);
                  try { await setDisplayMode('EMERGENCY'); setToast({ message: 'TV Display set to Emergency Mode', type: 'success' }); }
                  catch (err: any) { setToast({ message: err?.response?.data?.message || 'Failed to set Emergency mode', type: 'error' }); }
                  finally { setDisplayLoading(false); }
                }}
                disabled={displayLoading || displayMode === 'EMERGENCY'}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] min-h-[44px] border ${
                  displayMode === 'EMERGENCY'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
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

        {/* Center Column - Queue Board */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-4 md:p-6 rounded-xl space-y-4 md:space-y-6 shadow-premium">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Queue Board</h2>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  queueDay?.status === 'opened' ? 'bg-emerald-400'
                  : queueDay?.status === 'paused' ? 'bg-amber-400'
                  : 'bg-rose-500'
                }`}></span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  queueDay?.status === 'opened'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : queueDay?.status === 'paused'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {queueDay?.status === 'opened' ? 'Open' : queueDay?.status === 'paused' ? 'Paused' : 'Closed'}
                </span>
                {queueDay && (
                  <>
                    <button
                      onClick={toggleQueuePause}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        queueDay.status === 'opened'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {queueDay.status === 'opened' ? <><Pause className="w-3 h-3" /> {t('reception.pause')}</> : <><Play className="w-3 h-3" /> {t('reception.resume')}</>}
                    </button>

                    {/* Clear Queue Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowClearMenu(!showClearMenu)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                        title={t('reception.clear.queue')}
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>{t('reception.clear.queue')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showClearMenu && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                          <button
                            onClick={() => handleClearQueue('waiting')}
                            disabled={waitingItems.length === 0 && !calledItem}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-40 cursor-pointer flex items-center justify-between"
                          >
                            <span>{t('reception.clear.waiting')}</span>
                            <span className="text-[10px] text-slate-400 font-bold">({waitingItems.length + (calledItem ? 1 : 0)})</span>
                          </button>
                          <button
                            onClick={() => handleClearQueue('completed')}
                            disabled={completedItems.length === 0}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-40 cursor-pointer flex items-center justify-between"
                          >
                            <span>{t('reception.clear.completed')}</span>
                            <span className="text-[10px] text-slate-400 font-bold">({completedItems.length})</span>
                          </button>
                          <button
                            onClick={() => handleClearQueue('skipped')}
                            disabled={skippedItems.length === 0}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-40 cursor-pointer flex items-center justify-between"
                          >
                            <span>{t('reception.clear.skipped')}</span>
                            <span className="text-[10px] text-slate-400 font-bold">({skippedItems.length})</span>
                          </button>
                          <div className="border-t border-slate-200 dark:border-slate-700/80 my-1" />
                          <button
                            onClick={() => handleClearQueue('all')}
                            disabled={items.length === 0}
                            className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40 font-semibold cursor-pointer flex items-center justify-between"
                          >
                            <span>{t('reception.clear.all')}</span>
                            <span className="text-[10px] text-rose-400 font-bold">({items.length})</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* End Queue for Today Button */}
                    <button
                      onClick={handleEndQueue}
                      disabled={queueDay.status === 'closed'}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 disabled:opacity-40 cursor-pointer transition-all"
                      title={t('reception.end.queue')}
                    >
                      <StopCircle className="w-3 h-3" />
                      <span>{t('reception.end.queue')}</span>
                    </button>
                  </>
                )}
                <AudioToggle />
              </div>
            </div>

            {/* Now Calling / Chamber */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-indigo-500/20 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Now inside chamber</p>
                {calledItem ? (
                  <div className="mt-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{calledItem.patient.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Serial #{calledItem.serial_no} | {calledItem.patient.phone}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => completeItem(calledItem.id)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shadow-md shadow-emerald-600/10 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </button>
                      <button
                        onClick={() => skipItem(calledItem.id)}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shadow-md shadow-amber-500/10 transition-all"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                      </button>
                      <button
                        onClick={() => speakAnnouncement(calledItem.serial_no, true)}
                        className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                        title="Repeat Voice Announcement"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Repeat Call
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-slate-400 dark:text-slate-500 text-xs mb-3">{t('reception.chamber.empty')}</p>
                    {waitingItems.length > 0 && queueDay?.status === 'opened' && (
                      <button
                        onClick={callNext}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer shadow-md shadow-indigo-600/10 transition-all"
                      >
                        <PhoneCall className="w-4 h-4" /> {t('doctor.call.next')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <PhoneCall className="w-8 h-8 text-indigo-400/40 dark:text-indigo-400/30" />
            </div>

            {/* Waiting List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('reception.waiting')} ({waitingItems.length})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <AnimatePresence>
                  {waitingItems.map((item, idx) => {
                    const showPlaceholder = (idx + 1) % 4 === 0 && idx < waitingItems.length - 1;
                    return (
                    <React.Fragment key={item.id}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border ${
                        item.priority === 'Emergency'
                          ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
                          : item.priority === 'Reserved'
                          ? 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            {editingSerialItemId === item.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-indigo-500">#</span>
                                <input
                                  ref={editingSerialInputRef}
                                  type="number"
                                  min={1}
                                  value={editingSerialValue}
                                  onChange={(e) => setEditingSerialValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveSerial(item, editingSerialValue);
                                    if (e.key === 'Escape') { setEditingSerialItemId(null); setEditingSerialValue(''); }
                                  }}
                                  className="w-16 bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveSerial(item, editingSerialValue)}
                                  className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                                  title="Save Serial"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => { setEditingSerialItemId(null); setEditingSerialValue(''); }}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group/serial">
                                <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">#{item.serial_no}</span>
                                <button
                                  onClick={() => { setEditingSerialItemId(item.id); setEditingSerialValue(String(item.serial_no)); }}
                                  className="opacity-0 group-hover/serial:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-500 cursor-pointer transition-all"
                                  title="Position Custom Serial #"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            {editingNameItemId === item.id ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                  ref={editingNameInputRef}
                                  type="text"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') renamePatient(item.patient.id, editingNameValue);
                                    if (e.key === 'Escape') { setEditingNameItemId(null); setEditingNameValue(''); }
                                  }}
                                  className="flex-1 bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-0"
                                />
                                <button
                                  onClick={() => renamePatient(item.patient.id, editingNameValue)}
                                  disabled={!editingNameValue.trim()}
                                  className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer transition-all"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => { setEditingNameItemId(null); setEditingNameValue(''); }}
                                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group/name">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white">{item.patient.name}</span>
                                <button
                                  onClick={() => { setEditingNameItemId(item.id); setEditingNameValue(item.patient.name); }}
                                  className="opacity-0 group-hover/name:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-500 cursor-pointer transition-all"
                                  title="Edit patient name"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            {item.priority === 'Emergency' && (
                              <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Emergency</span>
                            )}
                            {item.priority === 'Reserved' && (
                              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Reserved</span>
                            )}
                          </div>

                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleInitiateCall(item)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold"
                            title={`Call #${item.serial_no} ${item.patient.name} into chamber now`}
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => completeItem(item.id)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 p-1.5 rounded-lg text-emerald-500 dark:text-emerald-400 cursor-pointer transition-all"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => skipItem(item.id)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 p-1.5 rounded-lg text-amber-500 dark:text-amber-400 cursor-pointer transition-all"
                            title="Skip patient"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintSlip(item)}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
                            title="Print Thermal Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startReorder(item.id)}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
                            title="Reorder queue position"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.serial_no)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 p-1.5 rounded-lg text-rose-500 dark:text-rose-400 cursor-pointer transition-all"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {reorderItemId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            <span>{t('reception.move.to')}</span>
                            <button
                              onClick={cancelReorder}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                              title={t('reception.cancel')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => executeReorder(item.id, 1, 'the front of the queue (next in line)')}
                              className="py-1 px-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Move to position #1"
                            >
                              ⚡ {t('reception.reinsert.next')}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const targetPos = Math.min(3, waitingItems.length);
                                executeReorder(item.id, targetPos, `position #${targetPos}`);
                              }}
                              className="py-1 px-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Move after 2 patients"
                            >
                              ⏱️ {t('reception.reinsert.after2')}
                            </button>

                            <button
                              type="button"
                              onClick={() => executeReorder(item.id, waitingItems.length, 'the end of the queue')}
                              className="py-1 px-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Move to the back of the waiting line"
                            >
                              🔻 {t('reception.reinsert.end')}
                            </button>

                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">{t('reception.reinsert.custom')}:</span>
                              <input
                                ref={reorderInputRef}
                                type="number"
                                min={1}
                                value={reorderPosition}
                                onChange={(e) => setReorderPosition(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmReorder();
                                  if (e.key === 'Escape') cancelReorder();
                                }}
                                className="w-14 bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                placeholder="#"
                              />
                              <button
                                onClick={confirmReorder}
                                disabled={!reorderPosition}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              >
                                {t('reception.move')}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Visual placeholder slot after every 4 items */}
                    {showPlaceholder && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 flex items-center justify-center gap-2"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">
                          Reserved / Emergency Slot
                        </span>
                      </motion.div>
                    )}
                    </React.Fragment>
                    );
                  })}
                </AnimatePresence>
                {waitingItems.length === 0 && (
                  <p className="text-slate-400 dark:text-slate-500 text-xs py-4 text-center">No waiting patients.</p>
                )}
              </div>
            </div>

            {/* Skipped / Completed */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200/80 dark:border-slate-700/80 pt-4">
              <div>
                <h3 className="text-xs font-bold text-amber-500 dark:text-amber-400 mb-2">Skipped ({skippedItems.length})</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {skippedItems.map((item) => (
                    <div key={item.id}>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-slate-700 dark:text-slate-300">{item.patient.name} (#{item.serial_no})</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleInitiateCall(item)}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-[10px] font-bold cursor-pointer flex items-center gap-0.5"
                            title="Call this patient into chamber immediately"
                          >
                            <PhoneCall className="w-3 h-3" /> Call
                          </button>
                          {reorderItemId === item.id ? (
                            <button
                              onClick={cancelReorder}
                              className="text-red-500 dark:text-red-400 hover:text-red-600 text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => startReorder(item.id)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-[10px] font-bold cursor-pointer"
                            >
                              Reinsert
                            </button>
                          )}
                        </div>
                      </div>
                      {reorderItemId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-2.5 bg-indigo-50/90 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900 dark:text-indigo-300">
                            <span>Reinsert where in queue?</span>
                            <button
                              onClick={cancelReorder}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                              title={t('reception.cancel')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => executeReorder(item.id, 1, 'the front of the queue (next in line)')}
                              className="py-1 px-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all text-center cursor-pointer shadow-xs active:scale-95"
                              title="Reinsert at Position #1 (Next in line)"
                            >
                              ⚡ {t('reception.reinsert.next')}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const targetPos = Math.min(3, waitingItems.length + 1);
                                executeReorder(item.id, targetPos, `position #${targetPos} (after 2 patients)`);
                              }}
                              className="py-1 px-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all text-center cursor-pointer shadow-xs active:scale-95"
                              title="Reinsert after 2 patients"
                            >
                              ⏱️ {t('reception.reinsert.after2')}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const targetPos = waitingItems.length + 1;
                                executeReorder(item.id, targetPos, 'the end of the queue');
                              }}
                              className="py-1 px-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-all text-center cursor-pointer shadow-xs active:scale-95"
                              title="Reinsert at the back of the line"
                            >
                              🔻 {t('reception.reinsert.end')}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-indigo-100 dark:border-indigo-900/50">
                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">{t('reception.reinsert.custom')}:</span>
                            <input
                              ref={reorderInputRef}
                              type="number"
                              min={1}
                              value={reorderPosition}
                              onChange={(e) => setReorderPosition(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmReorder();
                                if (e.key === 'Escape') cancelReorder();
                              }}
                              className="w-14 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1.5 py-0.5 text-[10px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="1=front"
                            />
                            <button
                              type="button"
                              onClick={confirmReorder}
                              disabled={!reorderPosition}
                              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10px] font-bold rounded cursor-pointer transition-all"
                            >
                              {t('reception.move')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-500 dark:text-emerald-400 mb-2">{t('reception.completed')} ({completedItems.length})</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {completedItems.map((item) => (
                    <div key={item.id} className="bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400">{item.patient.name}</span>
                      <span className="text-slate-500 dark:text-slate-500">#{item.serial_no}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Priority Selection Modal */}
      <AnimatePresence>
        {showPriorityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPriorityModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md mx-4 bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-premium-lg p-6"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Priority Type</h3>
                <button
                  onClick={() => setShowPriorityModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                No patient name required. Choose the slot type to add directly to the queue.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePrioritySlot('Reserved')}
                  className="flex flex-col items-center gap-3 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 p-5 rounded-xl cursor-pointer transition-all group"
                >
                  <Bookmark className="w-8 h-8 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Reserved</p>
                    <p className="text-[10px] text-indigo-500/70 dark:text-indigo-400/60 mt-0.5">Pre-booked slot</p>
                  </div>
                </button>
                <button
                  onClick={() => handlePrioritySlot('Emergency')}
                  className="flex flex-col items-center gap-3 bg-rose-50 dark:bg-rose-600/10 hover:bg-rose-100 dark:hover:bg-rose-600/20 border border-rose-200 dark:border-rose-500/20 p-5 rounded-xl cursor-pointer transition-all group"
                >
                  <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Emergency</p>
                    <p className="text-[10px] text-rose-500/70 dark:text-rose-400/60 mt-0.5">Urgent priority</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Call Conflict Modal (when someone is already in chamber) */}
      <AnimatePresence>
        {callConflictModal && calledItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setCallConflictModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700 rounded-2xl shadow-premium-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Patient Already in Chamber</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{calledItem.patient.name}</span> (#{calledItem.serial_no}) is currently in consultation.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/40 rounded-xl mb-5 text-xs text-brand-800 dark:text-brand-300">
                You are about to call <span className="font-bold">{callConflictModal.targetItem.patient.name}</span> (Serial #{callConflictModal.targetItem.serial_no}). Please select what to do with <span className="font-bold">{calledItem.patient.name}</span>:
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => performCall(callConflictModal.targetItem.id, 'waiting')}
                  className="w-full py-2.5 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Return {calledItem.patient.name} back to Waiting queue
                  </span>
                  <span className="text-[11px] opacity-75">Keep turn</span>
                </button>

                <button
                  type="button"
                  onClick={() => performCall(callConflictModal.targetItem.id, 'complete')}
                  className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Mark {calledItem.patient.name} as Completed
                  </span>
                  <span className="text-[11px] opacity-75">Done</span>
                </button>

                <button
                  type="button"
                  onClick={() => performCall(callConflictModal.targetItem.id, 'skip')}
                  className="w-full py-2.5 px-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Mark {calledItem.patient.name} as Skipped
                  </span>
                  <span className="text-[11px] opacity-75">Absent</span>
                </button>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCallConflictModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-premium-lg p-6 w-full max-w-sm text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-5">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    await action();
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-premium-lg backdrop-blur-md border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
