import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth.js';
import { ACCESS_COOKIE } from '../lib/env.js';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken =
    typeof req.cookies?.[ACCESS_COOKIE] === 'string'
      ? (req.cookies[ACCESS_COOKIE] as string)
      : null;
  const token = bearer || cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Missing or invalid authorization' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
