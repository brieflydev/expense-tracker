import { apiRequest, clearLegacyTokens } from './client';
import type { AuthResponse, User } from '../types';

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  clearLegacyTokens();
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  clearLegacyTokens();
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/api/auth/logout', {
      method: 'POST',
      body: {},
      auth: false,
      skipRefresh: true,
    });
  } catch {
    // ignore logout network errors
  }
  clearLegacyTokens();
}

export async function fetchMe(): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/auth/me');
  return data.user;
}
