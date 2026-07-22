import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { LogIn, CalendarCheck, Stethoscope, Phone, User, CheckCircle, X, Sun, Moon, Download } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { createPublicApi } from '../utils/api';

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

const publicApi = createPublicApi();

export const LoginForm: React.FC = () => {
  const [showLogin, setShowLogin] = useState(() => window.location.pathname === '/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { get: getSetting } = useSettingsStore();
  const { lang, toggle: toggleLang, t } = useLanguageStore();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    publicApi.get('/public/doctors').then((r) => {
      setDoctors(r.data);
      if (r.data.length === 1) setDoctorId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useKeyboardShortcut({
    'escape': () => {
      if (showLogin) setShowLogin(false);
      else if (result) setResult(null);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLoginError(err.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) { setBookingError(t('login.error.select.doctor')); return; }
    setBookingError('');
    setBookingLoading(true);
    try {
      const r = await publicApi.post('/public/book', {
        name: patientName,
        ...(phone ? { phone } : {}),
        doctor_id: doctorId,
      });
      setResult(r.data);
    } catch (err: any) {
      setBookingError(err.response?.data?.message || t('login.error.booking'));
    } finally {
      setBookingLoading(false);
    }
  };

  const downloadTokenImage = () => {
    if (!result) return;
    
    const selectedDoc = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoc ? selectedDoc.name : 'Doctor';

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(300, 200, 180, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 560, 360);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(getSetting('site_title', 'CQMP').toUpperCase(), 300, 55);

    ctx.fillStyle = '#34d399';
    ctx.font = 'normal 14px sans-serif';
    ctx.fillText(t('login.serial.title'), 300, 100);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 80px sans-serif';
    ctx.fillText(`#${result.serial_no}`, 300, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(result.patient.name, 300, 240);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'normal 14px sans-serif';
    ctx.fillText(`${t('login.canvas.phone')} ${result.patient.phone || 'N/A'}`, 300, 265);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(`${t('login.canvas.doctor')} ${doctorName}`, 300, 310);

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = '#64748b';
    ctx.font = 'normal 12px sans-serif';
    ctx.fillText(`${t('login.canvas.booked.on')} ${dateStr} at ${timeStr}`, 300, 355);

    const link = document.createElement('a');
    link.download = `token_${result.serial_no}_${result.patient.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-dark flex items-center justify-center px-4 py-10 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
          title={lang === 'en' ? 'Switch to Bangla' : 'Switch to English'}
        >
          {lang === 'en' ? 'BN' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer text-[10px] font-semibold"
        >
          <LogIn className="w-3 h-3" /> Staff
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-surface-card/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 p-8 rounded-xl shadow-premium-lg transition-colors duration-300">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20 dark:shadow-indigo-600/30 ring-1 ring-indigo-500/20 dark:ring-indigo-500/30">
                <img src="/favicon.svg" alt="CQMP" className="w-full h-full" />
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              {getSetting('site_title', 'CQMP')} {t('login.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{getSetting('site_subtitle', 'Clinic Queue Management Platform')}</p>
          </div>

          {result ? (
            <div className="text-center space-y-5 py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-400 dark:border-emerald-500/40">
                <CheckCircle className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-300 text-xs">{t('login.serial.your')}</p>
                <p className="text-7xl font-black text-emerald-500 dark:text-emerald-400 my-2">#{result.serial_no}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('login.serial.booked.for')} <span className="text-slate-900 dark:text-white font-semibold">{result.patient.name}</span></p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-transparent rounded-lg p-3 text-[10px] text-slate-500 dark:text-slate-400 text-left space-y-1">
                <p>• {t('login.notice.present')}</p>
                <p>• {t('login.notice.display')}</p>
                <p>• {t('login.notice.receptionist')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={downloadTokenImage}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer text-xs min-h-[48px]"
                  aria-label="Save Token"
                >
                  <Download className="w-4 h-4" /> {t('login.save.token')}
                </button>
                <button
                  type="button"
                  onClick={() => { setResult(null); setPatientName(''); setPhone(''); }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer text-xs min-h-[48px]"
                >
                  {t('login.book.another')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-5">
              {bookingError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs" role="alert">{bookingError}</div>
              )}

              {/* Doctor */}
              <div>
                <label htmlFor="login-doctor-select" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> {t('login.doctor')}
                </label>
                {doctors.length === 1 ? (
                  <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-slate-900 dark:text-white text-xs flex items-center gap-2 min-h-[48px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                    {doctors[0].name} — {doctors[0].specialization}
                  </div>
                ) : (
                  <select
                    id="login-doctor-select"
                    required
                    value={doctorId ?? ''}
                    onChange={(e) => setDoctorId(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none min-h-[48px]"
                  >
                    <option value="" disabled>{t('login.select.doctor')}</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="login-patient-name" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> {t('login.full.name')}
                </label>
                <input
                  id="login-patient-name"
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Rahim Uddin"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[48px]"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="login-patient-phone" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> {t('login.phone')}
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-normal">{t('login.phone.optional')}</span>
                </label>
                <input
                  id="login-patient-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[48px]"
                />
              </div>

              <button
                type="submit"
                disabled={bookingLoading || !doctorId}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg shadow-md shadow-emerald-600/10 dark:shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer text-xs min-h-[52px]"
              >
                {bookingLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    {t('login.book.serial')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Staff Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/50 backdrop-blur-sm" onClick={() => setShowLogin(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-xl shadow-premium-lg transition-colors duration-300">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('login.staff.login')}</h3>
              </div>
              <button
                onClick={() => setShowLogin(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs">{loginError}</div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5" htmlFor="modal-email">{t('login.email')}</label>
                <input
                  id="modal-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="name@cqmp.local or Dr. Sarah"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5" htmlFor="modal-password">{t('login.password')}</label>
                <input
                  id="modal-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md shadow-indigo-600/10 dark:shadow-indigo-600/20 transition-all cursor-pointer text-xs"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('login.button')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
