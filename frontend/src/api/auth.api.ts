import { api } from './client';
import { AuthResponse, User } from '../types/auth.types';

export const authApi = {
  register: (data: { email: string; password: string; role?: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () =>
    api.post<{ message: string }>('/auth/logout', {}),

  getMe: () =>
    api.get<{ user: User }>('/auth/me'),
};
