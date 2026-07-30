import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { LoginForm } from './components/LoginForm';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { TvDisplay } from './components/TvDisplay';
import { Layout, type TabId } from './components/Layout';
import { SettingsPage } from './components/SettingsPage';
import { Dashboard } from './components/Dashboard';
import { useSettingsStore } from './store/useSettingsStore';

type View = 'loading' | 'login' | 'doctor' | 'receptionist' | 'tv';

function homeViewForRoles(roles: string[]): View {
  if (roles.includes('Doctor')) return 'doctor';
  if (roles.includes('Receptionist') || roles.includes('Super Admin') || roles.includes('Admin')) return 'receptionist';
  if (roles.includes('TV')) return 'tv';
  return 'login';
}

function getInitialTabFromPath(path: string): TabId {
  const clean = path.toLowerCase().replace(/\/$/, '');
  if (clean === '/reception') return 'reception';
  if (clean === '/doctor') return 'doctor';
  if (clean === '/tv') return 'tv';
  if (clean === '/settings') return 'settings';
  return 'dashboard';
}

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
      setCurrentView('login');
    }
  }, [token]);

  useEffect(() => {
    if (user?.roles?.length) {
      setCurrentView(homeViewForRoles(user.roles));
    }
  }, [user]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const newPath = tab === 'dashboard' ? '/' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
      setPathname(newPath);
    }
  };

  const isTvRoute = pathname.toLowerCase().replace(/\/$/, '') === '/tv';

  if (isTvRoute) {
    return <div className="h-screen"><TvDisplay /></div>;
  }

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-dark flex items-center justify-center transition-colors duration-300">
        <span className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentView === 'login') return <LoginForm />;
  if (currentView === 'tv') return <div className="h-screen"><TvDisplay /></div>;

  // Layout-wrapped views (Doctor, Receptionist, Admin, Super Admin)
  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'dashboard' && <Dashboard onNavigate={handleTabChange} />}
      {activeTab === 'reception' && <ReceptionistDashboard />}
      {activeTab === 'doctor' && <DoctorDashboard />}
      {activeTab === 'tv' && <TvDisplay embedded />}
      {activeTab === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default App;
