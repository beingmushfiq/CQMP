import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import {
  LogIn, CalendarCheck, Stethoscope, Phone, User,
  CheckCircle, X, Sun, Moon, Download, Eye, EyeOff,
  Heart, Clock, ShieldCheck,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { createPublicApi } from '../utils/api';

interface Doctor { id: number; name: string; specialization: string; }
interface BookingResult { serial_no: number; message: string; patient: { name: string; phone: string }; }

const publicApi = createPublicApi();

export const LoginForm: React.FC = () => {
  const [showLogin, setShowLogin] = useState(() => window.location.pathname === '/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { get: getSetting } = useSettingsStore();
  const { lang, toggle: toggleLang, t } = useLanguageStore();

  const DEFAULT_DOCTOR: Doctor = { id: 1, name: 'Dr. Asif', specialization: 'General Physician' };
  const [doctors, setDoctors] = useState<Doctor[]>([DEFAULT_DOCTOR]);
  const [doctorId, setDoctorId] = useState<number | null>(1);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    publicApi.get('/public/doctors').then((r) => {
      const data = Array.isArray(r.data) && r.data.length > 0 ? r.data : [DEFAULT_DOCTOR];
      setDoctors(data);
      if (data.length > 0 && !doctorId) setDoctorId(data[0].id);
    }).catch(() => { setDoctors([DEFAULT_DOCTOR]); setDoctorId(1); });
  }, []);

  useKeyboardShortcut({ escape: () => { if (showLogin) setShowLogin(false); else if (result) setResult(null); } });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoading(true);
    try { await login(email, password); }
    catch (err: any) { setLoginError(err.response?.data?.message || t('login.error')); }
    finally { setLoading(false); }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) { setBookingError(t('login.error.select.doctor')); return; }
    setBookingError(''); setBookingLoading(true);
    try {
      const r = await publicApi.post('/public/book', { name: patientName, ...(phone ? { phone } : {}), doctor_id: doctorId });
      setResult(r.data);
    } catch (err: any) { setBookingError(err.response?.data?.message || t('login.error.booking')); }
    finally { setBookingLoading(false); }
  };

  const downloadTokenImage = () => {
    if (!result) return;
    const selectedDoc = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoc?.name || 'Doctor';
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = '#2563eb'; ctx.fillRect(0, 0, 600, 80);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(getSetting('site_title', 'CQMP').toUpperCase(), 300, 44);
    ctx.font = '13px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Patient Token Card', 300, 64);
    ctx.fillStyle = '#64748b'; ctx.font = '13px Inter, sans-serif';
    ctx.fillText(t('login.serial.title'), 300, 120);
    ctx.fillStyle = '#2563eb'; ctx.font = '900 96px Inter, sans-serif';
    ctx.fillText(`#${result.serial_no}`, 300, 220);
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(result.patient.name, 300, 268);
    ctx.fillStyle = '#64748b'; ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`${t('login.canvas.phone')} ${result.patient.phone || 'N/A'}`, 300, 292);
    ctx.fillStyle = '#2563eb'; ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText(`${t('login.canvas.doctor')} ${doctorName}`, 300, 330);
    const now = new Date();
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${t('login.canvas.booked.on')} ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 300, 380);
    const link = document.createElement('a');
    link.download = `token_${result.serial_no}_${result.patient.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const siteTitle = getSetting('site_title', 'CQMP');
  const siteSubtitle = getSetting('site_subtitle', 'Clinic Queue Management Platform');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">

      {/* ── Left Branding Panel ── */}
      <div
        className="hidden lg:flex lg:w-2/5 xl:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{ backgroundColor: '#1d4ed8' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* Logo + brand */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">{siteTitle}</div>
              <div className="text-blue-200 text-xs font-medium">Healthcare Platform</div>
            </div>
          </div>
          <h1 className="text-white text-3xl xl:text-4xl font-black leading-tight mb-4">
            Seamless<br />Patient Queue<br />Management
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-xs">
            {siteSubtitle}. Get your serial number instantly and wait comfortably.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative space-y-4">
          {[
            { icon: <Clock className="w-4 h-4 text-white" />, text: 'Real-time queue updates shown on the waiting-room TV display.' },
            { icon: <ShieldCheck className="w-4 h-4 text-white" />, text: 'No registration required — just enter your name to get a serial.' },
            { icon: <CalendarCheck className="w-4 h-4 text-white" />, text: 'Advance bookings available for next-day appointments.' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                {f.icon}
              </div>
              <p className="text-blue-100 text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
          <p className="text-blue-300 text-xs pt-4">© {new Date().getFullYear()} {siteTitle}. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right Content Panel ── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1d4ed8' }}>
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{siteTitle}</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="px-2 py-1 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
              {lang === 'en' ? 'BN' : 'EN'}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Staff Login
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            {result ? (
              /* ── Success View ── */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 text-center shadow-lg space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Booking Confirmed!</h2>
                    <p className="text-sm text-slate-400 mt-0.5">{t('login.serial.your')}</p>
                  </div>
                </div>

                <div className="py-4 bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Serial Number</p>
                  <p className="text-7xl font-black text-blue-600 dark:text-blue-400 tabular-nums">#{result.serial_no}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {t('login.serial.booked.for')}{' '}
                    <span className="font-semibold text-slate-800 dark:text-white">{result.patient.name}</span>
                  </p>
                </div>

                <div className="text-left space-y-1.5 text-xs text-slate-500">
                  {[t('login.notice.present'), t('login.notice.display'), t('login.notice.receptionist')].map((n, i) => (
                    <p key={i} className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 shrink-0">•</span>{n}</p>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={downloadTokenImage} className="btn-primary btn-lg flex-1">
                    <Download className="w-4 h-4" /> {t('login.save.token')}
                  </button>
                  <button onClick={() => { setResult(null); setPatientName(''); setPhone(''); }} className="btn-secondary btn-lg flex-1">
                    {t('login.book.another')}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Booking Form ── */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-lg">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('login.title') || 'Walk-in Booking'}</h2>
                  <p className="text-sm text-slate-400 mt-1">Get your serial number in seconds</p>
                </div>

                {bookingError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm" role="alert">{bookingError}</div>
                )}

                <form onSubmit={handleBook} className="space-y-5">
                  {/* Doctor */}
                  <div>
                    <label htmlFor="login-doctor-select" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {t('login.doctor') || 'Select Doctor'}
                    </label>
                    {doctors.length === 1 ? (
                      <div className="flex items-center gap-2.5 px-3.5 py-3 min-h-[44px] rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm font-semibold text-blue-700 dark:text-blue-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        {doctors[0].name} — {doctors[0].specialization}
                      </div>
                    ) : (
                      <select id="login-doctor-select" required value={doctorId ?? ''} onChange={(e) => setDoctorId(Number(e.target.value))}>
                        <option value="" disabled>{t('login.select.doctor') || 'Choose a doctor…'}</option>
                        {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
                      </select>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">{t('login.doctor.refresh.note', "If the doctor's name doesn't appear, please refresh the page.")}</p>
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="login-patient-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {t('login.full.name') || 'Full Name'}
                    </label>
                    <input id="login-patient-name" type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Rahim Uddin" />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="login-patient-phone" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {t('login.phone') || 'Phone'}
                      <span className="text-xs text-emerald-500 font-normal normal-case tracking-normal ml-1">({t('login.phone.optional') || 'optional'})</span>
                    </label>
                    <input id="login-patient-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 01712345678" />
                  </div>

                  <button type="submit" disabled={bookingLoading || !doctorId} className="btn-mint btn-lg w-full">
                    {bookingLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><CalendarCheck className="w-4 h-4" /> {t('login.book.serial') || 'Get My Serial Number'}</>
                    }
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Staff Login Modal ── */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowLogin(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('login.staff.login') || 'Staff Login'}</h3>
                  <p className="text-xs text-slate-400">{siteTitle}</p>
                </div>
              </div>
              <button onClick={() => setShowLogin(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm" role="alert">{loginError}</div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('login.email') || 'Email or Username'}</label>
                <input id="modal-email" type="text" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@clinic.com" />
              </div>
              <div>
                <label htmlFor="modal-password" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('login.password') || 'Password'}</label>
                <div className="relative">
                  <input id="modal-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="!pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><LogIn className="w-4 h-4" /> {t('login.button') || 'Sign In'}</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
