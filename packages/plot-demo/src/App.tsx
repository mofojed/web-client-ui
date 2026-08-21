import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plot,
  StreamingDataSource,
  type PlotDataSource,
} from '@deephaven/plot';
import { examples, getExample } from './examples';
import './App.scss';

type RendererChoice = 'auto' | 'webgpu' | 'canvas';

/** Stable identities keep the plot from being torn down on every render. */
const RENDERER_PREFERENCES: Record<
  RendererChoice,
  readonly string[] | undefined
> = {
  auto: undefined,
  webgpu: ['webgpu'],
  canvas: ['canvas'],
};

export function App(): JSX.Element {
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [rendererChoice, setRendererChoice] = useState<RendererChoice>('auto');
  const [activeRenderer, setActiveRenderer] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const example = getExample(exampleId);
  const source = useMemo<PlotDataSource>(
    () => getExample(exampleId).createSource(),
    [exampleId]
  );

  useEffect(
    function closeSourceOnChange() {
      return () => source.close?.();
    },
    [source]
  );

  useEffect(
    function resetStateOnChange() {
      setActiveRenderer('');
      setError('');
      setIsStreaming(false);
    },
    [source, rendererChoice]
  );

  const streamingSource =
    source instanceof StreamingDataSource ? source : undefined;

  const handleToggleStreaming = useCallback(() => {
    if (streamingSource == null) {
      return;
    }
    if (streamingSource.isRunning()) {
      streamingSource.stop();
      setIsStreaming(false);
    } else {
      streamingSource.start();
      setIsStreaming(true);
    }
  }, [streamingSource]);

  const handleError = useCallback((value: unknown) => {
    setError(value instanceof Error ? value.message : String(value));
  }, []);

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
          <option value="webgpu">WebGPU only</option>
          <option value="canvas">Canvas only</option>
        </select>

        {streamingSource != null && (
          <button
            type="button"
            data-testid="toggle-streaming"
            className="plot-demo-stream-toggle"
            onClick={handleToggleStreaming}
          >
            {isStreaming ? 'Stop stream' : 'Start stream'}
          </button>
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
        <Plot
          key={`${exampleId}-${rendererChoice}`}
          className="plot-demo-plot"
          source={source}
          rendererPreference={RENDERER_PREFERENCES[rendererChoice]}
          onRendererChanged={setActiveRenderer}
          onError={handleError}
        />
      </main>
    </div>
  );
}

export default App;
