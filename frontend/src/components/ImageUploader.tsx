import { motion, useReducedMotion } from 'framer-motion';
import { ImagePlus, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

type ImageUploaderProps = {
  hasImages: boolean;
  error: string | null;
  onFilesSelected: (files: File[]) => void;
};

export function ImageUploader({ hasImages, error, onFilesSelected }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const reduceMotion = useReducedMotion();
  const openFilePicker = () => inputRef.current?.click();
  const addFiles = (files: FileList | File[]) => onFilesSelected(Array.from(files));
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <motion.div
      className={`dropzone ${hasImages ? 'dropzone--compact' : ''} ${isDragging ? 'dropzone--dragging' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={hasImages ? 'Add more images' : 'Upload images'}
      aria-describedby={error ? 'upload-help upload-error' : 'upload-help'}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
      onDrop={handleDrop}
      whileHover={reduceMotion ? undefined : { scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
    >
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
      <span className="upload-icon"><Upload size={24} /></span>
      <h3>{isDragging ? 'Drop images to add them' : hasImages ? 'Add more images' : 'Drop your images here'}</h3>
      <p>{hasImages ? 'Drop files here or choose more from your device' : 'or choose them from your device'}</p>
      <span className="button button--primary" aria-hidden="true"><ImagePlus size={16} /> {hasImages ? 'Add Images' : 'Upload Images'}</span>
      <small id="upload-help">JPG, PNG, WEBP · Up to 10 MB each</small>
      {error && <p id="upload-error" className="upload-error" role="alert">{error}</p>}
    </motion.div>
  );
}
