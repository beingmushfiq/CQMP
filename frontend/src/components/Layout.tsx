import React, { useState, useCallback, useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api, { getStorageBaseUrl } from '../utils/api';
import { errorLogger } from '../utils/errorLogger';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { UserProfile } from './UserProfile';
import { ErrorLogModal } from './ErrorLogModal';
import {
  Sun, Moon, LogOut, Search, Bug,
  LayoutDashboard, Stethoscope, Monitor, Settings, Calendar,
  ChevronLeft, ChevronRight, X, Menu,
} from 'lucide-react';

export type TabId = 'dashboard' | 'reception' | 'bookings' | 'doctor' | 'tv' | 'settings';

interface NavItem {
  id: TabId;
  labelKey: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', label: 'Dashboard',     shortcut: 'H', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { id: 'reception', labelKey: 'nav.reception', label: 'Reception',     shortcut: 'R', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { id: 'bookings',  labelKey: 'nav.bookings',  label: 'Bookings',      shortcut: 'B', icon: <Calendar className="w-[18px] h-[18px]" /> },
  { id: 'doctor',    labelKey: 'nav.doctor',    label: 'Doctor Chamber', shortcut: 'D', icon: <Stethoscope className="w-[18px] h-[18px]" /> },
  { id: 'tv',        labelKey: 'nav.tv',        label: 'TV Display',    shortcut: 'T', icon: <Monitor className="w-[18px] h-[18px]" /> },
  { id: 'settings',  labelKey: 'nav.settings',  label: 'Settings',      shortcut: 'S', icon: <Settings className="w-[18px] h-[18px]" /> },
];

const ROLE_NAV_MAP: Record<string, TabId[]> = {
  'Super Admin': ['dashboard', 'reception', 'bookings', 'doctor', 'tv', 'settings'],
  Admin:         ['dashboard', 'reception', 'bookings', 'doctor', 'tv'],
  Receptionist:  ['dashboard', 'reception', 'bookings'],
  Doctor:        ['dashboard', 'doctor'],
  TV:            ['dashboard', 'tv'],
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
  const [showErrorInspector, setShowErrorInspector] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setErrorCount(errorLogger.getErrors().length);
    const unsubscribe = errorLogger.subscribe((logs) => setErrorCount(logs.length));
    return () => unsubscribe();
  }, []);

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

  const activeLabel = navItems.find((n) => n.id === activeTab)?.label || '';

  const logoUrl = getSetting('logo_path')
    ? `${getStorageBaseUrl()}/storage/${getSetting('logo_path')}`
    : '/favicon.svg';
  const siteTitle = getSetting('site_title', 'CQMP');
  const avatarUrl  = user?.avatar ? `${getStorageBaseUrl()}/storage/${user.avatar}` : null;
  const initials   = user?.name?.charAt(0)?.toUpperCase() || '?';

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = activeTab === item.id;
    return (
      <button
        onClick={() => { onTabChange(item.id); setMobileMenuOpen(false); }}
        title={sidebarCollapsed ? item.label : undefined}
        className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group relative
          ${sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'}
          ${active
            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
      >
        {/* Active indicator pill */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-600 rounded-r-full" />
        )}
        <span className={`shrink-0 transition-transform ${active ? 'scale-105' : ''}`}>
          {item.icon}
        </span>
        {!sidebarCollapsed && (
          <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800
          transition-all duration-300 z-20 shrink-0
          ${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'}`}
      >
        {/* Clinic Logo / Brand */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`h-16 flex items-center border-b border-slate-100 dark:border-slate-800
            w-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0
            ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}
        >
          <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg shrink-0 object-contain" />
          {!sidebarCollapsed && (
            <div className="min-w-0 text-left">
              <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{siteTitle}</div>
              <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Clinic Management</div>
            </div>
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* Section label — only in expanded mode */}
          {!sidebarCollapsed && (
            <p className="section-label px-3 mb-3">Navigation</p>
          )}
          {navItems.map((item) => <NavButton key={item.id} item={item} />)}
        </nav>

        {/* User + Collapse control */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-1 shrink-0">
          {/* User avatar row */}
          <button
            onClick={() => setProfileOpen(true)}
            className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer
              hover:bg-slate-50 dark:hover:bg-slate-800 group
              ${sidebarCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5'}`}
            title={sidebarCollapsed ? (user?.name || '') : undefined}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-blue-100 dark:ring-blue-900" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm shrink-0">
                {initials}
              </span>
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate leading-tight">{user?.name || '—'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{userRoles[0] || ''}</p>
              </div>
            )}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center rounded-xl px-3 py-2 text-xs text-slate-400 dark:text-slate-500
              hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300
              transition-colors cursor-pointer ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : (
              <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-5 z-10 shrink-0">

          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">{siteTitle}</span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-800 dark:text-white">{activeLabel}</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer text-xs font-medium"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search patient…</span>
            </button>

            {/* Error inspector */}
            <button
              onClick={() => setShowErrorInspector(true)}
              className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
              title="System Error Log"
            >
              <Bug className="w-4 h-4" />
              {errorCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-rose-500 text-white rounded-full">
                  {errorCount > 9 ? '9+' : errorCount}
                </span>
              )}
            </button>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language */}
            <button
              onClick={toggleLang}
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              title={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            >
              {lang === 'en' ? 'BN' : 'EN'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 min-h-0 ${activeTab === 'tv' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6 pb-20 md:pb-6'}`}>
          {children}
        </main>
      </div>

      {/* ── Mobile Slide-over Nav ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white dark:bg-slate-900 h-full shadow-xl animate-slide-in">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">{siteTitle}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              <p className="section-label px-3 mb-3">Navigation</p>
              {navItems.map((item) => <NavButton key={item.id} item={item} />)}
            </nav>
            <div
              onClick={() => { setProfileOpen(true); setMobileMenuOpen(false); }}
              className="border-t border-slate-100 dark:border-slate-800 p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm">
                  {initials}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.name || '—'}</p>
                <p className="text-[10px] text-slate-400 truncate">{userRoles[0] || ''}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav (compact) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0
                ${activeTab === item.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              <span className={`transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="text-[9px] font-semibold truncate">{t(item.labelKey).split(' ')[0]}</span>
              {activeTab === item.id && <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Modals ── */}
      <ErrorLogModal isOpen={showErrorInspector} onClose={() => setShowErrorInspector(false)} />
      <UserProfile open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 animate-slide-up">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Search className="w-4 h-4 text-blue-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('search.placeholder') || 'Search patient by name or phone…'}
                className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 text-sm placeholder:text-slate-400 !min-h-0 !px-0 !py-0"
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); } }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {searchQuery.length >= 2 && (
              <div className="mt-3">
                {searching ? (
                  <p className="text-xs text-slate-400 text-center py-6">{t('search.searching') || 'Searching…'}</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">{t('search.no.results') || 'No patients found.'}</p>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {searchResults.map((patient: any) => (
                      <div
                        key={patient.id}
                        onClick={() => { onTabChange('reception'); setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs shrink-0">
                          {patient.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{patient.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {patient.phone && <span className="text-[10px] text-slate-400">{patient.phone}</span>}
                            {patient.serial_no && <span className="badge-blue text-[10px] !py-0">#{patient.serial_no}</span>}
                            {patient.queue_status && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full
                                ${patient.queue_status === 'Waiting' ? 'badge-amber' : patient.queue_status === 'Called' ? 'badge-green' : 'badge-slate'}`}>
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
