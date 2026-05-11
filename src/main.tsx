import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';
// Register PWA Service Worker
// registerSW({ immediate: true });

// Global error handler to suppress the "window.fetch" polyfill crash 
// often caused by browser extensions or dev sandboxes intercepting fetch.
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('fetch of #<Window>')) {
    event.preventDefault(); // Suppress the Uncaught TypeError crash
    console.warn('Suppressed window.fetch polyfill error caused by extension/sandbox conflict.');
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

