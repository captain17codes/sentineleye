import { api } from './client';

export const ledgerApi = {
  getAll: () => api.get('/ledger'),
  verify: () => api.get<{ valid: boolean; brokenAt: number | null; chainLength: number }>('/ledger/verify'),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
};

export const statsApi = {
  getRisk: () => api.get('/stats/risk'),
};
