import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  const statusCode = response.statusCode >= 400 ? response.statusCode : 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;
  response.status(statusCode).json({ error: message });
};
