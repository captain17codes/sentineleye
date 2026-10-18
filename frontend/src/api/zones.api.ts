import { api } from './client';
import { ZoneCollection } from '../types/zone.types';

export const zonesApi = {
  getAll: () => api.get<ZoneCollection>('/zones'),
  getById: (id: number) => api.get<ZoneCollection>(`/zones/${id}`),
  create: (data: { name: string; geojson: string; risk_level: string }) =>
    api.post('/zones', data),
  update: (id: number, data: { name: string; geojson: string; risk_level: string }) =>
    api.put(`/zones/${id}`, data),
  delete: (id: number) => api.delete(`/zones/${id}`),
};
