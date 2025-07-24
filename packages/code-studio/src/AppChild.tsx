import React, { useEffect } from 'react';
import Log from '@deephaven/log';

// TODO: We'd need to import the proper theme files
import '@deephaven/components/scss/theme-hack.scss';

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
  );
}

export default AppChild;
