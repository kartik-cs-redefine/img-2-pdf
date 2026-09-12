import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

type AuthToken = { sub: string };

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  maxAge: env.AUTH_COOKIE_MAX_AGE_MS,
  path: '/api',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password);
}

export function createAuthToken(userId: string) {
  return jwt.sign({} as AuthToken, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token');
  return { userId: payload.sub };
}
