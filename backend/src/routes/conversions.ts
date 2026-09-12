import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthentication } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/error-handler.js';

const conversionSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  imageCount: z.coerce.number().int().min(1).max(1_000),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().cuid().optional(),
});

const conversionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many history requests. Please try again later.' },
});

const safeConversionSelect = {
  id: true,
  filename: true,
  imageCount: true,
  createdAt: true,
} as const;

export const conversionsRouter = Router();

conversionsRouter.use(requireAuthentication, conversionRateLimit);

conversionsRouter.post('/', async (request, response, next) => {
  const parsed = conversionSchema.safeParse(request.body);
  if (!parsed.success) return next(new HttpError(400, 'Please provide valid conversion details.'));

  try {
    const conversion = await prisma.conversion.create({
      data: { ...parsed.data, userId: request.auth!.userId },
      select: safeConversionSelect,
    });
    return response.status(201).json({ conversion });
  } catch (error) {
    return next(error);
  }
});

conversionsRouter.get('/', async (request, response, next) => {
  const parsed = historyQuerySchema.safeParse(request.query);
  if (!parsed.success) return next(new HttpError(400, 'Please provide valid pagination parameters.'));

  const { cursor, limit } = parsed.data;
  try {
    const conversions = await prisma.conversion.findMany({
      where: { userId: request.auth!.userId },
      select: safeConversionSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = conversions.length > limit;
    const items = hasMore ? conversions.slice(0, limit) : conversions;
    return response.json({ conversions: items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null });
  } catch (error) {
    return next(error);
  }
});
