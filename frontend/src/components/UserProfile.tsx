import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Save, Lock, User, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api from '../utils/api';

interface UserProfileProps {
  open: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ open, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const { t } = useLanguageStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name
  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const avatarUrl = avatarPreview || (user?.avatar ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${user.avatar}` : null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarSaving(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar: res.data.avatar });
      setAvatarFile(null);
    } catch {
      // silently fail
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!name.trim() || name === user?.name) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      await api.put('/profile/name', { name: name.trim() });
      updateUser({ name: name.trim() });
      setNameMsg({ type: 'success', text: t('profile.saved') });
    } catch {
      setNameMsg({ type: 'error', text: t('profile.save.failed') });
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: t('profile.password.mismatch') });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.put('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPwMsg({ type: 'success', text: t('profile.password.updated') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err?.response?.data?.message || t('profile.password.failed') });
    } finally {
      setPwSaving(false);
    }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-premium-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-slate-700/80">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.title')}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </div>
                {avatarFile && (
                  <button
                    onClick={handleAvatarUpload}
                    disabled={avatarSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {avatarSaving ? t('profile.avatar.uploading') : t('profile.avatar.upload')}
                  </button>
                )}
              </div>

              {/* Name Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <User className="w-3.5 h-3.5" /> {t('profile.name')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={nameSaving || !name.trim() || name === user?.name}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {nameSaving ? t('profile.saving') : t('profile.save')}
                  </button>
                </div>
                {nameMsg && (
                  <p className={`text-xs flex items-center gap-1 ${nameMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {nameMsg.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {nameMsg.text}
                  </p>
                )}
              </div>

              {/* Password Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <Lock className="w-3.5 h-3.5" /> {t('profile.password.change')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.password.current')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
                <input
                  type="password"
                  placeholder={t('profile.password.new')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
                <input
                  type="password"
                  placeholder={t('profile.password.confirm')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={handlePasswordSave}
                  disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pwSaving ? t('profile.password.updating') : t('profile.password.update')}
                </button>
                {pwMsg && (
                  <p className={`text-xs flex items-center gap-1 ${pwMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pwMsg.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {pwMsg.text}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
