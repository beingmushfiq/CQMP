import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { LoginForm } from './components/LoginForm';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { TvDisplay } from './components/TvDisplay';
import { VisitorBooking } from './components/VisitorBooking';
import { ShieldCheck, Monitor, Sun, Moon } from 'lucide-react';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';

type View = 'selection' | 'doctor' | 'receptionist' | 'tv' | 'visitor';

// Detect the home view for a given set of roles.
function homeViewForRoles(roles: string[]): View {
  if (roles.includes('Doctor')) return 'doctor';
  if (roles.includes('Receptionist')) return 'receptionist';
  if (roles.includes('TV')) return 'tv';
  return 'selection'; // Super Admin / Admin see selection portal
}

function App() {
  const { token, user, fetchUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [currentView, setCurrentView] = useState<View>('selection');

  // Register shortcuts for the Selection Portal screen
  useKeyboardShortcut(
    {
      '1': () => {
        if (token && currentView === 'selection') setCurrentView('doctor');
      },
      '2': () => {
        if (token && currentView === 'selection') setCurrentView('receptionist');
      },
      '3': () => {
        if (token && currentView === 'selection') setCurrentView('tv');
      },
      'v': () => {
        if (currentView === 'selection' || !token) setCurrentView('visitor');
      },
      't': () => toggleTheme(),
      'q': () => {
        if (token && currentView === 'selection') useAuthStore.getState().logout();
      },
    },
    currentView === 'selection' || !token
  );

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  // Auto-route after user data loads based on their role.
  useEffect(() => {
    if (user?.roles?.length) {
      const home = homeViewForRoles(user.roles);
      setCurrentView(home);
    }
  }, [user]);

  // Visitor booking is always accessible (no auth needed)
  if (currentView === 'visitor') {
    return <VisitorBooking onBack={() => setCurrentView('selection')} />;
  }

  if (!token) {
    return <LoginForm onVisitorBooking={() => setCurrentView('visitor')} />;
  }

  const isRoleFixed = user?.roles?.some((r) => ['Doctor', 'Receptionist', 'TV'].includes(r));

  if (currentView === 'doctor') {
    return <DoctorDashboard onBack={isRoleFixed ? undefined : () => setCurrentView('selection')} />;
  }

  if (currentView === 'receptionist') {
    return <ReceptionistDashboard onBack={isRoleFixed ? undefined : () => setCurrentView('selection')} />;
  }

  if (currentView === 'tv') {
    return <TvDisplay onBack={isRoleFixed ? undefined : () => setCurrentView('selection')} />;
  }

  // ── Selection Portal (Super Admin / Admin only) ────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-8 relative transition-colors duration-200">
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
            Welcome to CQMP
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Logged in as: {user?.name || 'Loading...'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('doctor')}
            className="bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-200 dark:border-slate-700 p-6 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-3 relative group"
          >
            <span className="absolute top-2 right-2 text-xs font-bold bg-slate-250 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-100">[1]</span>
            <ShieldCheck className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">Doctor Chamber</span>
          </button>

          <button
            onClick={() => setCurrentView('receptionist')}
            className="bg-slate-50 dark:bg-slate-800 hover:bg-emerald-600/10 dark:hover:bg-emerald-600/20 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 p-6 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-3 relative group"
          >
            <span className="absolute top-2 right-2 text-xs font-bold bg-slate-250 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-100">[2]</span>
            <ShieldCheck className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">Receptionist Desk</span>
          </button>

          <button
            onClick={() => setCurrentView('tv')}
            className="bg-slate-50 dark:bg-slate-800 hover:bg-amber-600/10 dark:hover:bg-amber-600/20 hover:border-amber-500 border border-slate-200 dark:border-slate-700 p-6 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-3 relative group"
          >
            <span className="absolute top-2 right-2 text-xs font-bold bg-slate-250 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-100">[3]</span>
            <Monitor className="w-8 h-8 text-amber-500 dark:text-amber-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">TV Display Board</span>
          </button>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>Active roles: {user?.roles?.join(', ') || 'None'}</span>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-rose-500 dark:text-rose-400 hover:text-rose-400 font-bold cursor-pointer"
          >
            Sign Out [Q]
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
