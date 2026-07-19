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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-6 shadow-premium"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.name || 'User'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userRoles.join(' • ')} — {getSetting('site_title', 'CQMP')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Panel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visiblePanels.map((panel, idx) => (
          <motion.button
            key={panel.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
            onClick={() => onNavigate(panel.id)}
            className="group bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 text-left hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all cursor-pointer shadow-premium"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${panel.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {panel.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t(panel.labelKey)}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t(panel.descKey)}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
