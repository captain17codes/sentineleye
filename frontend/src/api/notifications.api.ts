import { api } from './client';

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  is_simulated: number | boolean;
  created_at: string;
}

export const notificationsApi = {
  getAll: () => api.get<NotificationItem[]>('/notifications'),
};
