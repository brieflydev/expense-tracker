import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL,
  env,
  REFRESH_TOKEN_TTL_MS,
} from './env.js';
import { prisma } from './prisma.js';

const BCRYPT_ROUNDS = 12;

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessTokenPayload;
}

export function createRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString('hex');
}

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

/**
 * Atomically consume a refresh token and issue a replacement.
 * Concurrent refreshes with the same token: only one wins; others get null.
 */
export async function rotateRefreshToken(
  refreshToken: string,
): Promise<{ userId: string; email: string; newRefreshToken: string } | null> {
  const tokenHash = hashToken(refreshToken);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!existing) {
        return null;
      }

      if (existing.expiresAt < new Date()) {
        await tx.refreshToken.deleteMany({ where: { id: existing.id } });
        return null;
      }

      const consumed = await tx.refreshToken.deleteMany({
        where: { id: existing.id, tokenHash },
      });
      if (consumed.count !== 1) {
        return null;
      }

      const newRefreshToken = createRefreshTokenValue();
      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });

      return {
        userId: existing.userId,
        email: existing.user.email,
        newRefreshToken,
      };
    });
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
