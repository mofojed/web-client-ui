import {
  AbstractPlotDataSource,
  type SeriesDataRequest,
  type SeriesDataResult,
} from '../model/PlotDataSource';
import {
  getSeriesBounds,
  unionBounds,
  type Bounds,
  type PlotSeriesType,
  type PlotShape,
  type SeriesData,
  type SeriesDescriptor,
  type SeriesStyle,
} from '../model/PlotTypes';
import { minMaxDownsampler, type Downsampler } from '../downsample/Downsampler';

export interface StaticSeriesDefinition {
  id: string;
  name: string;
  type: PlotSeriesType;
  style?: SeriesStyle;
  data: SeriesData;
}

export interface StaticDataSourceOptions {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Defaults to {@link minMaxDownsampler}. */
  downsampler?: Downsampler;
}

/**
 * A source backed entirely by arrays already in memory.
 *
 * Downsampling is applied on request so the renderer only receives the points
 * it can actually resolve, exactly as a server backed source would behave.
 */
export class StaticDataSource extends AbstractPlotDataSource {
  protected seriesData = new Map<string, SeriesData>();

  protected descriptors: SeriesDescriptor[] = [];

  protected options: StaticDataSourceOptions;

  private downsampler: Downsampler;

  constructor(
    series: StaticSeriesDefinition[],
    options: StaticDataSourceOptions = {}
  ) {
    super();
    this.options = options;
    this.downsampler = options.downsampler ?? minMaxDownsampler;
    for (let i = 0; i < series.length; i += 1) {
      const { data, ...descriptor } = series[i];
      this.seriesData.set(descriptor.id, data);
      this.descriptors.push({ ...descriptor, bounds: getSeriesBounds(data) });
    }
  }

  protected getBounds(): Bounds | undefined {
    let bounds: Bounds | undefined;
    for (let i = 0; i < this.descriptors.length; i += 1) {
      bounds = unionBounds(bounds, this.descriptors[i].bounds);
    }
    return bounds;
  }

  protected buildShape(): PlotShape {
    return {
      series: this.descriptors.map(descriptor => ({ ...descriptor })),
      bounds: this.getBounds(),
      title: this.options.title,
      xAxisLabel: this.options.xAxisLabel,
      yAxisLabel: this.options.yAxisLabel,
    };
  }

  async getShape(): Promise<PlotShape> {
    return this.buildShape();
  }

  async requestSeriesData(
    request: SeriesDataRequest
  ): Promise<SeriesDataResult> {
    const data = this.seriesData.get(request.seriesId);
    if (data == null) {
      throw new Error(`Unknown series ${request.seriesId}`);
    }
    const downsampled = this.downsampler(data, request);
    return { data: downsampled, complete: downsampled.length === data.length };
  }
}

export default StaticDataSource;
