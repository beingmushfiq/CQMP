import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api from '../utils/api';
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

  const logoUrl = settings.logo_path ? `http://localhost:8000/storage/${settings.logo_path}` : '/favicon.svg';
  const faviconUrl = settings.favicon_path ? `http://localhost:8000/storage/${settings.favicon_path}` : '/favicon.svg';
  const doctorImageUrl = settings.doctor_image ? `http://localhost:8000/storage/${settings.doctor_image}` : '/doctor_portrait.png';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Site Identity */}
      <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <Building2 className="w-4 h-4 text-indigo-500" /> {t('settings.site.identity')}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('settings.site.title')}</label>
            <input
              type="text"
              value={form.site_title || ''}
              onChange={(e) => update('site_title', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              placeholder="CQMP"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('settings.site.subtitle')}</label>
            <input
              type="text"
              value={form.site_subtitle || ''}
              onChange={(e) => update('site_subtitle', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              placeholder="Clinic Queue Management Platform"
            />
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{t('settings.logo')}</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <button
                onClick={() => logoInput.current?.click()}
                disabled={uploading === 'logo'}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading === 'logo' ? t('settings.uploading') : t('settings.upload')}
              </button>
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'logo')} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{t('settings.favicon')}</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
              </div>
              <button
                onClick={() => faviconInput.current?.click()}
                disabled={uploading === 'favicon'}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading === 'favicon' ? t('settings.uploading') : t('settings.upload')}
              </button>
              <input ref={faviconInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'favicon')} />
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Info */}
      <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <User className="w-4 h-4 text-indigo-500" /> {t('settings.doctor.info')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('settings.doctor.name')}</label>
            <input
              type="text"
              value={form.doctor_name || ''}
              onChange={(e) => update('doctor_name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              placeholder="Dr. Sarah Rahman"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('settings.doctor.specialization')}</label>
            <input
              type="text"
              value={form.doctor_specialization || ''}
              onChange={(e) => update('doctor_specialization', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              placeholder="Cardiologist"
            />
          </div>
        </div>

        {/* Doctor Image */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{t('settings.doctor.photo')}</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              <img src={doctorImageUrl} alt="Doctor" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => doctorImageInput.current?.click()}
              disabled={uploading === 'doctor_image'}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading === 'doctor_image' ? t('settings.uploading') : t('settings.doctor.upload.photo')}
            </button>
            <input ref={doctorImageInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'doctor_image')} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
        {msg && (
          <p className={`text-xs flex items-center gap-1 ${msg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {msg.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
};
