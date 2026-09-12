import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, FileImage, FolderClock, GripVertical, Images, LockKeyhole, ShieldCheck, Sparkles, Upload, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '../components/Button';
import { ConversionStatus } from '../components/ConversionStatus';
import { DocumentScene } from '../components/DocumentScene';
import { ImageUploader } from '../components/ImageUploader';
import { Navbar } from '../components/Navbar';
import { ConversionHistory } from '../components/ConversionHistory';
import { AuthModal, type AuthMode } from '../components/AuthModal';
import { useAuth } from '../hooks/useAuth';
import { conversionsApi } from '../services/conversions';
import { PreviewCard } from '../components/PreviewCard';
import type { UploadedImage } from '../types/images';
import { convertImagesToPdf, downloadPdf, type ConversionProgress } from '../services/pdfConversion';

const features = [
  { icon: Images, title: 'Multiple images', copy: 'Bring a full set together in one polished PDF.' },
  { icon: Zap, title: 'Fast conversion', copy: 'A focused workflow that keeps your momentum moving.' },
  { icon: ShieldCheck, title: 'Secure & private', copy: 'Your files are handled with privacy at the core.' },
  { icon: FolderClock, title: 'Conversion history', copy: 'Signed-in users can keep completed work close by.' },
];

const steps = [
  { number: '01', title: 'Upload', copy: 'Drop in the images you want to bring together.', icon: Upload },
  { number: '02', title: 'Arrange', copy: 'Set the order that makes your story read naturally.', icon: GripVertical },
  { number: '03', title: 'Download', copy: 'Leave with a tidy PDF, ready to share or save.', icon: FileImage },
];
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const acceptedExtension = /\.(jpe?g|png|webp)$/i;
const maxFileSize = 10 * 1024 * 1024;

export function LandingPage() {
  const { status: authStatus } = useAuth();
  const reduceMotion = useReducedMotion();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<{ blob: Blob; pageCount: number } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const dragSourceId = useRef<string | null>(null);
  const previewUrls = useRef(new Set<string>());
  const rise = { initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: reduceMotion ? 0 : 0.55 } };

  useEffect(() => () => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const handleFilesSelected = (files: File[]) => {
    resetConversion();
    const invalidTypeCount = files.filter((file) => !acceptedTypes.has(file.type) && !(!file.type && acceptedExtension.test(file.name))).length;
    const oversizedCount = files.filter((file) => file.size > maxFileSize).length;
    const validFiles = files.filter((file) => (acceptedTypes.has(file.type) || (!file.type && acceptedExtension.test(file.name))) && file.size <= maxFileSize);
    const messages = [invalidTypeCount ? `${invalidTypeCount} file${invalidTypeCount === 1 ? '' : 's'} skipped: use JPG, PNG, or WEBP.` : '', oversizedCount ? `${oversizedCount} file${oversizedCount === 1 ? '' : 's'} skipped: maximum size is 10 MB.` : ''].filter(Boolean);
    setUploadError(messages.join(' ') || null);
    const nextImages = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { id: crypto.randomUUID(), file, name: file.name, previewUrl, size: file.size, type: file.type || 'image' };
    });
    if (nextImages.length) {
      setImages((current) => [...current, ...nextImages]);
      setStatusMessage(`${nextImages.length} image${nextImages.length === 1 ? '' : 's'} added.`);
    }
  };

  const removeImage = (id: string) => { resetConversion(); setImages((current) => {
    const image = current.find((item) => item.id === id);
    if (image) { URL.revokeObjectURL(image.previewUrl); previewUrls.current.delete(image.previewUrl); setStatusMessage(`${image.name} removed.`); }
    return current.filter((item) => item.id !== id);
  }); };
  const moveImage = (id: string, direction: -1 | 1) => { resetConversion(); setImages((current) => {
    const index = current.findIndex((image) => image.id === id); const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= current.length) return current;
    const next = [...current]; [next[index], next[destination]] = [next[destination], next[index]]; setStatusMessage(`${next[destination].name} moved to position ${destination + 1}.`); return next;
  }); };
  const reorderImages = (targetId: string) => {
    const sourceId = dragSourceId.current; dragSourceId.current = null; setDropTargetId(null); resetConversion();
    if (!sourceId || sourceId === targetId) return;
    setImages((current) => { const sourceIndex = current.findIndex((image) => image.id === sourceId); const targetIndex = current.findIndex((image) => image.id === targetId); if (sourceIndex < 0 || targetIndex < 0) return current; const next = [...current]; const [movedImage] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, movedImage); setStatusMessage(`${movedImage.name} moved to position ${targetIndex + 1}.`); return next; });
  };
  const clearImages = () => { images.forEach((image) => { URL.revokeObjectURL(image.previewUrl); previewUrls.current.delete(image.previewUrl); }); setImages([]); setUploadError(null); resetConversion(); setStatusMessage('All images removed.'); };
  const resetConversion = () => { setConversionError(null); setConversionProgress(null); setPdfResult(null); setHistoryWarning(null); };
  const pdfFilename = () => `pictapdf-${new Date().toISOString().slice(0, 10)}.pdf`;
  const createPdf = async () => {
    if (!images.length || isConverting) return;
    setIsConverting(true); setConversionError(null); setPdfResult(null); setHistoryWarning(null);
    try {
      const result = await convertImagesToPdf([...images], setConversionProgress);
      setPdfResult(result); setStatusMessage(`Your ${result.pageCount}-page PDF is ready to download.`);
      if (authStatus === 'authenticated') {
        void conversionsApi.create({ filename: pdfFilename(), imageCount: images.length })
          .then(() => setHistoryRefreshKey((current) => current + 1))
          .catch(() => setHistoryWarning('Your PDF is ready, but we could not save it to history. You can still download it.'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not create your PDF. Please try again.';
      setConversionError(message); setStatusMessage('PDF creation failed. Please try again.');
    } finally {
      setIsConverting(false); setConversionProgress(null);
    }
  };
  const handleDownload = () => {
    if (!pdfResult) return;
    downloadPdf(pdfResult.blob, pdfFilename());
    setStatusMessage('Your PDF download has started.');
  };

  return (
    <div id="top" className="site-page"><Navbar onOpenAuth={setAuthMode} /><main>
      <section className="hero shell"><motion.div className="hero-copy" {...rise}><p className="eyebrow"><Sparkles size={14} /> Simple by design</p><h1>Turn Images Into <span>PDFs.</span> Instantly.</h1><p className="hero-description">Transform a handful of images into one refined, ready-to-share document—without the friction.</p><div className="hero-actions"><Button href="#converter"><Upload size={17} /> Convert Images to PDF <ArrowRight size={16} /></Button><Button href="#how-it-works" variant="secondary">See How It Works <ArrowRight size={16} /></Button></div><div className="hero-proof"><Check size={16} /> No account needed to get started</div></motion.div><motion.div className="hero-visual" {...rise}><div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" /><DocumentScene /><div className="scene-note scene-note--top"><FileImage size={16} /><span>3 images selected</span></div><div className="scene-note scene-note--bottom"><span className="status-dot" /> Ready to combine</div></motion.div></section>

      <section id="converter" className="converter-section shell"><motion.div className="section-heading section-heading--center" {...rise}><p className="eyebrow">Made for clarity</p><h2>Everything you need, in one calm workspace.</h2></motion.div><motion.div className={`converter ${images.length ? 'converter--has-images' : 'converter--empty'}`} {...rise}>
        <ImageUploader hasImages={images.length > 0} error={uploadError} onFilesSelected={handleFilesSelected} />
        <p className="visually-hidden" aria-live="polite">{statusMessage}</p>
        <AnimatePresence initial={false}>{images.length > 0 && <motion.div className="converter-preview" initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}><div className="preview-toolbar"><div><strong>Ready to arrange</strong><span>Drag cards to reorder, or use the arrow buttons</span></div><span className="count-pill">{images.length} image{images.length === 1 ? '' : 's'}</span></div><div className="preview-grid" role="list" aria-label="Uploaded images in PDF order"><AnimatePresence initial={false}>{images.map((image, index) => <PreviewCard key={image.id} image={image} index={index} total={images.length} isDropTarget={dropTargetId === image.id && dragSourceId.current !== image.id} onRemove={removeImage} onMove={moveImage} onDragStart={(id) => { dragSourceId.current = id; }} onDragEnd={() => { dragSourceId.current = null; setDropTargetId(null); }} onDragOver={(event: DragEvent<HTMLElement>) => event.preventDefault()} onDragEnter={setDropTargetId} onDrop={reorderImages} />)}</AnimatePresence></div><AnimatePresence mode="wait"><ConversionStatus key={isConverting ? 'working' : pdfResult ? 'ready' : conversionError ? 'error' : 'idle'} isConverting={isConverting} progress={conversionProgress} error={conversionError} pageCount={pdfResult?.pageCount ?? 0} pdfSize={pdfResult?.blob.size ?? null} onDownload={handleDownload} onCreateAnother={resetConversion} onRetry={createPdf} /></AnimatePresence><div className="preview-footer"><span><span className="status-dot" /> Order saved for your future PDF</span><div className="preview-footer__actions"><button type="button" onClick={clearImages} disabled={isConverting}>Clear all</button><button type="button" className="button button--primary convert-button" onClick={createPdf} disabled={!images.length || isConverting}>{isConverting ? 'Creating PDF…' : 'Convert to PDF'} <FileImage size={16} /></button></div></div></motion.div>}</AnimatePresence>
        {historyWarning && <p className="conversion-history-warning" role="status">{historyWarning}</p>}
      </motion.div></section>
      <ConversionHistory refreshKey={historyRefreshKey} />

      <section id="features" className="features-section shell"><motion.div className="section-heading" {...rise}><p className="eyebrow">Thoughtful essentials</p><h2>Simple tools. Serious attention to detail.</h2></motion.div><div className="feature-grid">{features.map(({ icon: Icon, title, copy }) => <motion.article className="feature-card" key={title} {...rise}><span className="feature-icon"><Icon size={21} /></span><h3>{title}</h3><p>{copy}</p></motion.article>)}</div></section>
      <section id="how-it-works" className="steps-section"><div className="shell"><motion.div className="section-heading section-heading--center" {...rise}><p className="eyebrow">A better flow</p><h2>From images to PDF in three clear steps.</h2></motion.div><div className="steps-grid">{steps.map(({ number, title, copy, icon: Icon }) => <motion.article className="step" key={title} {...rise}><div className="step-top"><span>{number}</span><Icon size={20} /></div><h3>{title}</h3><p>{copy}</p></motion.article>)}</div></div></section>
      <section id="privacy" className="privacy-section shell"><motion.div className="privacy-panel" {...rise}><div><p className="eyebrow"><LockKeyhole size={14} /> Privacy without a paywall</p><h2>Start as a guest. Keep more when you’re ready.</h2><p>Convert images without creating an account. Sign in when you want a personal record of your completed conversions.</p></div><div className="privacy-points"><span><Check size={16} /> Guest-friendly from the first upload</span><span><Check size={16} /> History for signed-in users</span></div></motion.div></section>
      <section className="final-cta shell"><motion.div {...rise}><p className="eyebrow">Ready when you are</p><h2>Make your images easier to share.</h2><Button href="#converter">Convert Images to PDF <ArrowRight size={16} /></Button></motion.div></section>
    </main><footer className="footer"><div className="shell footer-inner"><a className="brand" href="#top"><span className="brand-mark"><span /></span><span>PictaPDF</span></a><p>Clear documents, minus the clutter.</p><div><a href="#privacy">Privacy</a><a href="#privacy">Terms</a><a href="#how-it-works">How it works</a></div></div></footer><AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} /></div>
  );
}
