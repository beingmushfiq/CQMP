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

function App() {
  const { token, user, fetchUser } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const [currentView, setCurrentView] = useState<View>('loading');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  useEffect(() => {
    fetchSettings();
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

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-dark flex items-center justify-center transition-colors duration-300">
        <span className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentView === 'login') return <LoginForm />;
  if (currentView === 'doctor') return <DoctorDashboard />;
  if (currentView === 'tv') return <div className="h-screen"><TvDisplay /></div>;

  // Layout-wrapped views (Receptionist / Admin / Super Admin)
  if (currentView === 'receptionist') {
    return (
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'reception' && <ReceptionistDashboard />}
        {activeTab === 'doctor' && <DoctorDashboard />}
        {activeTab === 'tv' && <TvDisplay embedded />}
        {activeTab === 'settings' && <SettingsPage />}
      </Layout>
    );
  }

  return <LoginForm />;
}

export default App;
