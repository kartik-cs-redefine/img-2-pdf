import type { RequestHandler } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { requireAuthentication } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/error-handler.js';
import { authCookieOptions, clearAuthCookieOptions, createAuthToken, hashPassword, safeUserSelect, verifyPassword } from '../services/auth.js';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isUniqueConstraintError = (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
const sendAuthenticatedUser = (response: Parameters<RequestHandler>[1], user: { id: string; name: string; email: string; createdAt: Date }) => {
  response.cookie(env.AUTH_COOKIE_NAME, createAuthToken(user.id), authCookieOptions).status(201).json({ user });
};

export const authRouter = Router();

authRouter.post('/register', authRateLimit, async (request, response, next) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) return next(new HttpError(400, 'Please provide a valid name, email, and password.'));

  try {
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: normalizeEmail(parsed.data.email), passwordHash: await hashPassword(parsed.data.password) },
      select: safeUserSelect,
    });
    sendAuthenticatedUser(response, user);
  } catch (error) {
    if (isUniqueConstraintError(error)) return next(new HttpError(409, 'An account with that email already exists.'));
    return next(error);
  }
});

authRouter.post('/login', authRateLimit, async (request, response, next) => {
  const parsed = credentialsSchema.safeParse(request.body);
  if (!parsed.success) return next(new HttpError(401, 'Invalid email or password.'));

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
    if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) return next(new HttpError(401, 'Invalid email or password.'));
    response.cookie(env.AUTH_COOKIE_NAME, createAuthToken(user.id), authCookieOptions).json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', (_request, response) => {
  response.clearCookie(env.AUTH_COOKIE_NAME, clearAuthCookieOptions).status(204).send();
});

authRouter.get('/me', requireAuthentication, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.auth?.userId }, select: safeUserSelect });
    if (!user) return next(new HttpError(401, 'Authentication required.'));
    return response.json({ user });
  } catch (error) {
    return next(error);
  }
});
