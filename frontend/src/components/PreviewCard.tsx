import { GripVertical, X } from 'lucide-react';

type PreviewCardProps = { name: string; tone: 'blue' | 'peach' | 'sand' };

export function PreviewCard({ name, tone }: PreviewCardProps) {
  return (
    <article className="preview-card">
      <div className={`preview-art preview-art--${tone}`}>
        <span className="art-sun" />
        <span className="art-mountain art-mountain--back" />
        <span className="art-mountain" />
      </div>
      <div className="preview-meta">
        <GripVertical size={15} aria-hidden="true" />
        <span>{name}</span>
        <button type="button" aria-label={`Remove ${name}`}><X size={14} /></button>
      </div>
    </article>
  );
}
