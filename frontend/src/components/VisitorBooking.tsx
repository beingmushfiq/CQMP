import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarCheck, Stethoscope, Phone, User, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useLanguageStore } from '../store/useLanguageStore';

interface Doctor {
  id: number;
  name: string;
  specialization: string;
}

interface BookingResult {
  serial_no: number;
  message: string;
  patient: { name: string; phone: string };
}

interface Props {
  onBack?: () => void;
}

const publicApi = axios.create({ baseURL: `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'}` });

export const VisitorBooking: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguageStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  // Register Keyboard Shortcuts
  useKeyboardShortcut({
    '1': () => {
      if (doctors[0]) setDoctorId(doctors[0].id);
    },
    '2': () => {
      if (doctors[1]) setDoctorId(doctors[1].id);
    },
    '3': () => {
      if (doctors[2]) setDoctorId(doctors[2].id);
    },
    'n': () => {
      document.getElementById('visitor-name-input')?.focus();
    },
    'f': () => {
      document.getElementById('visitor-phone-input')?.focus();
    },
    'p': () => {
      document.getElementById('visitor-phone-input')?.focus();
    },
    's': () => {
      if (doctorId && name && !loading) {
        publicApi.post('/public/book', { name, phone: phone || undefined, doctor_id: doctorId })
          .then((r) => setResult(r.data))
          .catch((err) => setError(err.response?.data?.message || t('visitor.error.booking')));
      }
    },
    'b': () => {
      if (onBack) onBack();
    },
    'escape': () => {
      if (onBack) onBack();
    }
  });

  useEffect(() => {
    publicApi.get('/public/doctors').then((r) => setDoctors(r.data)).catch(() => {});
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) { setError(t('visitor.error.select.doctor')); return; }
    setError('');
    setLoading(true);
    try {
      const r = await publicApi.post('/public/book', {
        name,
        ...(phone ? { phone } : {}),
        doctor_id: doctorId,
      });
      setResult(r.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('visitor.error.retry'));
    } finally {
      setLoading(false);
    }
  };

  const downloadTokenImage = () => {
    if (!result) return;
    
    const selectedDoc = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoc ? selectedDoc.name : 'Doctor';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Background ---
    // White base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 700, 500);
    
    // Subtle top gradient bar
    const topGrad = ctx.createLinearGradient(0, 0, 700, 0);
    topGrad.addColorStop(0, '#d1fae5'); // emerald-100
    topGrad.addColorStop(1, '#a7f3d0'); // emerald-200
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 700, 120);
    
    // Soft shadow effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.fillRect(40, 40, 620, 420);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 35, 630, 430);
    
    // Main border
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, 630, 430);
    
    // Inner accent border
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, 610, 410);

    // --- Header ---
    ctx.fillStyle = '#065f46'; // emerald-800
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('visitor.canvas.title'), 350, 95);

    // --- Serial Number ---
    // Label
    ctx.fillStyle = '#059669'; // emerald-600
    ctx.font = '600 18px "Segoe UI", sans-serif';
    ctx.fillText(t('visitor.canvas.serial'), 350, 190);
    
    // Number
    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.font = '900 120px "Segoe UI", sans-serif';
    ctx.fillText(`#${result.serial_no}`, 350, 300);

    // --- Patient Info ---
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(result.patient.name, 350, 360);
    
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '500 15px "Segoe UI", sans-serif';
    ctx.fillText(`${t('visitor.canvas.phone')} ${result.patient.phone || 'N/A'}`, 350, 385);

    // --- Doctor Info ---
    ctx.fillStyle = '#334155'; // slate-700
    ctx.font = '600 17px "Segoe UI", sans-serif';
    ctx.fillText(`${t('visitor.canvas.doctor')} ${doctorName}`, 350, 430);

    // --- Timestamp ---
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'normal 13px "Segoe UI", sans-serif';
    ctx.fillText(`${t('visitor.canvas.booked.on')} ${dateStr} at ${timeStr}`, 350, 465);

    // Convert to file download
    const link = document.createElement('a');
    link.download = `token_${result.serial_no}_${result.patient.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-4 relative z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t('visitor.back')}
          </button>
        )}

        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 mb-4">
              <CalendarCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('visitor.title')}</h1>
            <p className="text-slate-400 text-sm mt-1">{t('visitor.subtitle')}</p>
          </div>

          {result ? (
            /* ── Success State ── */
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">{t('visitor.serial.your')}</p>
                <p className="text-7xl font-black text-emerald-400 my-2">#{result.serial_no}</p>
                <p className="text-slate-400 text-sm">{t('visitor.serial.booked.for')} <span className="text-white font-semibold">{result.patient.name}</span></p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-slate-400 text-left space-y-1">
                <p>• {t('visitor.notice.present')}</p>
                <p>• {t('visitor.notice.display')}</p>
                <p>• {t('visitor.notice.receptionist')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={downloadTokenImage}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer min-h-[48px]"
                  aria-label="Download Token Image"
                >
                  <Download className="w-4 h-4" />
                  Save Token
                </button>
                <button
                  type="button"
                  onClick={() => { setResult(null); setName(''); setPhone(''); setDoctorId(null); }}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer min-h-[48px]"
                >
                  Book Another
                </button>
              </div>
            </div>
          ) : (
            /* ── Booking Form ── */
            <form onSubmit={handleBook} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm" role="alert">{error}</div>
              )}

              {/* Doctor Select */}
              <div>
                <label htmlFor="doctor-select" className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" /> {t('visitor.select.doctor')} <span className="text-xs text-slate-500 font-normal ml-auto">{t('visitor.doctor.shortcut')}</span>
                </label>
                <select
                  id="doctor-select"
                  required
                  value={doctorId ?? ''}
                  onChange={(e) => setDoctorId(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none min-h-[52px]"
                >
                  <option value="" disabled>{t('visitor.choose.doctor')}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="visitor-name-input" className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <User className="w-4 h-4 text-emerald-400" /> {t('visitor.full.name')} <span className="text-xs text-slate-500 font-normal ml-auto">{t('visitor.name.shortcut')}</span>
                </label>
                <input
                  id="visitor-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahim Uddin"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[52px]"
                />
              </div>

              {/* Phone — optional */}
              <div>
                <label htmlFor="visitor-phone-input" className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <Phone className="w-4 h-4 text-emerald-400" /> {t('visitor.phone')}
                  <span className="text-xs text-emerald-600 dark:text-emerald-500 font-normal ml-1">{t('visitor.phone.optional')}</span>
                  <span className="text-xs text-slate-500 font-normal ml-auto">{t('visitor.phone.shortcut')}</span>
                </label>
                <input
                  id="visitor-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01712345678 (leave blank if unknown)"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[52px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-4 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer min-h-[56px]"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5" />
                    {t('visitor.confirm.booking')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
