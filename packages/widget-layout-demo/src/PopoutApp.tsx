import { PopoutPanelHost } from '@deephaven/layout';
import COMPONENTS from './panels';

export function PopoutApp(): JSX.Element {
  return <PopoutPanelHost components={COMPONENTS} />;
}

export default PopoutApp;
