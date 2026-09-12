import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Button } from './Button';

type NavbarProps = { onOpenAuth: (mode: 'login' | 'register') => void };

export function Navbar({ onOpenAuth }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { status, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const authTransition = { duration: reduceMotion ? 0.12 : 0.2 };
  const closeMenu = () => setOpen(false);
  const openAuth = (mode: 'login' | 'register') => { setLogoutError(null); closeMenu(); onOpenAuth(mode); };
  const handleLogout = async () => {
    setLogoutError(null);
    try { await logout(); closeMenu(); } catch { setLogoutError('We could not sign you out. Please try again.'); }
  };

  return (
    <header className="site-header">
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" onClick={closeMenu} aria-label="PictaPDF home">
          <span className="brand-mark"><span /></span>
          <span>PictaPDF</span>
        </a>
        <div className={`nav-links ${open ? 'nav-links--open' : ''}`}>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          {status === 'authenticated' && <a href="#history" onClick={closeMenu}>History</a>}
          {status === 'checking' && <span className="nav-auth-loading" aria-live="polite">Checking session…</span>}
          <AnimatePresence initial={false} mode="wait">
            {status === 'guest' && <motion.div key="guest" className="nav-auth-state" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 5 }} transition={authTransition}><button className="nav-auth-link" type="button" onClick={() => openAuth('login')}>Login</button><Button type="button" variant="primary" onClick={() => openAuth('register')}>Get started</Button></motion.div>}
            {status === 'authenticated' && user && <motion.div key="authenticated" className="nav-account" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 5 }} transition={authTransition}><span title={user.email}>Hi, {user.name.split(' ')[0]}</span><button type="button" data-authenticated-control onClick={handleLogout}><LogOut size={15} /> Logout</button></motion.div>}
          </AnimatePresence>
          {logoutError && <span className="nav-auth-error" role="alert">{logoutError}</span>}
        </div>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
        </button>
        <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
    </header>
  );
}
