import { createRoot } from 'react-dom/client';
import App from './App';
import './index.scss';

const rootElement = document.getElementById('root');
if (rootElement == null) {
  throw new Error('Missing #root element in index.html');
}
createRoot(rootElement).render(<App />);
