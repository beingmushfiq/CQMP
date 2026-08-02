import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Stethoscope, Monitor, Settings } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import type { TabId } from './Layout';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();

  const panels: { id: TabId; labelKey: string; descKey: string; icon: React.ReactNode; gradient: string; roles: string[] }[] = [
    {
      id: 'reception',
      labelKey: 'nav.reception',
      descKey: 'dashboard.reception.desc',
      icon: <LayoutDashboard className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      roles: ['Super Admin', 'Admin', 'Receptionist'],
    },
    {
      id: 'doctor',
      labelKey: 'nav.doctor',
      descKey: 'dashboard.doctor.desc',
      icon: <Stethoscope className="w-6 h-6" />,
      gradient: 'from-emerald-500 to-teal-500',
      roles: ['Super Admin', 'Admin', 'Doctor'],
    },
    {
      id: 'tv',
      labelKey: 'nav.tv',
      descKey: 'dashboard.tv.desc',
      icon: <Monitor className="w-6 h-6" />,
      gradient: 'from-indigo-500 to-purple-500',
      roles: ['Super Admin', 'Admin', 'TV'],
    },
    {
      id: 'settings',
      labelKey: 'nav.settings',
      descKey: 'dashboard.settings.desc',
      icon: <Settings className="w-6 h-6" />,
      gradient: 'from-slate-500 to-zinc-600',
      roles: ['Super Admin'],
    },
  ];

  const userRoles = user?.roles || [];
  const visiblePanels = panels.filter((p) => p.roles.some((r) => userRoles.includes(r)));

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-2 sm:px-4">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-premium"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="space-y-1">
            <h1 className="text-fluid-title font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              {user?.name || t('dashboard.welcome')}
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {userRoles.join(' • ')} — {getSetting('site_title', 'CQMP')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Panel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {visiblePanels.map((panel, idx) => (
          <motion.button
            key={panel.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
            onClick={() => onNavigate(panel.id)}
            className="group bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 text-left hover:shadow-premium-lg hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-premium flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex items-start gap-5 w-full">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${panel.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                {panel.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t(panel.labelKey)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t(panel.descKey)}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
