import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, LoaderCircle, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export type AuthMode = 'login' | 'register';

type AuthModalProps = {
  mode: AuthMode | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

type FormValues = { name: string; email: string; password: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues, mode: AuthMode) {
  if (mode === 'register' && values.name.trim().length < 2) return 'Enter your name using at least 2 characters.';
  if (!emailPattern.test(values.email.trim())) return 'Enter a valid email address.';
  if (values.password.length < 8) return 'Use a password with at least 8 characters.';
  return null;
}

export function AuthModal({ mode, onClose, onModeChange }: AuthModalProps) {
  const { login, register } = useAuth();
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const firstInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<FormValues>({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedInName, setSignedInName] = useState('');

  useEffect(() => {
    if (!mode) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setValues({ name: '', email: '', password: '' });
    setError(null);
    setSuccess(null);
    setSignedInName('');
    const timer = window.setTimeout(() => firstInput.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, mode, onClose]);

  useEffect(() => {
    if (!mode || !success) return;
    const timer = window.setTimeout(onClose, reduceMotion ? 700 : 900);
    return () => window.clearTimeout(timer);
  }, [mode, onClose, reduceMotion, success]);

  const changeValue = (field: keyof FormValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const switchMode = () => onModeChange(mode === 'login' ? 'register' : 'login');
  const restoreFocus = () => {
    const authenticatedControl = document.querySelector<HTMLElement>('[data-authenticated-control]');
    (authenticatedControl?.isConnected ? authenticatedControl : returnFocus.current)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mode || isSubmitting) return;
    const validationError = validate(values, mode);
    if (validationError) { setError(validationError); return; }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const authenticatedUser = mode === 'login'
        ? await login({ email: values.email.trim(), password: values.password })
        : await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      setSignedInName(authenticatedUser.name.split(' ')[0]);
      setSuccess(mode === 'login' ? 'Welcome back!' : 'Account created!');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'We could not complete that request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence onExitComplete={restoreFocus}>
      {mode && <motion.div className="auth-overlay" role="presentation" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
        <motion.section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby={headingId} initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
          <button className="auth-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close authentication dialog"><X size={19} /></button>
          <AnimatePresence mode="wait" initial={false}>
            {success ? <motion.div key="success" className="auth-success" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.12 : 0.24 }}>
              <motion.span className="auth-success__mark" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduceMotion ? 0 : 0.08, duration: reduceMotion ? 0.12 : 0.28, type: reduceMotion ? 'tween' : 'spring', stiffness: 260, damping: 18 }}><Check size={27} strokeWidth={2.5} /></motion.span>
              <p className="eyebrow">Signed in</p>
              <h2 id={headingId}>{success}</h2>
              <p className="auth-success__identity" role="status">You’re signed in as {signedInName}.</p>
            </motion.div> : <motion.div key="form" initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.16 }}>
              <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your space'}</p>
              <h2 id={headingId}>{mode === 'login' ? 'Sign in to PictaPDF' : 'Start with a free account'}</h2>
              <p className="auth-intro">{mode === 'login' ? 'Your next document is ready when you are.' : 'Keep your account ready for the features ahead.'}</p>
              <form className="auth-form" onSubmit={submit} noValidate>
                {mode === 'register' && <label>Name<input ref={firstInput} value={values.name} onChange={(event) => changeValue('name', event.target.value)} autoComplete="name" required minLength={2} disabled={isSubmitting} /></label>}
                <label>Email<input ref={mode === 'login' ? firstInput : undefined} value={values.email} onChange={(event) => changeValue('email', event.target.value)} type="email" autoComplete="email" inputMode="email" required disabled={isSubmitting} /></label>
                <label>Password<input value={values.password} onChange={(event) => changeValue('password', event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required disabled={isSubmitting} /></label>
                {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
                <button className="button button--primary auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="auth-spinner" size={17} /> Please wait</> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>}</button>
              </form>
              <p className="auth-switch">{mode === 'login' ? 'New to PictaPDF?' : 'Already have an account?'} <button type="button" onClick={switchMode} disabled={isSubmitting}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
            </motion.div>}
          </AnimatePresence>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  );
}
