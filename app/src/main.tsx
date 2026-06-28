import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { initTelegram } from './telegram.js';
import { App } from './App.js';
import './index.css';

// Инициализируем Telegram WebApp SDK до рендера.
initTelegram();

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

const rootEl = document.getElementById('root');
if (rootEl === null) {
  throw new Error('#root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
