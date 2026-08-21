import Log from '@deephaven/log';
import type { PlotSeriesType } from '../model/PlotTypes';
import type { PlotRendererFactory } from './PlotRenderer';

const log = Log.module('RendererRegistry');

export interface RendererResolveOptions {
  /**
   * Renderer names in order of preference. The first one that is supported and
   * can draw every required series type wins.
   */
  preference?: readonly string[];
  /** Series types the plot needs. Defaults to no requirement. */
  seriesTypes?: readonly PlotSeriesType[];
}

function canDraw(
  factory: PlotRendererFactory,
  seriesTypes: readonly PlotSeriesType[]
): boolean {
  for (let i = 0; i < seriesTypes.length; i += 1) {
    if (!factory.capabilities.seriesTypes.includes(seriesTypes[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Holds the available renderers and picks one for a plot.
 *
 * Support is probed asynchronously (WebGPU adapter requests are async) and
 * cached, so resolving is cheap after the first call.
 */
export class RendererRegistry {
  private factories = new Map<string, PlotRendererFactory>();

  private supportCache = new Map<string, Promise<boolean>>();

  register(factory: PlotRendererFactory): void {
    this.factories.set(factory.name, factory);
    this.supportCache.delete(factory.name);
  }

  unregister(name: string): void {
    this.factories.delete(name);
    this.supportCache.delete(name);
  }

  get(name: string): PlotRendererFactory | undefined {
    return this.factories.get(name);
  }

  getNames(): string[] {
    return Array.from(this.factories.keys());
  }

  isSupported(name: string): Promise<boolean> {
    const factory = this.factories.get(name);
    if (factory == null) {
      return Promise.resolve(false);
    }
    let supported = this.supportCache.get(name);
    if (supported == null) {
      supported = factory.isSupported().catch(error => {
        log.warn(`Renderer ${name} support check failed`, error);
        return false;
      });
      this.supportCache.set(name, supported);
    }
    return supported;
  }

  /**
   * Returns the first preferred renderer that is supported and capable, or
   * undefined if none match.
   */
  async resolve({
    preference,
    seriesTypes = [],
  }: RendererResolveOptions = {}): Promise<PlotRendererFactory | undefined> {
    const names = preference ?? this.getNames();
    for (let i = 0; i < names.length; i += 1) {
      const factory = this.factories.get(names[i]);
      if (factory != null && canDraw(factory, seriesTypes)) {
        // Probes must run in preference order, so awaiting in the loop is intentional
        // eslint-disable-next-line no-await-in-loop
        if (await this.isSupported(factory.name)) {
          return factory;
        }
        log.debug(`Renderer ${factory.name} is not supported, trying next`);
      }
    }
    return undefined;
  }

  /**
   * Explains, in preference order, why each candidate was rejected.
   *
   * Only meaningful after {@link resolve} returned undefined. Support results
   * are cached, so this does not re-probe.
   */
  async describeUnavailable({
    preference,
    seriesTypes = [],
  }: RendererResolveOptions = {}): Promise<string> {
    const names = preference ?? this.getNames();
    if (names.length === 0) {
      return 'no renderers are registered';
    }
    const reasons = await Promise.all(
      names.map(async name => {
        const factory = this.factories.get(name);
        if (factory == null) {
          return `${name} is not registered`;
        }
        const missing = seriesTypes.filter(
          type => !factory.capabilities.seriesTypes.includes(type)
        );
        if (missing.length > 0) {
          return `${name} cannot draw ${missing.join(', ')}`;
        }
        return `${name} is not available in this browser`;
      })
    );
    return reasons.join('; ');
  }
}

export default RendererRegistry;
