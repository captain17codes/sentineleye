import React, { createContext, useContext, useState, useEffect } from 'react';

interface PresentationModeContextType {
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  setPresentationMode: (val: boolean) => void;
}

const PresentationModeContext = createContext<PresentationModeContextType>({
  isPresentationMode: false,
  togglePresentationMode: () => {},
  setPresentationMode: () => {},
});

const STORAGE_KEY = 'sentineleye_presentation_mode';

export function PresentationModeProvider({ children }: { children: React.ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPresentationMode));
    } catch {
      // storage unavailable
    }

    if (isPresentationMode) {
      document.documentElement.classList.add('presentation-mode');
      document.body.classList.add('presentation-mode');
    } else {
      document.documentElement.classList.remove('presentation-mode');
      document.body.classList.remove('presentation-mode');
    }
  }, [isPresentationMode]);

  const togglePresentationMode = () => {
    setIsPresentationMode((prev) => !prev);
  };

  return (
    <PresentationModeContext.Provider
      value={{
        isPresentationMode,
        togglePresentationMode,
        setPresentationMode: setIsPresentationMode,
      }}
    >
      {children}
    </PresentationModeContext.Provider>
  );
}

export function usePresentationMode() {
  return useContext(PresentationModeContext);
}
