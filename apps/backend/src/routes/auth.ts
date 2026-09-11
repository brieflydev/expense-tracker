import { Router } from 'express';
import { z } from 'zod';
import {
  createRefreshTokenValue,
  hashPassword,
  publicUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  storeRefreshToken,
  verifyPassword,
} from '../lib/auth.js';
import { clearAuthCookies, setAuthCookies } from '../lib/cookies.js';
import { REFRESH_COOKIE } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuthUser } from '../types/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

function readRefreshToken(req: {
  body?: unknown;
  cookies?: Record<string, unknown>;
}): string | null {
  const fromBody =
    typeof req.body === 'object' &&
    req.body !== null &&
    'refreshToken' in req.body &&
    typeof (req.body as { refreshToken: unknown }).refreshToken === 'string'
      ? (req.body as { refreshToken: string }).refreshToken
      : null;
  const fromCookie =
    typeof req.cookies?.[REFRESH_COOKIE] === 'string'
      ? (req.cookies[REFRESH_COOKIE] as string)
      : null;
  return fromBody || fromCookie;
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'Email already registered');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: body.name,
      },
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = createRefreshTokenValue();
    await storeRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = createRefreshTokenValue();
    await storeRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      throw new HttpError(401, 'Missing refresh token');
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      clearAuthCookies(res);
      throw new HttpError(401, 'Invalid or expired refresh token');
    }

    const accessToken = signAccessToken({
      sub: rotated.userId,
      email: rotated.email,
    });
    setAuthCookies(res, accessToken, rotated.newRefreshToken);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const authUser = getAuthUser(req);
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
