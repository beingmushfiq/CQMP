import React, { useEffect, useState } from 'react';
import { useQueueStore } from '../store/useQueueStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../utils/api';
import { Search, UserPlus, ShieldAlert, ArrowDownUp, PhoneCall, RefreshCw, Printer, Sun, Moon, Trash2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface ReceptionistDashboardProps {
  onBack?: () => void;
}

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({ onBack }) => {
  const { queueDay, items, fetchTodayQueue, registerWalkIn, insertEmergency, reinsertItem, deleteItem } = useQueueStore();
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const [searchPhone, setSearchPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [customSerial, setCustomSerial] = useState<string>('');
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    'f': () => {
      if (selectedDoctorId) document.getElementById('patient-name-input')?.focus();
    },
    'p': () => {
      if (selectedDoctorId) document.getElementById('patient-name-input')?.focus();
    },
    'n': () => {
      if (selectedDoctorId) document.getElementById('patient-name-input')?.focus();
    },
    's': () => {
      if (selectedDoctorId) document.getElementById('custom-serial-input')?.focus();
    },
    'r': () => {
      if (selectedDoctorId && queueDay && !patientRecord?.is_blocked) handleRegister(false);
    },
    'e': () => {
      if (selectedDoctorId && queueDay) handleRegister(true);
    },
    't': () => toggleTheme(),
    'q': () => logout(),
    'b': () => {
      if (!selectedDoctorId && onBack) {
        onBack();
      } else if (selectedDoctorId) {
        setSelectedDoctorId(null);
      }
    },
    'escape': () => {
      if (!selectedDoctorId && onBack) {
        onBack();
      } else if (selectedDoctorId) {
        setSelectedDoctorId(null);
      }
    }
  });

  const handlePrintSlip = (item: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const docName = doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor';
    const spec = doctors.find(d => d.id === selectedDoctorId)?.specialization || '';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>CQMP Serial Receipt</title>
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
          <div>আপনার সিরিয়াল নম্বর / Your Serial:</div>
          <div class="serial">#${item.serial_no}</div>
          <div>অনুমান সময় / Est. Wait:</div>
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
    // Get doctors list
    api.get('/me').then(() => {
      setDoctors([
        { id: 1, name: 'Dr. Sarah Rahman', specialization: 'Cardiologist' }
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
      // Create/find patient — phone is optional
      const patRes = await api.post('/patients', {
        name: patientName,
        ...(searchPhone ? { phone: searchPhone } : {}),
      });
      const patientId = patRes.data.data.id;

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

  const handleReinsert = async (itemId: number) => {
    const pos = prompt('Enter target serial position (e.g. 1 = move to front):');
    if (!pos) return;
    const targetPos = parseInt(pos);
    if (isNaN(targetPos) || targetPos < 1) {
      alert('Please enter a valid position number (1 or higher).');
      return;
    }
    await reinsertItem(itemId, targetPos);
  };


  const handleDelete = async (itemId: number, serialNo: number) => {
    if (!confirm(`Delete queue entry #${serialNo}? This cannot be undone.`)) return;
    try {
      await deleteItem(itemId);
      setToast({ message: `Entry #${serialNo} removed from queue.`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Failed to delete entry.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const waitingItems = items.filter((i) => i.status === 'Waiting').sort((a, b) => a.serial_no - b.serial_no);
  const calledItem = items.find((i) => i.status === 'Called');
  const completedItems = items.filter((i) => i.status === 'Completed').sort((a, b) => a.serial_no - b.serial_no);
  const skippedItems = items.filter((i) => i.status === 'Skipped').sort((a, b) => a.serial_no - b.serial_no);

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
          <h2 className="text-2xl font-bold mb-6">Select active Doctor Queue</h2>
          <div className="space-y-4">
            {doctors.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className="w-full bg-slate-50 dark:bg-slate-950/80 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-800 p-4 rounded-xl transition-all text-left flex justify-between items-center cursor-pointer text-slate-800 dark:text-white relative group"
              >
                <div>
                  <h3 className="font-semibold text-lg">{doc.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{doc.specialization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1.5 py-0.5 rounded opacity-65 group-hover:opacity-100 font-bold">[{idx + 1}]</span>
                  <RefreshCw className="w-5 h-5 text-slate-400 dark:text-slate-550 animate-spin" />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between items-center">
            {onBack && (
              <button onClick={onBack} className="text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-sm font-medium cursor-pointer">
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="CQMP" className="w-9 h-9 rounded-xl shadow-md" />
            <div>
              <h1 className="text-2xl font-bold">Receptionist Desk</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Managing: {doctors.find(d => d.id === selectedDoctorId)?.name}</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
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
            <button onClick={() => logout()} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-4 py-2 rounded-lg text-sm cursor-pointer transition-all text-slate-800 dark:text-white">
              Sign Out [Q]
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Registration Column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <UserPlus className="w-5 h-5 text-indigo-550 dark:text-indigo-400" /> Register Patient
              </h2>

              <div className="space-y-3">
                {/* Name — first, primary field */}
                <div>
                  <label className="block text-slate-550 dark:text-slate-400 text-xs font-semibold mb-1">
                    Patient Name <span className="font-normal text-slate-400 dark:text-slate-500">(Press <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">N</kbd> to focus)</span>
                  </label>
                  <input
                    id="patient-name-input"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-655 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="Enter full name"
                    autoFocus
                  />
                </div>

                {/* Phone — optional, secondary field */}
                <div>
                  <label className="block text-slate-550 dark:text-slate-400 text-xs font-semibold mb-1">
                    Phone Number <span className="font-normal text-slate-400 dark:text-slate-500">Optional — (Press <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">F</kbd> to focus)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="search-phone-input"
                      type="text"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="017xxxxxxxx (optional)"
                    />
                    <button
                      onClick={handleSearchPatient}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 p-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300"
                      title="Look up existing patient by phone"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-550 dark:text-slate-400 text-xs font-semibold mb-1">
                    Custom Serial No. <span className="font-normal text-slate-400 dark:text-slate-500">(Press <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">S</kbd> to focus)</span>
                  </label>
                  <input
                    id="custom-serial-input"
                    type="number"
                    min={1}
                    value={customSerial}
                    onChange={(e) => setCustomSerial(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-655 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="e.g. 15"
                  />
                </div>

                {patientRecord?.is_blocked && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold">Patient Blocked</p>
                      <p>{patientRecord.blocked_reason}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleRegister(false)}
                    disabled={!queueDay || patientRecord?.is_blocked || !patientName}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm cursor-pointer"
                  >
                    Add Queue [R]
                  </button>
                  <button
                    onClick={() => handleRegister(true)}
                    disabled={!queueDay}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm cursor-pointer"
                  >
                    Emergency [E]
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Queue Board */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Queue board</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${queueDay?.status === 'opened' ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    queueDay?.status === 'opened'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {queueDay?.status === 'opened' ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>

              {/* Now Calling / Chamber */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-indigo-550/20 dark:border-indigo-500/20 flex justify-between items-center">
                <div>
                  <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">Now inside chamber</p>
                  {calledItem ? (
                    <div className="mt-2">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{calledItem.patient.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Serial #{calledItem.serial_no} | {calledItem.patient.phone}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 mt-2">Chamber is currently empty</p>
                  )}
                </div>
                <PhoneCall className="w-10 h-10 text-indigo-550/50 dark:text-indigo-400/50" />
              </div>

              {/* Waiting List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Waiting List ({waitingItems.length})</h3>
                <div className="space-y-2">
                  {waitingItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">#{item.serial_no}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.patient.name}</span>
                          {item.priority === 'Emergency' && (
                            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs px-2 py-0.5 rounded font-bold">Emergency</span>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Wait Est: ~{item.estimated_wait} mins</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintSlip(item)}
                          className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-all"
                          title="Print Thermal Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReinsert(item.id)}
                          className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-all"
                          title="Reorder position"
                        >
                          <ArrowDownUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.serial_no)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 p-2 rounded-lg text-rose-500 dark:text-rose-400 hover:text-rose-400 cursor-pointer transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skipped / Completed Tabs */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-3">Skipped Patients ({skippedItems.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {skippedItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-900 dark:text-white">
                        <span>{item.patient.name} (#{item.serial_no})</span>
                        <button
                          onClick={() => handleReinsert(item.id)}
                          className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-xs font-semibold cursor-pointer"
                        >
                          Reinsert
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-emerald-650 dark:text-emerald-400 mb-3">Completed ({completedItems.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {completedItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs flex justify-between">
                        <span>{item.patient.name}</span>
                        <span>#{item.serial_no}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Slide-in Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 dark:bg-emerald-500/25 border-emerald-500/30 text-emerald-600 dark:text-emerald-350'
              : 'bg-rose-500/10 dark:bg-rose-500/25 border-rose-500/30 text-rose-600 dark:text-rose-350'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <p className="font-semibold text-sm">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
