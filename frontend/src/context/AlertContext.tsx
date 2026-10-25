import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, AlertStatus } from '../types/alert.types';
import {
  getAlerts,
  updateAlertStatus as storeUpdateStatus,
  subscribeToStore,
  resetDemo,
} from '../engine/store/alertStore';

interface AlertContextType {
  alerts: Alert[];
  total: number;
  loading: boolean;
  error: string | null;
  refreshAlerts: () => Promise<void>;
  updateAlertStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
  resetDemo: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlerts());
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Subscribe to store changes (e.g. scan adds new alerts)
  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setAlerts([...getAlerts()]);
    });
    return unsub;
  }, []);

  const refreshAlerts = useCallback(async () => {
    setAlerts([...getAlerts()]);
  }, []);

  const updateAlertStatus = useCallback(async (id: number, status: AlertStatus, notes?: string) => {
    storeUpdateStatus(id, status, notes);
    // Store notifies subscribers automatically
  }, []);

  const handleResetDemo = useCallback(() => {
    resetDemo();
    setAlerts([...getAlerts()]);
  }, []);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        total: alerts.length,
        loading,
        error,
        refreshAlerts,
        updateAlertStatus,
        resetDemo: handleResetDemo,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlertContext() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlertContext must be used within AlertProvider');
  return ctx;
}
