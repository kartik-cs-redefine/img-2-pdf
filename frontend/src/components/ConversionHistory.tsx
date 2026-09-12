import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, FileText, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { conversionsApi, type ConversionRecord } from '../services/conversions';

type ConversionHistoryProps = { refreshKey: number };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function ConversionHistory({ refreshKey }: ConversionHistoryProps) {
  const { status } = useAuth();
  const reduceMotion = useReducedMotion();
  const [records, setRecords] = useState<ConversionRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (cursor?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await conversionsApi.list(cursor);
      setRecords((current) => cursor ? [...current, ...response.conversions] : response.conversions);
      setNextCursor(response.nextCursor);
    } catch {
      setError('We could not load your conversion history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') {
      setRecords([]);
      setNextCursor(null);
      setError(null);
      return;
    }
    void load();
  }, [refreshKey, status]);

  if (status !== 'authenticated') return null;

  return (
    <section id="history" className="history-section shell" aria-labelledby="history-heading">
      <motion.div className="section-heading" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: reduceMotion ? 0 : 0.4 }}>
        <p className="eyebrow"><CalendarClock size={14} /> Your workspace</p><h2 id="history-heading">Conversion history</h2><p className="history-lead">A lightweight record of PDFs you create while signed in.</p>
      </motion.div>
      <div className="history-panel" aria-live="polite">
        {isLoading && records.length === 0 && <div className="history-state"><LoaderCircle className="auth-spinner" size={20} /> Loading your history…</div>}
        {error && <div className="history-state history-state--error" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
        {!isLoading && !error && records.length === 0 && <div className="history-state"><FileText size={21} /><span><strong>No conversions yet</strong>Create a PDF while signed in and it will appear here.</span></div>}
        {records.length > 0 && <ul className="history-list">{records.map((record) => <li key={record.id}><FileText aria-hidden="true" size={19} /><div><strong>{record.filename}</strong><span>{record.imageCount} image{record.imageCount === 1 ? '' : 's'} · {formatDate(record.createdAt)}</span></div></li>)}</ul>}
        {nextCursor && <button type="button" className="button button--secondary history-more" onClick={() => void load(nextCursor)} disabled={isLoading}>{isLoading ? 'Loading…' : 'Load more'}</button>}
      </div>
    </section>
  );
}
