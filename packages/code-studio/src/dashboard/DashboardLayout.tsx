import React, { useCallback, useMemo, useRef } from 'react';
import GoldenLayout from 'golden-layout';
import { Provider, useStore } from 'react-redux';
import { PanelManager } from './panels';
import PanelErrorBoundary from './panels/PanelErrorBoundary';

export type DashboardLayoutProps = {
  id: string;
  layout: GoldenLayout;
  children?: React.ReactNode | React.ReactNode[];
};

export const DashboardLayout = ({
  id,
  children,
  layout,
}: DashboardLayoutProps): JSX.Element => {
  const hydrateMap = useMemo(() => new Map(), []);
  const dehydrateMap = useMemo(() => new Map(), []);
  const store = useStore();
  const registerComponent = useCallback(
    (name, ComponentType, hydrate, dehydrate) => {
      hydrateMap.set(name, hydrate);
      dehydrateMap.set(name, dehydrate);

      function renderComponent(
        props: { glContainer: unknown; glEventHub: unknown },
        ref: unknown
      ) {
        // Props supplied by GoldenLayout
        // eslint-disable-next-line react/prop-types
        const { glContainer, glEventHub } = props;
        return (
          <Provider store={store}>
            <PanelErrorBoundary
              glContainer={glContainer}
              glEventHub={glEventHub}
            >
              {/* eslint-disable-next-line react/jsx-props-no-spreading */}
              <ComponentType {...props} ref={ref} />
            </PanelErrorBoundary>
          </Provider>
        );
      }

      const wrappedComponent = React.forwardRef(renderComponent);

      layout.registerComponent(name, wrappedComponent);
    },
    [hydrateMap, dehydrateMap, layout, store]
  );
  const hydrateComponent = useCallback(
    (name, props) => hydrateMap.get(name)?.(props),
    [hydrateMap]
  );
  const dehydrateComponent = useCallback(
    (name, props) => dehydrateMap.get(name)?.(props),
    [dehydrateMap]
  );
  const panelManager = useMemo(
    () => new PanelManager(layout, hydrateComponent, dehydrateComponent),
    [dehydrateComponent, hydrateComponent, layout]
  );

  return (
    <>
      {React.Children.map(children, child =>
        child
          ? React.cloneElement(child, {
              id,
              layout,
              panelManager,
              registerComponent,
            })
          : null
      )}
    </>
  );
};

export default DashboardLayout;
