import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueStore } from '../store/useQueueStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api from '../utils/api';
import { Search, UserPlus, ShieldAlert, ArrowDownUp, PhoneCall, Printer, Trash2, CheckCircle2, SkipForward, X, AlertTriangle, Bookmark, Pause, Play } from 'lucide-react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

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
  const { queueDay, items, fetchTodayQueue, registerWalkIn, insertEmergency, reinsertItem, deleteItem, completeItem, skipItem, toggleQueuePause, callNext } = useQueueStore();
  const { logout } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const [searchPhone, setSearchPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [customSerial, setCustomSerial] = useState<string>('');
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reorder state
  const [reorderItemId, setReorderItemId] = useState<number | null>(null);
  const [reorderPosition, setReorderPosition] = useState('');
  const reorderInputRef = useRef<HTMLInputElement>(null);

  // Emergency/Reserved modal state
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
          <div class="title font-bold">Metro Health Care</div>
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
      setDoctors([
        { id: 1, name: getSetting('doctor_name', 'Dr. Sarah Rahman'), specialization: getSetting('doctor_specialization', 'Cardiologist') }
      ]);
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

  // ── Reorder: inline UI instead of prompt() ──
  const startReorder = useCallback((itemId: number) => {
    setReorderItemId(itemId);
    setReorderPosition('');
  }, []);

  const cancelReorder = useCallback(() => {
    setReorderItemId(null);
    setReorderPosition('');
  }, []);

  const confirmReorder = useCallback(async () => {
    if (reorderItemId === null || !reorderPosition) return;
    const pos = parseInt(reorderPosition);
    if (isNaN(pos) || pos < 1) {
      setToast({ message: 'Please enter a valid position (1 or higher).', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setConfirmModal({
      message: `Reinsert this patient at position #${pos}?`,
      onConfirm: async () => {
        try {
          await reinsertItem(reorderItemId, pos);
          setToast({ message: `Patient moved to position #${pos}.`, type: 'success' });
          setTimeout(() => setToast(null), 3000);
        } catch {
          setToast({ message: 'Failed to reorder. Please try again.', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
        cancelReorder();
      },
    });
  }, [reorderItemId, reorderPosition, reinsertItem, cancelReorder]);

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

  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no);
  const calledItem = items.find((i) => i.status === 'Called');
  const completedItems = items.filter((i) => i.status === 'Completed').sort((a, b) => a.serial_no - b.serial_no);
  const skippedItems = items.filter((i) => i.status === 'Skipped').sort((a, b) => a.serial_no - b.serial_no);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('stats.waiting'), value: waitingItems.length, color: 'text-amber-500 dark:text-amber-400' },
          { label: 'In Chamber', value: calledItem ? 1 : 0, color: 'text-indigo-500 dark:text-indigo-400' },
          { label: t('stats.completed'), value: completedItems.length, color: 'text-emerald-500 dark:text-emerald-400' },
          { label: t('stats.skipped'), value: skippedItems.length, color: 'text-rose-500 dark:text-rose-400' },
        ].map((stat) => (
          <motion.div key={stat.label} {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-4 rounded-xl shadow-premium">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Registration Column */}
        <div className="space-y-6">
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-xl space-y-4 shadow-premium">
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
                    className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                    placeholder={t('reception.phone.placeholder')}
                  />
                  <button
                    onClick={handleSearchPatient}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-lg cursor-pointer text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    title="Look up patient by phone"
                  >
                    <Search className="w-4 h-4" />
                  </button>
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

              <div className="flex gap-2 pt-2">
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
        </div>

        {/* Center Column - Queue Board */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div {...fadeIn} className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-xl space-y-6 shadow-premium">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Queue Board</h2>
              <div className="flex items-center gap-2">
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
                )}
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
                    <div className="flex gap-2 mt-3">
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
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">#{item.serial_no}</span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white">{item.patient.name}</span>
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
                            title="Reorder position"
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
                          className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Move to position:</span>
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
                              className="w-20 bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                              placeholder="#"
                            />
                            <button
                              onClick={confirmReorder}
                              disabled={!reorderPosition}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Move
                            </button>
                            <button
                              onClick={cancelReorder}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
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
                      {reorderItemId === item.id && (
                        <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Position:</span>
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
                              className="w-16 bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                              placeholder="#"
                            />
                            <button
                              onClick={confirmReorder}
                              disabled={!reorderPosition}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                            >
                              Move
                            </button>
                          </div>
                        </div>
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
