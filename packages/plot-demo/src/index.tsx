import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { logInit } from '@deephaven/log';
import App from './App';

logInit(parseInt(import.meta.env.VITE_LOG_LEVEL ?? '2', 10), false);

const container = document.getElementById('root');
if (container == null) {
  throw new Error('Unable to find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
