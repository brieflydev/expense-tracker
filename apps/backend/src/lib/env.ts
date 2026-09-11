import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ISSUER: z.string().min(1).default('expense-tracker-api'),
  JWT_AUDIENCE: z.string().min(1).default('expense-tracker-app'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** e.g. `.briefly-learn.com` in prod for cross-subdomain cookies; empty for localhost */
  COOKIE_DOMAIN: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCESS_COOKIE = 'et_access';
export const REFRESH_COOKIE = 'et_refresh';
