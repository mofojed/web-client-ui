import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import Log from '@deephaven/log';
import { AppBootstrap, ThemeBootstrap } from '@deephaven/app-utils';

// TODO: Should probably use the same store from the parent? We're just doing this to set up the React Spectrum context
import { store } from '@deephaven/redux';

const log = Log.module('AppChild');

function AppChild(): JSX.Element {
  useEffect(() => {
    if (window.opener != null) {
      log.info('adding window opener unload listener');
      window.opener.addEventListener('beforeunload', () => {
        log.info('parent window beforeunload');
        window.close();
      });
    } else {
      log.warn('No window opener found, cannot close window on unload');
    }
  }, []);
  return (
    <Provider store={store}>
      <ThemeBootstrap>
        <div
          id="deephaven-portal"
          style={{
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </ThemeBootstrap>
    </Provider>
  );
}

export default AppChild;
