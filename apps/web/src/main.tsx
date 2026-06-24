import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme } from '@vectorforge/ui';
import { App } from './App';
import './index.css';

// Sync the theme store with the data-theme the no-FOUC boot script already set
// (falls back to stored/system preference if the script didn't run).
initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('VectorForge: #root element not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
