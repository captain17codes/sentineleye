import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, AlertStatus } from '../types/alert.types';
import { alertsApi } from '../api/alerts.api';
import { useAuth } from './AuthContext';

interface AlertContextType {
  alerts: Alert[];
  total: number;
  loading: boolean;
  error: string | null;
  refreshAlerts: () => Promise<void>;
  updateAlertStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await alertsApi.getAll({ limit: 50 } as any);
      setAlerts(res.alerts || []);
      setTotal(res.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load + poll every 15 seconds
  useEffect(() => {
    if (!user) {
      setAlerts([]);
      return;
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [user, fetchAlerts]);

  const updateAlertStatus = useCallback(async (id: number, status: AlertStatus, notes?: string) => {
    await alertsApi.patchStatus(id, status, notes);
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, status } : a))
    );
  }, []);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        total,
        loading,
        error,
        refreshAlerts: fetchAlerts,
        updateAlertStatus,
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
