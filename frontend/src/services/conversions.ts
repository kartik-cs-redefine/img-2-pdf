export type ConversionRecord = {
  id: string;
  filename: string;
  imageCount: number;
  createdAt: string;
  pdfAvailable: boolean;
};

export type StorageUsage = { usedBytes: number; limitBytes: number };

type ConversionListResponse = {
  conversions: ConversionRecord[];
  nextCursor: string | null;
  storage: StorageUsage;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');

async function requestConversions<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/conversions${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'We could not update your conversion history.';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const conversionsApi = {
  create(input: { filename: string; imageCount: number; pdf: Blob }) {
    return requestConversions<{ conversion: ConversionRecord; storage: StorageUsage; removedOlderPdfs: boolean }>('/', {
      method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Pdf-Filename': input.filename, 'X-Image-Count': String(input.imageCount) }, body: input.pdf,
    });
  },
  list(cursor?: string) {
    const query = new URLSearchParams({ limit: '12' });
    if (cursor) query.set('cursor', cursor);
    return requestConversions<ConversionListResponse>(`/?${query.toString()}`);
  },
  download(id: string) { return requestConversions<{ downloadUrl: string; filename: string }>(`/${encodeURIComponent(id)}/download`); },
  previewConversion(id: string) { return requestConversions<{ previewUrl: string }>(`/${encodeURIComponent(id)}/preview`); },
  deleteConversion(id: string) { return requestConversions<{ storage: StorageUsage }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};
