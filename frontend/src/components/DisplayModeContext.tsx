import React, { createContext, useContext } from 'react';
import { useDisplayMode, type DisplayMode, type DisplayState } from '../hooks/useDisplayMode';

interface DisplayModeContextType extends DisplayState {
  loading: boolean;
  setMode: (mode: DisplayMode, params?: Partial<DisplayState>) => Promise<void>;
  resume: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined);

export const DisplayModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const displayMode = useDisplayMode();

  return (
    <DisplayModeContext.Provider value={displayMode}>
      {children}
    </DisplayModeContext.Provider>
  );
};

export const useDisplayModeContext = () => {
  const context = useContext(DisplayModeContext);
  if (context === undefined) {
    throw new Error('useDisplayModeContext must be used within a DisplayModeProvider');
  }
  return context;
};
