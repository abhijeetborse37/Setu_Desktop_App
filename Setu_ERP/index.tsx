
// Font Awesome loaded locally to eliminate CDN-caused render-thread blocking
// which was causing the 'frozen input fields' freeze throughout the app.
import '@fortawesome/fontawesome-free/css/all.min.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
// NOTE: StrictMode is intentionally disabled.
// In development, StrictMode double-invokes effects which causes 2 simultaneous
// API calls. With large data payloads (companies, products, customers, transactions),
// this blocks the JS thread and freezes input fields throughout the app.
// We use ErrorBoundary + concurrency guards in App.tsx instead.
root.render(<App />);
