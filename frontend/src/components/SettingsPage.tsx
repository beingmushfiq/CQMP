import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api, { getStorageBaseUrl } from '../utils/api';
import { Save, Upload, Check, AlertCircle, Settings, Building2, User } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, fetchSettings, updateSettings, get } = useSettingsStore();
  const { t } = useLanguageStore();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const doctorImageInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setForm({
      site_title: get('site_title', 'CQMP'),
      site_subtitle: get('site_subtitle', 'Clinic Queue Management Platform'),
      doctor_name: get('doctor_name', ''),
      doctor_specialization: get('doctor_specialization', ''),
      'reception.print.footer': get('reception.print.footer', t('reception.print.footer')),
    });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateSettings(form);
      setMsg({ type: 'success', text: t('settings.saved') });
    } catch {
      setMsg({ type: 'error', text: t('settings.failed') });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'doctor_image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      await api.post('/settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchSettings();
    } catch {
      // silently fail
    } finally {
      setUploading(null);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const logoUrl = settings.logo_path ? `${getStorageBaseUrl()}/storage/${settings.logo_path}` : '/favicon.svg';
  const faviconUrl = settings.favicon_path ? `${getStorageBaseUrl()}/storage/${settings.favicon_path}` : '/favicon.svg';
  const doctorImageUrl = settings.doctor_image ? `${getStorageBaseUrl()}/storage/${settings.doctor_image}` : '/doctor_portrait.png';

  return (
    <div className="max-w-3xl mx-auto space-y-8 px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shadow-sm">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-fluid-subtitle font-black text-slate-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Site Identity */}
      <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-premium">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-800 dark:text-white">
          <Building2 className="w-5 h-5 text-indigo-500" /> {t('settings.site.identity')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.site.title')}</label>
            <input
              type="text"
              value={form.site_title || ''}
              onChange={(e) => update('site_title', e.target.value)}
              className="w-full"
              placeholder="CQMP"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.site.subtitle')}</label>
            <input
              type="text"
              value={form.site_subtitle || ''}
              onChange={(e) => update('site_subtitle', e.target.value)}
              className="w-full"
              placeholder="Clinic Queue Management Platform"
            />
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.logo')}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
              </div>
              <button
                onClick={() => logoInput.current?.click()}
                disabled={uploading === 'logo'}
                className="btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <Upload className="w-4 h-4" />
                {uploading === 'logo' ? t('settings.uploading') : t('settings.upload')}
              </button>
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'logo')} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.favicon')}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <img src={faviconUrl} alt="Favicon" className="w-12 h-12 object-contain" />
              </div>
              <button
                onClick={() => faviconInput.current?.click()}
                disabled={uploading === 'favicon'}
                className="btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <Upload className="w-4 h-4" />
                {uploading === 'favicon' ? t('settings.uploading') : t('settings.upload')}
              </button>
              <input ref={faviconInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'favicon')} />
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Info */}
      <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-premium">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-800 dark:text-white">
          <User className="w-5 h-5 text-indigo-500" /> {t('settings.doctor.info')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.doctor.name')}</label>
            <input
              type="text"
              value={form.doctor_name || ''}
              onChange={(e) => update('doctor_name', e.target.value)}
              className="w-full"
              placeholder="Dr. Asif"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.doctor.specialization')}</label>
            <input
              type="text"
              value={form.doctor_specialization || ''}
              onChange={(e) => update('doctor_specialization', e.target.value)}
              className="w-full"
              placeholder="General Physician"
            />
          </div>
        </div>

        {/* Doctor Image */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.doctor.photo')}</label>
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              <img src={doctorImageUrl} alt="Doctor" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => doctorImageInput.current?.click()}
              disabled={uploading === 'doctor_image'}
              className="btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'doctor_image' ? t('settings.uploading') : t('settings.doctor.upload.photo')}
            </button>
            <input ref={doctorImageInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'doctor_image')} />
          </div>
        </div>
      </div>

      {/* TV Display Footer Text */}
      <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-premium">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-800 dark:text-white">
          <Building2 className="w-5 h-5 text-indigo-500" /> {t('settings.tv.footer.heading')}
        </h2>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('settings.tv.footer.label')}</label>
          <textarea
            value={form['reception.print.footer'] || ''}
            onChange={(e) => update('reception.print.footer', e.target.value)}
            className="w-full p-4"
            placeholder={t('settings.tv.footer.placeholder')}
            rows={4}
          />
        </div>
      </div>

      {/* Save Button & Messaging */}
      <div className="flex items-center gap-4 pt-2 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-preferred bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
        {msg && (
          <p className={`text-sm font-semibold flex items-center gap-1.5 ${msg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {msg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
};
