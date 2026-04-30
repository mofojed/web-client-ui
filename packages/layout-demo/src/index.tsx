import { createRoot } from 'react-dom/client';
import { PopoutPanelHost, parsePopoutParams } from '@deephaven/layout';
import App from './App';
import COMPONENTS from './panels';
import './index.scss';

const rootElement = document.getElementById('root');
if (rootElement == null) {
  throw new Error('Missing #root element in index.html');
}

const popoutParams = parsePopoutParams(window.location.search);
if (popoutParams != null) {
  // child popout window — render only the popped-out panel
  createRoot(rootElement).render(<PopoutPanelHost components={COMPONENTS} />);
} else {
  createRoot(rootElement).render(<App />);
}
