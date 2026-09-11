import type { CookieOptions, Response } from 'express';
import {
  ACCESS_COOKIE,
  env,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_MS,
} from './env.js';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  const secure = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    // Cross-site (app.* → api.*) in production; same-site via Vite proxy locally.
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_MAX_AGE_MS,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}
