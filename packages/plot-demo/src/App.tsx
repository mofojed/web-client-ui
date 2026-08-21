import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultPlotTheme,
  defaultRendererRegistry,
  Plot,
  StreamingDataSource,
  type PlotDataSource,
  type PlotTheme,
} from '@deephaven/plot';
import { examples, getExample } from './examples';
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

export function App(): JSX.Element {
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [rendererChoice, setRendererChoice] = useState<RendererChoice>('auto');
  const [activeRenderer, setActiveRenderer] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [fullFidelity, setFullFidelity] = useState(false);
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

  const sources = useMemo<PlotDataSource[]>(() => {
    const { createSource, plotCount: count = 1 } = getExample(exampleId);
    return Array.from({ length: count }, (_unused, index) =>
      createSource(index, { fullFidelity })
    );
  }, [exampleId, fullFidelity]);

  const startedAtRef = useRef(0);
  const paintedRef = useRef(new Set<number>());

  useEffect(
    function resetOnChange() {
      setActiveRenderer('');
      setError('');
      setIsStreaming(false);
      setFirstFrameMs(null);
      paintedRef.current = new Set();
      startedAtRef.current = performance.now();
      return () => sources.forEach(source => source.close?.());
    },
    [sources, rendererChoice]
  );

  // Only the first paint of each plot counts, so this fires at most once per plot
  const handleFrame = useCallback(
    (index: number) => {
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

  const streamingSources = useMemo(
    () =>
      sources.filter(
        (source): source is StreamingDataSource =>
          source instanceof StreamingDataSource
      ),
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
        {plotCount > 1 && (
          <span className="plot-demo-stats" data-testid="plot-stats">
            {`${plotCount} plots`}
            {totalPoints > 0 && ` · ${totalPoints.toLocaleString()} points`}
            {fullFidelity ? ' · full fidelity' : ' · downsampled'}
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
          Scroll to zoom, drag to pan, double click to reset.
        </p>
      </aside>

      <main className="plot-demo-main">
        {error !== '' && (
          <div className="plot-demo-error" data-testid="plot-error">
            {error}
          </div>
        )}
        <div className={plotCount > 1 ? 'plot-demo-grid' : 'plot-demo-single'}>
          {sources.map((source, index) => (
            <Plot
              // Sources are positional and are recreated whenever the example changes
              // eslint-disable-next-line react/no-array-index-key
              key={`${exampleId}-${rendererChoice}-${index}`}
              className="plot-demo-plot"
              source={source}
              theme={plotCount > 1 ? COMPACT_THEME : undefined}
              rendererPreference={RENDERER_PREFERENCES[rendererChoice]}
              onRendererChanged={setActiveRenderer}
              onFrame={() => handleFrame(index)}
              onError={handleError}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
