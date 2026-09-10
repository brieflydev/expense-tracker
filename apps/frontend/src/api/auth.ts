import { apiRequest, clearTokens, setTokens } from './client';
import type { AuthResponse, User } from '../types';

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(refreshToken: string | null): Promise<void> {
  if (refreshToken) {
    try {
      await apiRequest<void>('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
        skipRefresh: true,
      });
    } catch {
      // ignore logout network errors
    }
  }
  clearTokens();
}

export async function fetchMe(): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/auth/me');
  return data.user;
}
