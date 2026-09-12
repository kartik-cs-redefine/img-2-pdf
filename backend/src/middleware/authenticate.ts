import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from './error-handler.js';
import { verifyAuthToken } from '../services/auth.js';

export const requireAuthentication: RequestHandler = (request, _response, next) => {
  const token = request.cookies?.[env.AUTH_COOKIE_NAME];
  if (typeof token !== 'string') return next(new HttpError(401, 'Authentication required.'));

  try {
    request.auth = verifyAuthToken(token);
    return next();
  } catch {
    return next(new HttpError(401, 'Authentication required.'));
  }
};
