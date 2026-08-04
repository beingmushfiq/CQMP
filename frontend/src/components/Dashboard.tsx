import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Stethoscope, Monitor, Settings, Calendar,
  ArrowRight, Users, Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import type { TabId } from './Layout';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

const panels: {
  id: TabId;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  roles: string[];
}[] = [
  {
    id: 'reception',
    labelKey: 'nav.reception',
    descKey: 'Manage the live patient queue, call patients, and track today\'s sessions.',
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950',
    roles: ['Super Admin', 'Admin', 'Receptionist'],
  },
  {
    id: 'bookings',
    labelKey: 'nav.bookings',
    descKey: 'Review, confirm, and assign serial numbers for advance reservations.',
    icon: <Calendar className="w-6 h-6" />,
    color: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-950',
    roles: ['Super Admin', 'Admin', 'Receptionist', 'Doctor'],
  },
  {
    id: 'doctor',
    labelKey: 'nav.doctor',
    descKey: 'View your consultation queue, call the next patient, and update statuses.',
    icon: <Stethoscope className="w-6 h-6" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950',
    roles: ['Super Admin', 'Admin', 'Doctor'],
  },
  {
    id: 'tv',
    labelKey: 'nav.tv',
    descKey: 'Preview and manage the waiting-room TV display in real time.',
    icon: <Monitor className="w-6 h-6" />,
    color: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950',
    roles: ['Super Admin', 'Admin', 'TV'],
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    descKey: 'Configure clinic details, branding, doctor profiles, and system preferences.',
    icon: <Settings className="w-6 h-6" />,
    color: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    roles: ['Super Admin'],
  },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { t } = useLanguageStore();

  const userRoles = user?.roles || [];
  const visiblePanels = panels.filter((p) => p.roles.some((r) => userRoles.includes(r)));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Welcome Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 text-2xl font-black shrink-0 select-none">
          {user?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-0.5">{greeting}</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Welcome'}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {userRoles.map((r) => (
              <span key={r} className="badge-blue">{r}</span>
            ))}
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{getSetting('site_title', 'Clinic')}</span>
          </div>
        </div>

        {/* Date + today indicator */}
        <div className="hidden lg:flex flex-col items-end gap-1 text-right shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{todayStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">System Online</span>
          </div>
        </div>
      </motion.div>

      {/* ── Quick-Action Panels ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Modules</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>{visiblePanels.length} available</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visiblePanels.map((panel, idx) => (
            <motion.button
              key={panel.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.06 * idx }}
              onClick={() => onNavigate(panel.id)}
              className="card-interactive text-left p-5 flex items-start gap-4 group"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl ${panel.iconBg} flex items-center justify-center ${panel.color} shrink-0 transition-transform duration-150 group-hover:scale-105`}>
                {panel.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-bold ${panel.color} mb-1`}>
                  {t(panel.labelKey)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {t(panel.descKey) !== panel.descKey ? t(panel.descKey) : panel.descKey}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-slate-300 dark:text-slate-700 pb-4">
        {getSetting('site_title', 'CQMP')} — Clinic Queue Management Platform
      </p>
    </div>
  );
};
