import { raw, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthentication } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/error-handler.js';
import { createPdfDownloadUrl, createPdfPreviewUrl, removePdfs, uploadPdf } from '../services/storage.js';
import { env } from '../config/env.js';

const MAX_USER_STORAGE_BYTES = 100 * 1024 * 1024;
const pdfContentType = /^application\/pdf(?:\s*;|$)/i;
const conversionSchema = z.object({ filename: z.string().trim().min(1).max(255), imageCount: z.coerce.number().int().min(1).max(1_000) });

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(64).optional(),
});

const conversionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many history requests. Please try again later.' },
});
const persistenceQueues = new Map<string, Promise<void>>();

function logConversion(event: string, details: Record<string, unknown>) {
  if (env.NODE_ENV === 'development') console.info(`[conversion.persistence] ${event}`, details);
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const withDetails = error as Error & { code?: unknown; cause?: unknown };
    const cause = withDetails.cause;
    const causeDetails = cause instanceof Error
      ? { causeName: cause.name, causeMessage: cause.message, causeCode: (cause as Error & { code?: unknown }).code ?? null }
      : {};
    return { name: error.name, message: error.message, code: withDetails.code ?? null, ...causeDetails };
  }
  return { name: 'NonError', message: String(error), code: null };
}

function sanitizeFilename(filename: string) {
  const base = filename.replace(/[\r\n\\/]+/g, '-').replace(/[^a-zA-Z0-9._ -]/g, '').trim().slice(0, 180);
  const safeBase = base && base !== '.' && base !== '..' ? base : 'pictapdf.pdf';
  return /\.pdf$/i.test(safeBase) ? safeBase : `${safeBase}.pdf`;
}
function isPdf(buffer: Buffer) { return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'; }
async function serializeForUser<T>(userId: string, task: () => Promise<T>) {
  const previous = persistenceQueues.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  persistenceQueues.set(userId, queued);
  await previous;
  try { return await task(); } finally { release(); if (persistenceQueues.get(userId) === queued) persistenceQueues.delete(userId); }
}

const safeConversionSelect = {
  id: true,
  filename: true,
  imageCount: true,
  createdAt: true,
  pdfPath: true,
} as const;

async function getUsage(userId: string) {
  const aggregate = await prisma.conversion.aggregate({ where: { userId, pdfSize: { not: null } }, _sum: { pdfSize: true } });
  return aggregate._sum.pdfSize ?? 0;
}
function toHistoryRecord(record: { id: string; filename: string; imageCount: number; createdAt: Date; pdfPath: string | null }) {
  return { id: record.id, filename: record.filename, imageCount: record.imageCount, createdAt: record.createdAt, pdfAvailable: Boolean(record.pdfPath) };
}

export const conversionsRouter = Router();

conversionsRouter.use(requireAuthentication, conversionRateLimit);

conversionsRouter.post('/', raw({ type: 'application/pdf', limit: MAX_USER_STORAGE_BYTES }), async (request, response, next) => {
  logConversion('request.received', { contentType: request.get('content-type') ?? null });
  const parsed = conversionSchema.safeParse({ filename: request.get('x-pdf-filename'), imageCount: request.get('x-image-count') });
  if (!parsed.success) return next(new HttpError(400, 'Please provide valid conversion details.'));
  if (!pdfContentType.test(request.get('content-type') ?? '') || !Buffer.isBuffer(request.body) || !isPdf(request.body)) return next(new HttpError(400, 'Please upload a valid PDF.'));
  if (request.body.length > MAX_USER_STORAGE_BYTES) return next(new HttpError(413, 'This PDF is larger than your 100 MB saved-storage limit, so it was not added to History.'));
  const filename = sanitizeFilename(parsed.data.filename);
  const userId = request.auth!.userId;
  logConversion('request.authenticated', { userId, filename, imageCount: parsed.data.imageCount, pdfSize: request.body.length });
  try {
    const result = await serializeForUser(userId, async () => {
      const pdfSize = request.body.length;
      let usage = await getUsage(userId);
      const oldRecords = usage + pdfSize > MAX_USER_STORAGE_BYTES
        ? await prisma.conversion.findMany({ where: { userId, pdfSize: { not: null }, pdfPath: { not: null } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, pdfPath: true, pdfSize: true } }) : [];
      let removedOlderPdfs = false;
      for (const oldRecord of oldRecords) {
        if (usage + pdfSize <= MAX_USER_STORAGE_BYTES) break;
        try { await removePdfs([oldRecord.pdfPath!]); } catch { throw new HttpError(502, 'We could not make room in saved storage. Your PDF is still available locally.'); }
        await prisma.conversion.deleteMany({ where: { id: oldRecord.id, userId } });
        usage -= oldRecord.pdfSize ?? 0;
        removedOlderPdfs = true;
      }
      if (usage + pdfSize > MAX_USER_STORAGE_BYTES) throw new HttpError(413, 'This PDF is larger than your 100 MB saved-storage limit, so it was not added to History.');
      const id = crypto.randomUUID().replaceAll('-', '');
      const pdfPath = `users/${userId}/conversions/${id}.pdf`;
      logConversion('storage.upload.start', { userId, filename, pdfSize });
      try {
        await uploadPdf(pdfPath, request.body);
        logConversion('storage.upload.result', { userId, success: true });
      } catch (error) {
        logConversion('storage.upload.result', { userId, success: false, ...errorDetails(error) });
        throw new HttpError(502, 'PDF created successfully, but it could not be saved to History.');
      }
      try {
        logConversion('prisma.create.start', { userId, filename, imageCount: parsed.data.imageCount, pdfSize });
        const conversion = await prisma.conversion.create({ data: { id, userId, filename, imageCount: parsed.data.imageCount, pdfPath, pdfSize }, select: safeConversionSelect });
        logConversion('prisma.create.result', { userId, conversionId: conversion.id, success: true });
        return { conversion: toHistoryRecord(conversion), storage: { usedBytes: usage + pdfSize, limitBytes: MAX_USER_STORAGE_BYTES }, removedOlderPdfs };
      } catch (error) {
        logConversion('prisma.create.result', { userId, success: false, ...errorDetails(error) });
        try { await removePdfs([pdfPath]); } catch { /* Do not expose storage internals. */ }
        throw error;
      }
    });
    return response.status(201).json(result);
  } catch (error) {
    logConversion('request.failed', { userId, ...errorDetails(error) });
    return next(error);
  }
});

conversionsRouter.get('/', async (request, response, next) => {
  const parsed = historyQuerySchema.safeParse(request.query);
  if (!parsed.success) return next(new HttpError(400, 'Please provide valid pagination parameters.'));

  const { cursor, limit } = parsed.data;
  try {
    // A cursor must belong to this authenticated user. Besides making an
    // invalid cursor deterministic, this keeps pagination scoped exactly as
    // the history itself is scoped.
    if (cursor) {
      const cursorRecord = await prisma.conversion.findFirst({
        where: { id: cursor, userId: request.auth!.userId },
        select: { id: true },
      });
      if (!cursorRecord) return next(new HttpError(400, 'Please provide a valid pagination cursor.'));
    }
    const [conversions, usedBytes] = await Promise.all([
      prisma.conversion.findMany({ where: { userId: request.auth!.userId }, select: safeConversionSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) }),
      getUsage(request.auth!.userId),
    ]);
    const hasMore = conversions.length > limit;
    const items = hasMore ? conversions.slice(0, limit) : conversions;
    return response.json({ conversions: items.map(toHistoryRecord), nextCursor: hasMore ? items.at(-1)?.id ?? null : null, storage: { usedBytes, limitBytes: MAX_USER_STORAGE_BYTES } });
  } catch (error) {
    return next(error);
  }
});

conversionsRouter.get('/:id/download', async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) return next(new HttpError(404, 'PDF not found.'));
  try {
    const conversion = await prisma.conversion.findFirst({ where: { id: id.data, userId: request.auth!.userId }, select: { filename: true, pdfPath: true } });
    if (!conversion || !conversion.pdfPath) return next(new HttpError(404, 'PDF not found.'));
    return response.json({ downloadUrl: await createPdfDownloadUrl(conversion.pdfPath, sanitizeFilename(conversion.filename)), filename: sanitizeFilename(conversion.filename) });
  } catch { return next(new HttpError(502, 'We could not prepare your PDF download.')); }
});

conversionsRouter.get('/:id/preview', async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) return next(new HttpError(404, 'PDF not found.'));
  try {
    const conversion = await prisma.conversion.findFirst({ where: { id: id.data, userId: request.auth!.userId }, select: { pdfPath: true } });
    if (!conversion?.pdfPath) return next(new HttpError(404, 'PDF not found.'));
    return response.json({ previewUrl: await createPdfPreviewUrl(conversion.pdfPath) });
  } catch { return next(new HttpError(502, 'We could not prepare your PDF preview.')); }
});

conversionsRouter.delete('/:id', async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) return next(new HttpError(404, 'PDF not found.'));
  const userId = request.auth!.userId;
  try {
    const result = await serializeForUser(userId, async () => {
      const conversion = await prisma.conversion.findFirst({ where: { id: id.data, userId }, select: { id: true, pdfPath: true } });
      if (!conversion?.pdfPath) throw new HttpError(404, 'PDF not found.');
      try { await removePdfs([conversion.pdfPath]); }
      catch (error) {
        const statusCode = (error as { statusCode?: unknown }).statusCode;
        if (statusCode !== 404 && statusCode !== '404') throw new HttpError(502, 'We could not delete this PDF. Please try again.');
      }
      await prisma.conversion.delete({ where: { id: conversion.id } });
      return { storage: { usedBytes: await getUsage(userId), limitBytes: MAX_USER_STORAGE_BYTES } };
    });
    return response.json(result);
  } catch (error) { return next(error); }
});
