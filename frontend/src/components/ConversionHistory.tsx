import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Download, Eye, FileText, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { conversionsApi, type ConversionRecord, type StorageUsage } from '../services/conversions';
import { DeletePdfModal } from './DeletePdfModal';
import { PdfPreviewModal } from './PdfPreviewModal';

type ConversionHistoryProps = { refreshKey: number };
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatMegabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function ConversionHistory({ refreshKey }: ConversionHistoryProps) {
  const { status } = useAuth();
  const reduceMotion = useReducedMotion();
  const [records, setRecords] = useState<ConversionRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ConversionRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversionRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = async (cursor?: string) => {
    setIsLoading(true); setError(null);
    try {
      const response = await conversionsApi.list(cursor);
      setRecords((current) => cursor ? [...current, ...response.conversions] : response.conversions);
      setNextCursor(response.nextCursor); setStorage(response.storage);
    } catch { setError('We could not load your conversion history. Please try again.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (status !== 'authenticated') { setRecords([]); setNextCursor(null); setStorage(null); setError(null); setDownloadError(null); return; }
    void load();
  }, [refreshKey, status]);

  const download = async (record: ConversionRecord) => {
    if (!record.pdfAvailable || downloadingIds.includes(record.id)) return;
    setDownloadingIds((current) => [...current, record.id]); setDownloadError(null);
    try {
      const { downloadUrl, filename } = await conversionsApi.download(record.id);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl; anchor.download = filename; anchor.style.display = 'none';
      document.body.append(anchor); anchor.click(); anchor.remove();
    } catch { setDownloadError('We could not download that PDF. Please try again.'); }
    finally { setDownloadingIds((current) => current.filter((id) => id !== record.id)); }
  };

  const preview = async (record: ConversionRecord) => {
    if (!record.pdfAvailable || previewingId) return;
    setPreviewRecord(record); setPreviewUrl(null); setPreviewError(null); setPreviewingId(record.id);
    try { setPreviewUrl((await conversionsApi.previewConversion(record.id)).previewUrl); }
    catch { setPreviewError('Unable to preview this PDF.'); }
    finally { setPreviewingId(null); }
  };
  const closePreview = () => { setPreviewRecord(null); setPreviewUrl(null); setPreviewError(null); };
  const deletePdf = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id); setDeleteError(null);
    try {
      const result = await conversionsApi.deleteConversion(deleteTarget.id);
      setRecords((current) => current.filter((record) => record.id !== deleteTarget.id));
      setStorage(result.storage); setDeleteTarget(null);
    } catch { setDeleteError('We could not delete this PDF. Please try again.'); }
    finally { setDeletingId(null); }
  };

  if (status !== 'authenticated') return null;
  return <>
    <section id="history" className="history-section shell" aria-labelledby="history-heading">
      <motion.div className="section-heading" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: reduceMotion ? 0 : 0.4 }}>
        <p className="eyebrow"><CalendarClock size={14} /> Your workspace</p><h2 id="history-heading">Conversion history</h2><p className="history-lead">A lightweight record of PDFs you create while signed in.</p>
        {storage && <p className="storage-usage">Storage <strong>{formatMegabytes(storage.usedBytes)} / {formatMegabytes(storage.limitBytes)}</strong></p>}
      </motion.div>
      <div className="history-panel" aria-live="polite">
        {isLoading && records.length === 0 && <div className="history-state"><LoaderCircle className="auth-spinner" size={20} /> Loading your history…</div>}
        {error && <div className="history-state history-state--error" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
        {downloadError && <p className="history-download-error" role="alert">{downloadError}</p>}
        {deleteError && <p className="history-download-error" role="alert">{deleteError}</p>}
        {!isLoading && !error && records.length === 0 && <div className="history-state"><FileText size={21} /><span><strong>No conversions yet</strong>Create a PDF while signed in and it will appear here.</span></div>}
        {records.length > 0 && <ul className="history-list">{records.map((record) => <li key={record.id}><FileText aria-hidden="true" size={19} /><div><strong>{record.filename}</strong><span>{record.imageCount} image{record.imageCount === 1 ? '' : 's'} · {formatDate(record.createdAt)}</span></div>{record.pdfAvailable ? <div className="history-actions"><button type="button" className="history-action" onClick={() => void preview(record)} disabled={previewingId === record.id} aria-label={`Preview ${record.filename}`} title="Preview PDF">{previewingId === record.id ? <LoaderCircle className="auth-spinner" size={15} /> : <Eye size={15} />}<span>Preview</span></button><button type="button" className="history-action" onClick={() => void download(record)} disabled={downloadingIds.includes(record.id)} aria-label={`Download ${record.filename}`} title="Download PDF">{downloadingIds.includes(record.id) ? <LoaderCircle className="auth-spinner" size={15} /> : <Download size={15} />}<span>Download</span></button><button type="button" className="history-delete" onClick={() => { setDeleteError(null); setDeleteTarget(record); }} disabled={deletingId === record.id} aria-label={`Delete ${record.filename}`} title="Delete PDF"><Trash2 size={16} /></button></div> : <span className="history-unavailable">PDF unavailable</span>}</li>)}</ul>}
        {nextCursor && <button type="button" className="button button--secondary history-more" onClick={() => void load(nextCursor)} disabled={isLoading}>{isLoading ? 'Loading…' : 'Load more'}</button>}
      </div>
    </section>
    <PdfPreviewModal isOpen={Boolean(previewRecord)} title={previewRecord?.filename ?? 'PDF preview'} source={previewUrl} isLoading={Boolean(previewRecord && previewingId === previewRecord.id)} error={previewError} onClose={closePreview} onRetry={() => { if (previewRecord) void preview(previewRecord); }} />
    <DeletePdfModal filename={deleteTarget?.filename ?? null} isDeleting={Boolean(deleteTarget && deletingId === deleteTarget.id)} onCancel={() => { if (!deletingId) setDeleteTarget(null); }} onConfirm={() => void deletePdf()} />
  </>;
}
