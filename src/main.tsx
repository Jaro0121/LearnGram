import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isNative } from './lib/native';
import { toast } from './lib/toast';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);

// Offline support for the web version (the Android app bundles its files already).
if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    // A new version took over: reload once so the user is on the fresh code.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      toast('LearnGram was updated');
      setTimeout(() => location.reload(), 900);
    });
  });
}
