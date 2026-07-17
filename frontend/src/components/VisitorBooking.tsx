import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarCheck, Stethoscope, Phone, User, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

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
          .catch((err) => setError(err.response?.data?.message || 'Booking failed.'));
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
    if (!doctorId) { setError('Please select a doctor.'); return; }
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
      setError(err.response?.data?.message || 'Booking failed. Please try again at the reception desk.');
    } finally {
      setLoading(false);
    }
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
            <ArrowLeft className="w-4 h-4" /> Back to Login [B]
          </button>
        )}

        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 mb-4">
              <CalendarCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Book Appointment</h1>
            <p className="text-slate-400 text-sm mt-1">Walk-in queue booking — today only</p>
          </div>

          {result ? (
            /* ── Success State ── */
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">Your serial number is</p>
                <p className="text-7xl font-black text-emerald-400 my-2">#{result.serial_no}</p>
                <p className="text-slate-400 text-sm">Booked for <span className="text-white font-semibold">{result.patient.name}</span></p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-slate-400 text-left space-y-1">
                <p>• Please be present when your number is called.</p>
                <p>• Check the display board for live updates.</p>
                <p>• Inform the receptionist if you need to leave.</p>
              </div>
              <button
                onClick={() => { setResult(null); setName(''); setPhone(''); setDoctorId(null); }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all cursor-pointer"
              >
                Book Another
              </button>
            </div>
          ) : (
            /* ── Booking Form ── */
            <form onSubmit={handleBook} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">{error}</div>
              )}

              {/* Doctor Select */}
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" /> Select Doctor <span className="text-xs text-slate-500 font-normal ml-auto">(Press [1], [2], etc.)</span>
                </label>
                <select
                  required
                  value={doctorId ?? ''}
                  onChange={(e) => setDoctorId(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="" disabled>-- Choose a doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <User className="w-4 h-4 text-emerald-400" /> Your Full Name <span className="text-xs text-slate-500 font-normal ml-auto">(Press <kbd className="bg-slate-800 px-1 rounded">N</kbd> to focus)</span>
                </label>
                <input
                  id="visitor-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahim Uddin"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Phone — optional */}
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                  <Phone className="w-4 h-4 text-emerald-400" /> Phone Number
                  <span className="text-xs text-emerald-600 dark:text-emerald-500 font-normal ml-1">(Optional)</span>
                  <span className="text-xs text-slate-500 font-normal ml-auto">(Press <kbd className="bg-slate-800 px-1 rounded">F</kbd> to focus)</span>
                </label>
                <input
                  id="visitor-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01712345678 (leave blank if unknown)"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5" />
                    Confirm Booking [S]
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
