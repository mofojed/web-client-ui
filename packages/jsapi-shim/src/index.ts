// The Deephaven API script isn't packaged as a module (yet), and is just included in index.html, exported to the global namespace
// This include file is simply a wrapper so that it behaves like a module, and can be mocked easily for unit tests
import type dhType from './dh.types';

declare global {
  // eslint-disable-next-line vars-on-top,no-var
  var dh: dhType;
}

await new Promise((resolve, reject) => {
  // If we already have the JS API set in the global context, just use that
  if (globalThis.dh != null) {
    resolve(globalThis.dh);
    return;
  }

  function messageListener(event: MessageEvent) {
    if (event.data?.event === '@deephaven/jsapi-shim/EventAPILoadSuccess') {
      globalThis.removeEventListener('message', messageListener);
      resolve(globalThis.dh);
    }
    if (event.data?.event === '@deephaven/jsapi-shim/EventAPILoadFailure') {
      globalThis.removeEventListener('message', messageListener);
      reject(event.data?.payload ?? new Error('Unknown import error'));
    }
  }

  globalThis.addEventListener('message', messageListener);
});

export const { dh } = globalThis;

export default dh;
// export { default as dh } from './dh';
export { default as PropTypes } from './PropTypes';
export * from './dh.types';
export type { default as dhType } from './dh.types';
