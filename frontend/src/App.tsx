import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { LoginForm } from './components/LoginForm';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { DisplayFullscreenLayout } from './components/DisplayFullscreenLayout';
import { DisplayPreviewLayout } from './components/DisplayPreviewLayout';
import { Layout, type TabId } from './components/Layout';
import { SettingsPage } from './components/SettingsPage';
import { Dashboard } from './components/Dashboard';
import { useSettingsStore } from './store/useSettingsStore';

type View = 'loading' | 'login' | 'doctor' | 'receptionist' | 'tv' | 'display-fullscreen';

function homeViewForRoles(roles: string[]): View {
  if (roles.includes('Doctor')) return 'doctor';
  if (roles.includes('Receptionist') || roles.includes('Super Admin') || roles.includes('Admin')) return 'receptionist';
  if (roles.includes('TV')) return 'display-fullscreen';
  return 'login';
}

function getInitialTabFromPath(path: string): TabId {
  const clean = path.toLowerCase().replace(/\/$/, '');
  if (clean === '/reception') return 'reception';
  if (clean === '/doctor') return 'doctor';
  // /display is the canonical public display route; /tv is kept for compat
  if (clean === '/display' || clean === '/tv') return 'tv';
  if (clean === '/settings') return 'settings';
  return 'dashboard';
}

import { DisplayModeProvider } from './components/DisplayModeContext';

function App() {
  const { token, user, fetchUser } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const [pathname, setPathname] = useState(window.location.pathname);
  const [currentView, setCurrentView] = useState<View>('loading');
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTabFromPath(window.location.pathname));

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      setPathname(currentPath);
      setActiveTab(getInitialTabFromPath(currentPath));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      const p = pathname.toLowerCase().replace(/\/$/, '');
      if (p !== '/tv' && p !== '/display') setCurrentView('login');
    }
  }, [token, pathname]);

  useEffect(() => {
    if (user?.roles?.length) {
      setCurrentView(homeViewForRoles(user.roles));
    }
  }, [user]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    // Use /display as the canonical path for the TV/display tab
    const newPath = tab === 'dashboard' ? '/' : tab === 'tv' ? '/display' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
      setPathname(newPath);
    }
  };

  const cleanPath = pathname.toLowerCase().replace(/\/$/, '');

  // Redirect legacy /tv → /display immediately (no flash)
  if (cleanPath === '/tv') {
    window.location.replace('/display');
    return null;
  }

  const isDisplayRoute = cleanPath === '/display';

  if (isDisplayRoute) {
    return (
      <DisplayModeProvider>
        <DisplayFullscreenLayout />
      </DisplayModeProvider>
    );
  }

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-dark flex items-center justify-center transition-colors duration-300">
        <span className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentView === 'login') return <LoginForm />;
  if (currentView === 'display-fullscreen') {
    return (
      <DisplayModeProvider>
        <DisplayFullscreenLayout />
      </DisplayModeProvider>
    );
  }
  if (currentView === 'tv') {
    return (
      <DisplayModeProvider>
        <DisplayFullscreenLayout />
      </DisplayModeProvider>
    );
  }

  // Layout-wrapped views (Doctor, Receptionist, Admin, Super Admin)
  return (
    <DisplayModeProvider>
      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'dashboard' && <Dashboard onNavigate={handleTabChange} />}
        {activeTab === 'reception' && <ReceptionistDashboard />}
        {activeTab === 'doctor' && <DoctorDashboard />}
        {activeTab === 'tv' && <DisplayPreviewLayout onTabChange={handleTabChange} />}
        {activeTab === 'settings' && <SettingsPage />}
      </Layout>
    </DisplayModeProvider>
  );
}

export default App;
