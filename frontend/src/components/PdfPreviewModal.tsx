import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FileWarning, LoaderCircle, RotateCw, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

type PdfPreviewModalProps = {
  error?: string | null;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  source: string | null;
  title: string;
};

export function PdfPreviewModal({ error, isLoading = false, isOpen, onClose, onRetry, source, title }: PdfPreviewModalProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => closeButton.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const dialog = closeButton.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), iframe')).filter((element) => !element.hasAttribute('hidden')) : [];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKeyDown); returnFocus.current?.focus(); };
  }, [isOpen]);

  return <AnimatePresence>
    {isOpen && <motion.div className="pdf-preview-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section className="pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
        <div className="pdf-preview-header"><h2 id={titleId}>{title}</h2><button ref={closeButton} className="pdf-preview-close" type="button" onClick={onClose} aria-label="Close PDF preview"><X size={19} /></button></div>
        <div className="pdf-preview-content">
          {isLoading && <div className="pdf-preview-state" role="status"><LoaderCircle className="auth-spinner" size={22} /> Loading PDF...</div>}
          {!isLoading && error && <div className="pdf-preview-state pdf-preview-state--error" role="alert"><FileWarning size={22} /><span>Unable to preview this PDF.</span>{onRetry && <button className="button button--secondary" type="button" onClick={onRetry}><RotateCw size={15} /> Try again</button>}</div>}
          {!isLoading && !error && source && <iframe className="pdf-preview-frame" src={source} title={`Preview of ${title}`} />}
        </div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
