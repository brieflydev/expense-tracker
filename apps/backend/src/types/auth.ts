import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export type AuthedRequest = Request & {
  user: AuthUser;
};

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new Error('Expected authenticated request');
  }
  return req.user;
}
