import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const bucket = env.SUPABASE_STORAGE_BUCKET;
const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (env.NODE_ENV === 'development') {
  console.info('[storage.client]', { initialized: true, credential: 'service-role', bucket });
}

let bucketReady: Promise<void> | undefined;

async function ensurePrivateBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await storage.storage.getBucket(bucket);
      if (data) {
        if (data.public) throw new Error('The configured PDF storage bucket must be private.');
        if (env.NODE_ENV === 'development') console.info('[storage.bucket]', { bucket, exists: true, private: true });
        return;
      }
      if (error && error.statusCode !== '404') throw error;
      const { error: createError } = await storage.storage.createBucket(bucket, { public: false });
      if (createError && !/already exists/i.test(createError.message)) throw createError;
      if (env.NODE_ENV === 'development') console.info('[storage.bucket]', { bucket, exists: true, private: true, created: true });
    })().catch((error: unknown) => {
      bucketReady = undefined;
      throw error;
    });
  }
  return bucketReady;
}

export async function uploadPdf(path: string, pdf: Buffer) {
  await ensurePrivateBucket();
  const { error } = await storage.storage.from(bucket).upload(path, pdf, { contentType: 'application/pdf', cacheControl: 'private, max-age=0', upsert: false });
  if (error) throw error;
}

export async function removePdfs(paths: string[]) {
  if (!paths.length) return;
  await ensurePrivateBucket();
  const { error } = await storage.storage.from(bucket).remove(paths);
  if (error) throw error;
}

export async function createPdfDownloadUrl(path: string, filename: string) {
  await ensurePrivateBucket();
  const { data, error } = await storage.storage.from(bucket).createSignedUrl(path, 5 * 60, { download: filename });
  if (error || !data) throw error ?? new Error('Could not prepare PDF download.');
  return data.signedUrl;
}

export async function createPdfPreviewUrl(path: string) {
  await ensurePrivateBucket();
  const { data, error } = await storage.storage.from(bucket).createSignedUrl(path, 2 * 60);
  if (error || !data) throw error ?? new Error('Could not prepare PDF preview.');
  return data.signedUrl;
}
