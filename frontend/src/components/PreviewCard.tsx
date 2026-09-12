import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, GripVertical, X } from 'lucide-react';
import type { DragEvent } from 'react';
import type { UploadedImage } from '../types/images';

type PreviewCardProps = {
  image: UploadedImage;
  index: number;
  total: number;
  isDropTarget: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
};

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviewCard({ image, index, total, isDropTarget, onRemove, onMove, onDragStart, onDragEnd, onDragOver, onDragEnter, onDrop }: PreviewCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={`preview-card ${isDropTarget ? 'preview-card--drop-target' : ''}`}
      role="listitem"
      layout
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      draggable
      aria-label={`${image.name}, position ${index + 1} of ${total}. Drag to reorder, or use the move buttons.`}
      onDragStart={() => onDragStart(image.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={() => onDragEnter(image.id)}
      onDrop={(event) => { event.preventDefault(); onDrop(image.id); }}
    >
      <div className="preview-art"><img src={image.previewUrl} alt={`Preview of ${image.name}`} /></div>
      <div className="preview-meta">
        <GripVertical className="drag-handle" size={15} aria-hidden="true" />
        <span className="preview-file"><strong title={image.name}>{image.name}</strong><small>{formatFileSize(image.size)} · {image.type.replace('image/', '').toUpperCase()}</small></span>
        <div className="preview-actions" aria-label={`Actions for ${image.name}`}>
          <button type="button" disabled={index === 0} onClick={() => onMove(image.id, -1)} aria-label={`Move ${image.name} earlier`}><ArrowLeft size={13} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(image.id, 1)} aria-label={`Move ${image.name} later`}><ArrowRight size={13} /></button>
          <button type="button" className="remove-image" onClick={() => onRemove(image.id)} aria-label={`Remove ${image.name}`}><X size={14} /></button>
        </div>
      </div>
    </motion.article>
  );
}
