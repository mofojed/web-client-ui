import { useCallback, useMemo, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Dashboard, emitPanelOpen } from '@deephaven/dashboard';
import { useDashboardPlugins } from '@deephaven/plugin';
import type GoldenLayout from '@deephaven/golden-layout';
import type { dh } from '@deephaven/jsapi-types';

/**
 * Golden-layout settings for a single embedded widget: no tab headers and a
 * non-closable panel, so the widget fills the host with no extra chrome.
 */
const LAYOUT_SETTINGS = {
  hasHeaders: false,
  defaultComponentConfig: { isClosable: false },
} as const;

export interface GoldenLayoutWidgetHostProps {
  /** Descriptor of the widget to open. */
  descriptor: dh.ide.VariableDescriptor;
}

/**
 * Hosts a single widget inside a self-contained golden-layout `Dashboard`.
 *
 * Some widget plugins - most notably `deephaven.ui` - are hard-wired to
 * golden-layout: their `ReactPanel` reads `useLayoutManager()` and opens its
 * content into a `PortalPanel` mounted in the layout manager's `root`. Those
 * widgets cannot render on the new `@deephaven/layout` system directly, so we
 * embed a minimal golden-layout dashboard within the new-layout panel and let
 * the standard `WidgetLoaderPlugin` + dashboard plugins open the widget the
 * same way `embed-widget` does.
 */
export function GoldenLayoutWidgetHost({
  descriptor,
}: GoldenLayoutWidgetHostProps): JSX.Element {
  const dashboardPlugins = useDashboardPlugins();
  const layoutRef = useRef<GoldenLayout | null>(null);
  const hasOpenedRef = useRef(false);
  const panelId = useMemo(() => nanoid(), []);

  const handleGoldenLayoutChange = useCallback((goldenLayout: GoldenLayout) => {
    layoutRef.current = goldenLayout;
  }, []);

  const handleLayoutInitialized = useCallback(() => {
    const layout = layoutRef.current;
    if (layout == null || hasOpenedRef.current) {
      return;
    }
    hasOpenedRef.current = true;
    emitPanelOpen(layout.eventHub, {
      panelId,
      widget: { type: descriptor.type, name: descriptor.name },
    });
  }, [descriptor, panelId]);

  return (
    <Dashboard
      layoutSettings={LAYOUT_SETTINGS}
      onGoldenLayoutChange={handleGoldenLayoutChange}
      onLayoutInitialized={handleLayoutInitialized}
    >
      {dashboardPlugins}
    </Dashboard>
  );
}

export default GoldenLayoutWidgetHost;
