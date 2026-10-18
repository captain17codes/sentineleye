import { api } from './client';
import { AlertsResponse } from '../types/alert.types';

export const alertsApi = {
  getAll: (params?: { zone?: number; severity?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.zone) q.set('zone', String(params.zone));
    if (params?.severity) q.set('severity', params.severity);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    return api.get<AlertsResponse>(`/alerts?${q.toString()}`);
  },
  patchStatus: (id: number, status: string, notes?: string) =>
    api.patch(`/alerts/${id}/status`, { status, notes: notes ?? '' }),
};
