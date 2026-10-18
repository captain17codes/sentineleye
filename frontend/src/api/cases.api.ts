import { api } from './client';

export const casesApi = {
  create: (data: { alert_id: number; notes?: string }) =>
    api.post('/cases', data),
  getById: (id: number) =>
    api.get(`/cases/${id}`),
  getPdf: async (id: number): Promise<void> => {
    const blob = await api.get<Blob>(`/cases/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FIR-Case-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
