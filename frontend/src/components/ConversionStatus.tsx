import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Download, FileText, ImagePlus, TriangleAlert } from 'lucide-react';
import type { ConversionProgress } from '../services/pdfConversion';

type ConversionStatusProps = {
  error: string | null;
  isConverting: boolean;
  pageCount: number;
  pdfSize: number | null;
  progress: ConversionProgress | null;
  onDownload: () => void;
  onCreateAnother: () => void;
  onRetry: () => void;
};

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function progressLabel(progress: ConversionProgress | null) {
  if (!progress || progress.stage === 'preparing') return 'Preparing images';
  if (progress.stage === 'finalizing') return 'Finalizing';
  return `Building PDF · ${progress.completed} of ${progress.total}`;
}

export function ConversionStatus({ error, isConverting, pageCount, pdfSize, progress, onDownload, onCreateAnother, onRetry }: ConversionStatusProps) {
  const reduceMotion = useReducedMotion();
  const percentage = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

  if (isConverting) {
    return <motion.div className="conversion-status conversion-status--working" role="status" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="conversion-art" aria-hidden="true"><motion.span className="conversion-art__image" animate={reduceMotion ? undefined : { x: [0, 8, 0], rotate: [0, 3, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }} /><motion.span className="conversion-art__document" animate={reduceMotion ? undefined : { x: [0, -5, 0], y: [0, -3, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }} /></div>
      <div className="conversion-copy"><strong>Creating your PDF…</strong><span>{progressLabel(progress)}</span><div className="conversion-progress" aria-label={`${percentage}% complete`}><motion.i initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: reduceMotion ? 0 : 0.25 }} /></div></div><b>{percentage}%</b>
    </motion.div>;
  }

  if (pdfSize !== null) {
    return <motion.div className="conversion-status conversion-status--ready" role="status" initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <CheckCircle2 aria-hidden="true" /><div className="conversion-copy"><strong>Your PDF is ready</strong><span>{pageCount} page{pageCount === 1 ? '' : 's'} · {formatFileSize(pdfSize)}</span></div><div className="conversion-buttons"><button type="button" className="button button--primary" onClick={onDownload}><Download size={16} /> Download PDF</button><button type="button" className="button button--secondary" onClick={onCreateAnother}><ImagePlus size={16} /> Create another</button></div>
    </motion.div>;
  }

  if (error) {
    return <motion.div className="conversion-status conversion-status--error" role="alert" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><TriangleAlert aria-hidden="true" /><div className="conversion-copy"><strong>We couldn’t create your PDF</strong><span>{error}</span></div><button type="button" className="button button--secondary" onClick={onRetry}><FileText size={16} /> Try again</button></motion.div>;
  }

  return null;
}
