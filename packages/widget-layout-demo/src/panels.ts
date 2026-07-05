import type { PanelRegistry } from '@deephaven/layout';
import { WidgetPanel } from './WidgetPanel';
import { NestedDashboardPanel } from './NestedDashboardPanel';

export const COMPONENTS: PanelRegistry = {
  widget: { component: WidgetPanel },
  dashboard: { component: NestedDashboardPanel },
};

export default COMPONENTS;
