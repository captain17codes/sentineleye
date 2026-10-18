export interface User {
  id: number;
  email: string;
  role: 'operator' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  user: User;
}
