import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = error instanceof HttpError ? error.message : 'Internal server error';
  if (env.NODE_ENV === 'development' && _request.path.startsWith('/api/conversions')) {
    const details = error instanceof Error
      ? { name: error.name, message: error.message, code: (error as Error & { code?: unknown }).code ?? null }
      : { name: 'NonError', message: String(error), code: null };
    console.error('[conversion.persistence] response.error', { statusCode, ...details });
  }
  response.status(statusCode).json({ error: message });
};
