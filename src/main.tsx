import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';
// Register PWA Service Worker
// registerSW({ immediate: true });

// Add a safe setter to window.fetch to prevent polyfills from crashing
// when they try to overwrite it (e.g. in sandboxes where fetch only has a getter).
try {
  let _fetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => _fetch,
    set: (val) => {
      // Ignore assignment to avoid "Cannot set property fetch of #<Window> which has only a getter"
    },
    configurable: true
  });
} catch (e) {
  // Ignore
}

// Global error handler to suppress remaining fetch polyfill crashes
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('fetch of #<Window>')) {
    event.preventDefault(); 
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

