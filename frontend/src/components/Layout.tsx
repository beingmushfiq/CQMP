import React, { useState, useCallback } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api, { getStorageBaseUrl } from '../utils/api';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { UserProfile } from './UserProfile';
import {
  Sun, Moon, LogOut, Search,
  LayoutDashboard, Stethoscope, Monitor, Settings,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';

export type TabId = 'dashboard' | 'reception' | 'doctor' | 'tv' | 'settings';

interface NavItem {
  id: TabId;
  labelKey: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', label: 'Dashboard',     icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'reception', labelKey: 'nav.reception', label: 'Reception Desk', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'doctor',    labelKey: 'nav.doctor',    label: 'Doctor Chamber', icon: <Stethoscope className="w-5 h-5" /> },
  { id: 'tv',        labelKey: 'nav.tv',        label: 'TV Display',     icon: <Monitor className="w-5 h-5" /> },
  { id: 'settings',  labelKey: 'nav.settings',  label: 'Settings',       icon: <Settings className="w-5 h-5" /> },
];

const ROLE_NAV_MAP: Record<string, TabId[]> = {
  'Super Admin': ['dashboard', 'reception', 'doctor', 'tv', 'settings'],
  Admin: ['dashboard', 'reception', 'doctor', 'tv'],
  Receptionist: ['dashboard', 'reception'],
  Doctor: ['dashboard', 'doctor'],
  TV: ['dashboard', 'tv'],
};

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, onTabChange, children }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { get: getSetting } = useSettingsStore();
  const { lang, toggle: toggleLang, t } = useLanguageStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}`);
      setSearchResults(res.data.data || res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useKeyboardShortcut({
    'alt+r': () => onTabChange('reception'),
    'alt+d': () => onTabChange('doctor'),
    'alt+t': () => onTabChange('tv'),
  });

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const userRoles = user?.roles || [];
  const allowedTabIds = userRoles.flatMap((role) => ROLE_NAV_MAP[role] || []);
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedTabIds.includes(item.id));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside
        className={`hidden md:flex glass border-r border-slate-200/80 dark:border-slate-700/80 flex-col transition-all duration-300 z-20 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {/* Logo */}
        <button
          onClick={() => onTabChange('dashboard')}
          className="h-16 flex items-center gap-3 px-4 border-b border-slate-200/80 dark:border-slate-700/80 w-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <img src={getSetting('logo_path') ? `${getStorageBaseUrl()}/storage/${getSetting('logo_path')}` : '/favicon.svg'} alt="Logo" className="w-8 h-8 rounded-lg shadow-md shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent whitespace-nowrap">
              {getSetting('site_title', 'CQMP')}
            </span>
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer group relative ${
                activeTab === item.id
                  ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
              title={sidebarCollapsed ? `${t(item.labelKey)} [Alt+${item.shortcut}]` : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                  <kbd className="text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </kbd>
                </>
              )}
              {activeTab === item.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r" />
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title={sidebarCollapsed ? t('sidebar.expand.title') : t('sidebar.collapse.title')}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span>{t('sidebar.collapse')}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass border-b border-slate-200/80 dark:border-slate-700/80 h-16 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <button onClick={() => onTabChange('reception')} className="md:hidden cursor-pointer">
              <img src={getSetting('logo_path') ? `${getStorageBaseUrl()}/storage/${getSetting('logo_path')}` : '/favicon.svg'} alt="Logo" className="w-8 h-8 rounded-lg shadow-md" />
            </button>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              {t(navItems.find((n) => n.id === activeTab)?.labelKey || '')}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all text-xs font-bold"
              title={lang === 'en' ? t('lang.switch.to.bn') : t('lang.switch.to.en')}
            >
              {lang === 'en' ? 'BN' : 'EN'}
            </button>

            <button
              onClick={() => setProfileOpen(true)}
              className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors rounded-lg px-2 py-1"
            >
              {user?.avatar ? (
                <img src={`${getStorageBaseUrl()}/storage/${user.avatar}`} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-indigo-600/15 dark:bg-indigo-600/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
              <span className="font-medium">{user?.name || t('sidebar.loading')}</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-600/10 text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-500/30 cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 min-h-0 ${activeTab === 'tv' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6 pb-24 md:pb-6'}`}>
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navbar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-surface-card/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-700/80 px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer min-w-0 ${
                activeTab === item.id
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className={`transition-all ${activeTab === item.id ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold truncate">{t(item.labelKey).split(' ')[0]}</span>
              {activeTab === item.id && (
                <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          ))}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            {user?.avatar ? (
              <img src={`${getStorageBaseUrl()}/storage/${user.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-indigo-600/15 dark:bg-indigo-600/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[8px]">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
            <span className="text-[10px] font-semibold">{t('nav.profile')}</span>
          </button>
        </div>
      </nav>

      {/* ── User Profile Modal ── */}
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} />
          <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700 rounded-xl shadow-premium-lg p-4 animate-fade-up">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); } }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {searchQuery.length >= 2 && (
              <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                {searching ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">{t('search.searching')}</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">{t('search.no.results')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {searchResults.map((patient: any) => (
                      <div
                        key={patient.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all cursor-pointer"
                        onClick={() => { onTabChange('reception'); setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                          {patient.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{patient.name}</p>
                          <div className="flex items-center gap-2">
                            {patient.phone && <p className="text-[10px] text-slate-400 dark:text-slate-500">{patient.phone}</p>}
                            {patient.serial_no && (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                                #{patient.serial_no}
                              </span>
                            )}
                            {patient.queue_status && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                patient.queue_status === 'Waiting' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                                : patient.queue_status === 'Called' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                                : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
                              }`}>
                                {patient.queue_status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
