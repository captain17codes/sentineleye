import { api } from './client';
import { ScanResult } from '../types/scan.types';

export const scansApi = {
  create: (data: ScanResult) => api.post('/scans', data),
  getAll: (page = 1, limit = 20) =>
    api.get(`/scans?page=${page}&limit=${limit}`),
};
