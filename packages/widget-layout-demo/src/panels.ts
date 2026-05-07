import type { PanelRegistry } from '@deephaven/layout';
import { WidgetPanel } from './WidgetPanel';

export const COMPONENTS: PanelRegistry = {
  widget: { component: WidgetPanel },
};

export default COMPONENTS;
