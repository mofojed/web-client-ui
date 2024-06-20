import { useEffect, useState } from 'react';
import { type WidgetComponentProps } from '@deephaven/plugin';
import { type dh } from '@deephaven/jsapi-types';
import { useApi } from '@deephaven/jsapi-bootstrap';
import {
  IrisGrid,
  IrisGridModelFactory,
  type IrisGridModel,
} from '@deephaven/iris-grid';
import { useSelector } from 'react-redux';
import { getSettings, RootState } from '@deephaven/redux';

export function GridWidgetPlugin(
  props: WidgetComponentProps<dh.Table>
): JSX.Element | null {
  const dh = useApi();
  const settings = useSelector(getSettings<RootState>);
  const [model, setModel] = useState<IrisGridModel>();

  const { fetch } = props;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const table = await fetch();
      const newModel = await IrisGridModelFactory.makeModel(dh, table);
      if (!cancelled) {
        setModel(newModel);
      }

      function handleKillTable() {
        table.close();
      }

      window.addEventListener('dhKillTable', handleKillTable);
      return () => window.removeEventListener('dhKillTable', handleKillTable);
    }

    const promiseCleanup = init();

    return () => {
      promiseCleanup.then(cleanup => cleanup());
      cancelled = true;
    };
  }, [dh, fetch]);

  return model ? <IrisGrid model={model} settings={settings} /> : null;
}

(window as any).dhKillTable = () => {
  window.dispatchEvent(new Event('dhKillTable'));
};

window.addEventListener('keypress', event => {
  // Listen for Ctrl+Shift+K to kill the table, or Cmd+Shift+K on Mac
  if (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === 'k'
  ) {
    window.dispatchEvent(new Event('dhKillTable'));
  }
});

export default GridWidgetPlugin;
