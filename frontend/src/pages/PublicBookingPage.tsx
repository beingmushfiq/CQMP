import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Search,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

import api from '../utils/api';
import { useLanguageStore } from '../store/useLanguageStore';
import { useThemeStore } from '../store/useThemeStore';

export const PublicBookingPage: React.FC = () => {
  const { lang, toggle: toggleLang, t } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [ageNum, setAgeNum] = useState('');
  const [ageUnit, setAgeUnit] = useState<'Years' | 'Months'>('Years');
  const [patientType, setPatientType] = useState<'New' | 'Follow-up' | 'Report Showing'>('New');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Status lookup tab
  const [activeTab, setActiveTab] = useState<'book' | 'lookup'>('book');
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available doctors
    api.get('/public/doctors')
      .then((res) => {
        const list = res.data.doctors || res.data || [];
        setDoctors(list);
        if (list.length > 0) {
          setSelectedDoctorId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/public/bookings', {
        doctor_id: selectedDoctorId,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_type: patientType,
        booking_date: tomorrowStr,
        preferred_slot: preferredSlot.trim() || undefined,
        remarks: [ageNum.trim() ? `Age: ${ageNum.trim()} ${ageUnit}` : '', remarks.trim()].filter(Boolean).join(' | ') || undefined,
      });

      setSuccessData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupNumber.trim()) return;

    try {
      setLookupLoading(true);
      setLookupError(null);
      const res = await api.get(`/public/bookings/${lookupNumber.trim()}`);
      setLookupResult(res.data);
    } catch (err: any) {
      setLookupError(err.response?.data?.message || 'Booking reference not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-xl flex justify-end gap-2 mb-4">
        <button
          onClick={toggleLang}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 cursor-pointer transition-colors"
          title={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
        >
          {lang === 'en' ? 'BN' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 cursor-pointer transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
      <div className="max-w-xl w-full space-y-6">
        {/* Clinic Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-2">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('public.booking.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('public.booking.subtitle')}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'book'
                  ? 'bg-white dark:bg-surface-card text-indigo-600 dark:text-indigo-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('public.booking.tab.reserve')}
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'lookup'
                  ? 'bg-white dark:bg-surface-card text-indigo-600 dark:text-indigo-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('public.booking.tab.lookup')}
            </button>
        </div>

        {/* Booking Form Card */}
        {activeTab === 'book' && (
          <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {successData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('public.booking.success.confirmed')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('public.booking.success.desc', { date: tomorrowStr })}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 inline-block max-w-sm w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('public.booking.number.label')}</p>
                  <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {successData.booking_number}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('public.booking.number.notice')}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSuccessData(null);
                    setPatientName('');
                    setPatientPhone('');
                    setAgeNum('');
                    setAgeUnit('Years');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {t('public.booking.another')}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('public.booking.date.tomorrow', { date: tomorrowStr })}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {t('public.booking.open')}
                  </span>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {doctors.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('visitor.select.doctor')}
                    </label>
                    <select
                      value={selectedDoctorId || ''}
                      onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialist || t('doctor.status.open')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('login.full.name')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Mohammad Ali"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('login.phone')} <span className="text-slate-400 font-normal">({t('login.phone.optional')})</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Age — optional */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('common.patient.age')} <span className="text-slate-400 font-normal">({t('login.phone.optional')})</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={ageNum}
                      onChange={(e) => setAgeNum(e.target.value)}
                      placeholder="e.g. 35"
                      className="w-24 flex-shrink-0 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={ageUnit}
                      onChange={(e) => setAgeUnit(e.target.value as 'Years' | 'Months')}
                      className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Years">{t('common.age.years')}</option>
                      <option value="Months">{t('common.age.months')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('public.booking.purpose')}
                    </label>
                    <select
                      value={patientType}
                      onChange={(e) => setPatientType(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="New">{t('patient.type.new')}</option>
                      <option value="Follow-up">{t('patient.type.followup')}</option>
                      <option value="Report Showing">{t('patient.type.report')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('public.booking.slot')}
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={preferredSlot}
                        onChange={(e) => setPreferredSlot(e.target.value)}
                        placeholder={t('public.booking.slot.placeholder')}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('public.booking.remarks')}
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={t('public.booking.remarks.placeholder')}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? t('public.booking.btn.reserving') : t('public.booking.btn.confirm')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Lookup Card */}
        {activeTab === 'lookup' && (
          <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('public.booking.lookup.label')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={lookupNumber}
                    onChange={(e) => setLookupNumber(e.target.value)}
                    placeholder={t('public.booking.lookup.placeholder')}
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-4 h-4" /> {t('public.booking.lookup.btn')}
                  </button>
                </div>
              </div>

              {lookupError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{t('public.booking.lookup.notfound')}</span>
                </div>
              )}

              {lookupResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {lookupResult.patient_name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {lookupResult.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p>{t('public.booking.lookup.date')} <span className="font-semibold text-slate-800 dark:text-slate-200">{lookupResult.booking_date}</span></p>
                    {lookupResult.serial_no && (
                      <p>{t('public.booking.lookup.serial')} <span className="font-bold text-emerald-600 dark:text-emerald-400">#{lookupResult.serial_no}</span></p>
                    )}
                  </div>
                </motion.div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
