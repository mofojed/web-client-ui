import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import '@deephaven/components/scss/BaseStyleSheet.scss';
import { LoadingOverlay } from '@deephaven/components';
import { ApiBootstrap } from '@deephaven/jsapi-bootstrap';
import logInit from './log/LogInit';

logInit();

// Lazy load components for code splitting and also to avoid importing the jsapi-shim before API is bootstrapped.
// eslint-disable-next-line react-refresh/only-export-components
const AppRoot = React.lazy(() => import('./AppRoot'));

// eslint-disable-next-line react-refresh/only-export-components
const AppBootstrap = React.lazy(async () => {
  const module = await import('@deephaven/app-utils');
  return { default: module.AppBootstrap };
});

const apiURL = new URL(
  `${import.meta.env.VITE_CORE_API_URL}/${import.meta.env.VITE_CORE_API_NAME}`,
  document.baseURI
);

const pluginsURL = new URL(
  import.meta.env.VITE_MODULE_PLUGINS_URL,
  document.baseURI
);

async function checkZipSupport() {
  console.log('MJB support.js Buff', typeof Buffer !== 'undefined');
  console.log('MJB blah');
  // console.log('MJB Process is1', process);
  console.log('MJB woo');
  try {
    // console.log('MJB Process is', process);
    const readableStream = await import('readable-stream');
    console.log('MJB readable-stream is', readableStream);
    // console.log('MJB Readable is', readableStream.default.Readable);
    console.log('MJB Readable is', readableStream.Readable);
  } catch (e) {
    console.log('MJB support.js error', e);
  }
}

checkZipSupport();

ReactDOM.render(
  <ApiBootstrap apiUrl={apiURL.href} setGlobally>
    <Suspense fallback={<LoadingOverlay />}>
      <AppBootstrap serverUrl={apiURL.origin} pluginsUrl={pluginsURL.href}>
        <AppRoot />
      </AppBootstrap>
    </Suspense>
  </ApiBootstrap>,
  document.getElementById('root')
);
