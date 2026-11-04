import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultPlotTheme,
  defaultRendererRegistry,
  Plot,
  type PlotDataSource,
  type PlotTheme,
} from '@deephaven/plot';
import {
  DEFAULT_STRESS_OPTIONS,
  examples,
  getExample,
  STRESS_POINT_COUNTS,
  STRESS_POINT_SIZES,
  STRESS_REFRESH_FRACTIONS,
  type ExampleLayout,
  type StressOptions,
} from './examples';
import { PlotCube } from './PlotCube';
import { RollingScatterSource } from './sources/RollingScatterSource';
import { isStreamable } from './sources/StreamableSource';
import './App.scss';

type RendererChoice = 'auto' | 'webgpu' | 'canvas';

/** Stable identities keep the plots from being torn down on every render. */
const RENDERER_PREFERENCES: Record<
  RendererChoice,
  readonly string[] | undefined
> = {
  auto: undefined,
  webgpu: ['webgpu'],
  canvas: ['canvas'],
};

/** Tighter margins so axes still fit in a small grid cell. */
const COMPACT_THEME: PlotTheme = {
  ...defaultPlotTheme,
  fontSize: 9,
  margin: { top: 4, right: 6, bottom: 14, left: 26 },
};

const CUBE_THEME: PlotTheme = {
  ...defaultPlotTheme,
  fontSize: 10,
  margin: { top: 6, right: 10, bottom: 20, left: 38 },
};

const LAYOUT_THEMES: Record<ExampleLayout, PlotTheme | undefined> = {
  single: undefined,
  grid: COMPACT_THEME,
  cube: CUBE_THEME,
};

/** How often the frame rate readout refreshes. */
const FPS_SAMPLE_MS = 500;

function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${value / 1_000_000}M`;
  }
  if (value >= 1_000) {
    return `${value / 1_000}K`;
  }
  return `${value}`;
}

export function App(): JSX.Element {
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [rendererChoice, setRendererChoice] = useState<RendererChoice>('auto');
  const [activeRenderer, setActiveRenderer] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [fullFidelity, setFullFidelity] = useState(false);
  const [stressOptions, setStressOptions] = useState<StressOptions>(
    DEFAULT_STRESS_OPTIONS
  );
  const [fps, setFps] = useState<number | null>(null);
  const [firstFrameMs, setFirstFrameMs] = useState<number | null>(null);
  const [isWebGpuSupported, setIsWebGpuSupported] = useState<boolean | null>(
    null
  );

  useEffect(function probeWebGpu() {
    let cancelled = false;
    defaultRendererRegistry
      .isSupported('webgpu')
      .then(supported => {
        if (!cancelled) {
          setIsWebGpuSupported(supported);
        }
      })
      .catch(() => setIsWebGpuSupported(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const example = getExample(exampleId);
  const plotCount = example.plotCount ?? 1;
  const layout: ExampleLayout =
    example.layout ?? (plotCount > 1 ? 'grid' : 'single');
  const showFps = example.supportsStressControls === true;

  const sources = useMemo<PlotDataSource[]>(() => {
    const { createSource, plotCount: count = 1 } = getExample(exampleId);
    return Array.from({ length: count }, (_unused, index) =>
      createSource(index, { fullFidelity, stress: stressOptions })
    );
  }, [exampleId, fullFidelity, stressOptions]);

  const streamingSources = useMemo(
    () => sources.filter(isStreamable),
    [sources]
  );

  const startedAtRef = useRef(0);
  const paintedRef = useRef(new Set<number>());
  const frameCountRef = useRef(0);

  useEffect(
    function resetOnChange() {
      setActiveRenderer('');
      setError('');
      setFirstFrameMs(null);
      paintedRef.current = new Set();
      startedAtRef.current = performance.now();
      const shouldStart = getExample(exampleId).autoStart === true;
      if (shouldStart) {
        streamingSources.forEach(source => source.start());
      }
      setIsStreaming(shouldStart && streamingSources.length > 0);
      return () => sources.forEach(source => source.close?.());
    },
    [exampleId, sources, streamingSources, rendererChoice]
  );

  useEffect(
    function sampleFrameRate() {
      setFps(null);
      if (!showFps) {
        return undefined;
      }
      frameCountRef.current = 0;
      let sampledAt = performance.now();
      const interval = setInterval(() => {
        const now = performance.now();
        setFps((frameCountRef.current * 1000) / (now - sampledAt));
        frameCountRef.current = 0;
        sampledAt = now;
      }, FPS_SAMPLE_MS);
      return () => clearInterval(interval);
    },
    [showFps, sources, rendererChoice]
  );

  const handleFrame = useCallback(
    (index: number) => {
      if (index === 0) {
        frameCountRef.current += 1;
      }
      // Only the first paint of each plot counts towards the first frame time
      const painted = paintedRef.current;
      if (painted.has(index)) {
        return;
      }
      painted.add(index);
      if (painted.size === sources.length) {
        setFirstFrameMs(performance.now() - startedAtRef.current);
      }
    },
    [sources]
  );

  const handleToggleStreaming = useCallback(() => {
    const shouldStart = !streamingSources.some(source => source.isRunning());
    streamingSources.forEach(source =>
      shouldStart ? source.start() : source.stop()
    );
    setIsStreaming(shouldStart);
  }, [streamingSources]);

  const handleError = useCallback((value: unknown) => {
    setError(value instanceof Error ? value.message : String(value));
  }, []);

  const totalPoints = (example.pointsPerPlot ?? 0) * plotCount;

  const stressSource = sources.find(
    (source): source is RollingScatterSource =>
      source instanceof RollingScatterSource
  );

  const plots = sources.map((source, index) => (
    <Plot
      // Sources are positional and are recreated whenever the example changes
      // eslint-disable-next-line react/no-array-index-key
      key={`${exampleId}-${rendererChoice}-${index}`}
      className="plot-demo-plot"
      source={source}
      theme={LAYOUT_THEMES[layout]}
      // Dragging a face rotates the cube rather than panning the plot
      interactive={layout !== 'cube'}
      rendererPreference={RENDERER_PREFERENCES[rendererChoice]}
      onRendererChanged={setActiveRenderer}
      onFrame={() => handleFrame(index)}
      onError={handleError}
    />
  ));

  return (
    <div className="plot-demo">
      <header className="plot-demo-header">
        <h1>Deephaven Plot Demo</h1>
        <span
          className="plot-demo-active-renderer"
          data-testid="active-renderer"
        >
          {activeRenderer === '' ? 'resolving…' : activeRenderer}
        </span>
        {showFps && stressSource != null && (
          <span className="plot-demo-stats" data-testid="plot-stats">
            {`${stressSource.getPointCount().toLocaleString()} points`}
            {` · ${stressSource
              .getPointsPerTick()
              .toLocaleString()} replaced per frame`}
            {' · full fidelity · '}
            <span data-testid="plot-fps">
              {fps == null ? 'measuring…' : `${Math.round(fps)} fps`}
            </span>
          </span>
        )}
        {plotCount > 1 && (
          <span className="plot-demo-stats" data-testid="plot-stats">
            {`${plotCount} plots`}
            {totalPoints > 0 && ` · ${totalPoints.toLocaleString()} points`}
            {example.supportsFullFidelity === true &&
              (fullFidelity ? ' · full fidelity' : ' · downsampled')}
            {' · first frame '}
            {firstFrameMs == null
              ? 'measuring…'
              : `${Math.round(firstFrameMs)} ms`}
          </span>
        )}
      </header>

      <aside className="plot-demo-sidebar">
        <h2>Example</h2>
        <ul className="plot-demo-examples">
          {examples.map(item => (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`example-${item.id}`}
                className={item.id === exampleId ? 'is-selected' : undefined}
                onClick={() => setExampleId(item.id)}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>

        <h2>
          <label htmlFor="renderer-select">Renderer</label>
        </h2>
        <select
          id="renderer-select"
          data-testid="renderer-select"
          value={rendererChoice}
          onChange={event =>
            setRendererChoice(event.target.value as RendererChoice)
          }
        >
          <option value="auto">Auto (WebGPU, then Canvas)</option>
          <option value="webgpu" data-testid="renderer-option-webgpu">
            {isWebGpuSupported === false
              ? 'WebGPU only (unavailable here)'
              : 'WebGPU only'}
          </option>
          <option value="canvas">Canvas only</option>
        </select>

        {streamingSources.length > 0 && (
          <button
            type="button"
            data-testid="toggle-streaming"
            className="plot-demo-stream-toggle"
            onClick={handleToggleStreaming}
          >
            {isStreaming ? 'Stop stream' : 'Start stream'}
          </button>
        )}

        {example.supportsStressControls === true && (
          <div className="plot-demo-stress-controls">
            <label htmlFor="stress-point-count">Points</label>
            <select
              id="stress-point-count"
              data-testid="stress-point-count"
              value={stressOptions.pointCount}
              onChange={event =>
                setStressOptions(options => ({
                  ...options,
                  pointCount: Number(event.target.value),
                }))
              }
            >
              {STRESS_POINT_COUNTS.map(count => (
                <option key={count} value={count}>
                  {formatCount(count)}
                </option>
              ))}
            </select>

            <label htmlFor="stress-refresh">Replaced per frame</label>
            <select
              id="stress-refresh"
              data-testid="stress-refresh"
              value={stressOptions.refreshFraction}
              onChange={event =>
                setStressOptions(options => ({
                  ...options,
                  refreshFraction: Number(event.target.value),
                }))
              }
            >
              {STRESS_REFRESH_FRACTIONS.map(fraction => (
                <option key={fraction} value={fraction}>
                  {`${fraction * 100}%`}
                </option>
              ))}
            </select>

            <label htmlFor="stress-point-size">Point size</label>
            <select
              id="stress-point-size"
              data-testid="stress-point-size"
              value={stressOptions.pointSize}
              onChange={event =>
                setStressOptions(options => ({
                  ...options,
                  pointSize: Number(event.target.value),
                }))
              }
            >
              {STRESS_POINT_SIZES.map(pointSize => (
                <option key={pointSize} value={pointSize}>
                  {`${pointSize} px`}
                </option>
              ))}
            </select>
          </div>
        )}

        {example.supportsFullFidelity === true && (
          <label className="plot-demo-checkbox" htmlFor="full-fidelity">
            <input
              id="full-fidelity"
              type="checkbox"
              data-testid="toggle-full-fidelity"
              checked={fullFidelity}
              onChange={event => setFullFidelity(event.target.checked)}
            />
            Draw every point (no downsampling)
          </label>
        )}

        <p className="plot-demo-description">{example.description}</p>
        <p className="plot-demo-hint">
          {layout === 'cube'
            ? 'Drag to spin, or focus the cube and use the arrow keys.'
            : 'Scroll to zoom, drag to pan, double click to reset.'}
        </p>
      </aside>

      <main className="plot-demo-main">
        {error !== '' && (
          <div className="plot-demo-error" data-testid="plot-error">
            {error}
          </div>
        )}
        {layout === 'cube' ? (
          <PlotCube faces={plots} labels={example.plotTitles} />
        ) : (
          <div
            className={
              layout === 'grid' ? 'plot-demo-grid' : 'plot-demo-single'
            }
          >
            {plots}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
