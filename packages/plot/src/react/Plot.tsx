import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PlotDataSource } from '../model/PlotDataSource';
import type { Bounds } from '../model/PlotTypes';
import type { RendererRegistry } from '../renderers/RendererRegistry';
import type { PlotTheme } from '../theme/PlotTheme';
import { PlotView } from '../view/PlotView';

export interface PlotProps {
  source: PlotDataSource;
  /** Renderer names in order of preference. Defaults to WebGPU then Canvas. */
  rendererPreference?: readonly string[];
  registry?: RendererRegistry;
  theme?: PlotTheme;
  /** Enables wheel zoom, drag pan, and double click reset. Defaults to true. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  onRendererChanged?: (name: string) => void;
  onViewportChanged?: (viewport: Bounds) => void;
  /** Called after every frame the renderer draws. */
  onFrame?: () => void;
  onError?: (error: unknown) => void;
}

const CONTAINER_STYLE: CSSProperties = { width: '100%', height: '100%' };

/**
 * Renders a {@link PlotDataSource}.
 *
 * All of the work happens in {@link PlotView}; this component only manages its
 * lifetime and forwards events.
 */
export function Plot({
  source,
  rendererPreference,
  registry,
  theme,
  interactive,
  className,
  style,
  onRendererChanged,
  onViewportChanged,
  onFrame,
  onError,
}: PlotProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PlotView | null>(null);

  // Latest values are read through refs so changing them does not recreate the view
  const callbacksRef = useRef({
    onRendererChanged,
    onViewportChanged,
    onFrame,
    onError,
  });
  callbacksRef.current = {
    onRendererChanged,
    onViewportChanged,
    onFrame,
    onError,
  };

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(
    function createView() {
      const container = containerRef.current;
      if (container == null) {
        return undefined;
      }
      const plotView = new PlotView(container, source, {
        rendererPreference,
        registry,
        theme: themeRef.current,
        interactive,
      });
      plotView.addEventListener(
        'rendererchanged',
        ({ name }) => callbacksRef.current.onRendererChanged?.(name)
      );
      plotView.addEventListener(
        'viewportchanged',
        ({ viewport }) => callbacksRef.current.onViewportChanged?.(viewport)
      );
      plotView.addEventListener(
        'error',
        ({ error }) => callbacksRef.current.onError?.(error)
      );
      plotView.addEventListener(
        'frame',
        () => callbacksRef.current.onFrame?.()
      );
      plotView.initialize().catch(error => {
        callbacksRef.current.onError?.(error);
      });
      setView(plotView);
      return () => {
        plotView.destroy();
        setView(null);
      };
    },
    [source, rendererPreference, registry, interactive]
  );

  useEffect(
    function applyTheme() {
      if (view != null && theme != null) {
        view.setTheme(theme);
      }
    },
    [view, theme]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={style ?? CONTAINER_STYLE}
    />
  );
}

export default Plot;
