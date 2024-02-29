import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';

// Lazy load components for code splitting and also to avoid importing the jsapi-shim before API is bootstrapped.
// eslint-disable-next-line react-refresh/only-export-components
const App = React.lazy(() => import('./App'));

ReactDOM.render(
  <Suspense fallback="Loading ...">
    <App />
  </Suspense>,
  document.getElementById('root')
);
