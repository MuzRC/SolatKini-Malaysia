import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service worker for offline capability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);
