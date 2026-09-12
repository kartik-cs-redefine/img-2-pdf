import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

type DeletePdfModalProps = { filename: string | null; isDeleting: boolean; onCancel: () => void; onConfirm: () => void; };

export function DeletePdfModal({ filename, isDeleting, onCancel, onConfirm }: DeletePdfModalProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const isDeletingRef = useRef(isDeleting);

  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { isDeletingRef.current = isDeleting; }, [isDeleting]);

  useEffect(() => {
    if (!filename) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => cancelButton.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeletingRef.current) { event.preventDefault(); onCancelRef.current(); }
      if (event.key !== 'Tab') return;
      const dialog = cancelButton.current?.closest<HTMLElement>('[role="alertdialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')) : [];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKeyDown); returnFocus.current?.focus(); };
  }, [filename]);

  return <AnimatePresence>
    {filename && <motion.div className="pdf-preview-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) onCancel(); }}>
      <motion.section className="delete-pdf-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
        <button className="pdf-preview-close" type="button" onClick={onCancel} disabled={isDeleting} aria-label="Close delete confirmation"><X size={19} /></button>
        <span className="delete-pdf-icon"><Trash2 size={21} /></span><h2 id={titleId}>Delete PDF?</h2><p id={descriptionId}>Are you sure you want to delete <strong>{filename}</strong>? This will permanently remove the saved PDF from your History.</p>
        <div className="delete-pdf-actions"><button ref={cancelButton} className="button button--secondary" type="button" onClick={onCancel} disabled={isDeleting}>Cancel</button><button className="button button--danger" type="button" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? <><LoaderCircle className="auth-spinner" size={16} /> Deleting</> : <><Trash2 size={16} /> Delete PDF</>}</button></div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
