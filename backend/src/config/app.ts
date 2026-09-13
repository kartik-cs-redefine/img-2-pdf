import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { corsOrigins, env } from './env.js';
import { notFoundHandler } from '../middleware/not-found.js';
import { errorHandler } from '../middleware/error-handler.js';
import { authRouter } from '../routes/auth.js';
import { conversionsRouter } from '../routes/conversions.js';

const isAllowedOrigin = (origin: string): boolean => {
  const normalizedOrigin = origin.trim().replace(/\/$/, '');
  if (corsOrigins.includes(normalizedOrigin)) {
    return true;
  }
  // Safely allow stable production domain and Vercel preview/deployment domains for this project
  return /^https:\/\/pictapdf(-[a-z0-9-]+)?\.vercel\.app$/i.test(normalizedOrigin);
};

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Pdf-Filename', 'X-Image-Count'],
    maxAge: 86400,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));
  app.use('/api/auth', authRouter);
  app.use('/api/conversions', conversionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const serverPort = env.PORT;
