import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, FileImage, FolderClock, GripVertical, Images, LockKeyhole, ShieldCheck, Sparkles, Upload, Zap } from 'lucide-react';
import { Button } from '../components/Button';
import { DocumentScene } from '../components/DocumentScene';
import { Navbar } from '../components/Navbar';
import { PreviewCard } from '../components/PreviewCard';

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

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const rise = {
    initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduceMotion ? 0 : 0.55 },
  };

  return (
    <div id="top" className="site-page">
      <Navbar />
      <main>
        <section className="hero shell">
          <motion.div className="hero-copy" {...rise}>
            <p className="eyebrow"><Sparkles size={14} /> Simple by design</p>
            <h1>Turn Images Into <span>PDFs.</span> Instantly.</h1>
            <p className="hero-description">Transform a handful of images into one refined, ready-to-share document—without the friction.</p>
            <div className="hero-actions">
              <Button href="#converter"><Upload size={17} /> Convert Images to PDF <ArrowRight size={16} /></Button>
              <Button href="#how-it-works" variant="secondary">See How It Works <ArrowRight size={16} /></Button>
            </div>
            <div className="hero-proof"><Check size={16} /> No account needed to get started</div>
          </motion.div>
          <motion.div className="hero-visual" {...rise}>
            <div className="hero-orbit hero-orbit--one" />
            <div className="hero-orbit hero-orbit--two" />
            <DocumentScene />
            <div className="scene-note scene-note--top"><FileImage size={16} /><span>3 images selected</span></div>
            <div className="scene-note scene-note--bottom"><span className="status-dot" /> Ready to combine</div>
          </motion.div>
        </section>

        <section id="converter" className="converter-section shell">
          <motion.div className="section-heading section-heading--center" {...rise}>
            <p className="eyebrow">Made for clarity</p>
            <h2>Everything you need, in one calm workspace.</h2>
          </motion.div>
          <motion.div className="converter" {...rise}>
            <div className="dropzone" tabIndex={0} role="button" aria-label="Visual upload area">
              <span className="upload-icon"><Upload size={24} /></span>
              <h3>Drop your images here</h3>
              <p>or choose them from your device</p>
              <Button><Upload size={16} /> Upload Images</Button>
              <small>JPG, PNG, WEBP · Add multiple images at once</small>
            </div>
            <div className="converter-preview">
              <div className="preview-toolbar"><div><strong>Ready to arrange</strong><span>Drag cards to reorder</span></div><span className="count-pill">3 images</span></div>
              <div className="preview-grid"><PreviewCard name="coastline.jpg" tone="blue" /><PreviewCard name="morning.jpg" tone="peach" /><PreviewCard name="gallery.jpg" tone="sand" /></div>
              <div className="preview-footer"><span><span className="status-dot" /> All set for conversion</span><button type="button">Clear all</button></div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="features-section shell">
          <motion.div className="section-heading" {...rise}><p className="eyebrow">Thoughtful essentials</p><h2>Simple tools. Serious attention to detail.</h2></motion.div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, copy }) => <motion.article className="feature-card" key={title} {...rise}><span className="feature-icon"><Icon size={21} /></span><h3>{title}</h3><p>{copy}</p></motion.article>)}
          </div>
        </section>

        <section id="how-it-works" className="steps-section"><div className="shell"><motion.div className="section-heading section-heading--center" {...rise}><p className="eyebrow">A better flow</p><h2>From images to PDF in three clear steps.</h2></motion.div><div className="steps-grid">{steps.map(({ number, title, copy, icon: Icon }) => <motion.article className="step" key={title} {...rise}><div className="step-top"><span>{number}</span><Icon size={20} /></div><h3>{title}</h3><p>{copy}</p></motion.article>)}</div></div></section>

        <section id="privacy" className="privacy-section shell"><motion.div className="privacy-panel" {...rise}><div><p className="eyebrow"><LockKeyhole size={14} /> Privacy without a paywall</p><h2>Start as a guest. Keep more when you’re ready.</h2><p>Convert images without creating an account. Sign in when you want a personal record of your completed conversions.</p></div><div className="privacy-points"><span><Check size={16} /> Guest-friendly from the first upload</span><span><Check size={16} /> History for signed-in users</span></div></motion.div></section>

        <section className="final-cta shell"><motion.div {...rise}><p className="eyebrow">Ready when you are</p><h2>Make your images easier to share.</h2><Button href="#converter">Convert Images to PDF <ArrowRight size={16} /></Button></motion.div></section>
      </main>
      <footer className="footer"><div className="shell footer-inner"><a className="brand" href="#top"><span className="brand-mark"><span /></span><span>PictaPDF</span></a><p>Clear documents, minus the clutter.</p><div><a href="#privacy">Privacy</a><a href="#privacy">Terms</a><a href="#how-it-works">How it works</a></div></div></footer>
    </div>
  );
}
