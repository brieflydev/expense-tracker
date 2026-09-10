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

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authRouter = Router();

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

    res.status(201).json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
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

    res.json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      throw new HttpError(401, 'Invalid or expired refresh token');
    }

    const accessToken = signAccessToken({
      sub: rotated.userId,
      email: rotated.email,
    });

    res.json({
      accessToken,
      refreshToken: rotated.newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
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
