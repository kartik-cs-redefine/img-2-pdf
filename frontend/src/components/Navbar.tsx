import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

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
          <a href="#privacy" onClick={closeMenu}>Login</a>
          <Button href="#converter" variant="primary" onClick={closeMenu}>Start converting</Button>
        </div>
        <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
    </header>
  );
}
