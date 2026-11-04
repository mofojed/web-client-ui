import type { PlotDataSource } from '@deephaven/plot';

/** A source the demo can start and stop, such as a generator on a timer. */
export interface StreamableSource {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function isStreamable(
  source: PlotDataSource
): source is PlotDataSource & StreamableSource {
  const candidate = source as Partial<StreamableSource>;
  return (
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.isRunning === 'function'
  );
}
