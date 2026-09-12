import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import './styles/index.css';
import './styles/theme.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider><LandingPage /></AuthProvider>
  </StrictMode>,
);
