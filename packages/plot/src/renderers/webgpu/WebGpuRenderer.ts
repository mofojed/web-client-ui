/// <reference types="@webgpu/types" />
import {
  copySeriesData,
  createSeriesData,
  type Bounds,
  type PlotShape,
  type SeriesData,
  type SeriesDelta,
  type SeriesDescriptor,
} from '../../model/PlotTypes';
import {
  defaultPlotTheme,
  getSeriesColor,
  type PlotTheme,
} from '../../theme/PlotTheme';
import { parseColor } from '../../theme/parseColor';
import type {
  PlotRenderer,
  PlotRendererCapabilities,
  PlotRendererFactory,
} from '../PlotRenderer';
import { applyDeltaToSeriesData } from '../applyDeltaToSeriesData';
import { getSharedWebGpu, type SharedWebGpu } from './sharedWebGpu';

const CAPABILITIES: PlotRendererCapabilities = {
  seriesTypes: ['scatter', 'line'],
  incrementalUpdates: true,
};

/** Bytes per point in the storage buffer: two f32 components. */
const BYTES_PER_POINT = 8;

/** Floats in the uniform struct: vec4 viewport, vec4 color, vec2 resolution, size, padding. */
const UNIFORM_FLOAT_COUNT = 12;

const MIN_CAPACITY = 1024;

interface SeriesResources {
  /** CPU mirror, used to re-upload when the GPU buffer has to grow. */
  data: SeriesData;
  /** Positions are stored relative to this point to keep f32 precision usable. */
  origin: { x: number; y: number };
  buffer: GPUBuffer;
  capacity: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  /** Number of points already uploaded to the GPU. */
  uploadedLength: number;
}

function nextCapacity(required: number): number {
  let capacity = MIN_CAPACITY;
  while (capacity < required) {
    capacity *= 2;
  }
  return capacity;
}

/**
 * WebGPU renderer. This is the primary renderer for the package.
 *
 * Each series owns a storage buffer of points. Deltas are written straight into
 * that buffer at the relevant offset, so appending to a streaming series costs
 * one `writeBuffer` of just the new points rather than a full re-upload. Pan
 * and zoom only change a uniform, so no point data moves at all.
 *
 * The device and pipelines come from {@link getSharedWebGpu}, so a page can
 * hold many plots without running into the context limits that cap WebGL.
 */
export class WebGpuRenderer implements PlotRenderer {
  readonly name = 'webgpu';

  readonly capabilities = CAPABILITIES;

  private shared: SharedWebGpu | null = null;

  private context: GPUCanvasContext | null = null;

  private theme: PlotTheme = defaultPlotTheme;

  private descriptors: SeriesDescriptor[] = [];

  private resources = new Map<string, SeriesResources>();

  private viewport: Bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

  private width = 0;

  private height = 0;

  private devicePixelRatio = 1;

  private uniformValues = new Float32Array(UNIFORM_FLOAT_COUNT);

  async initialize(canvas: HTMLCanvasElement, theme: PlotTheme): Promise<void> {
    this.theme = theme;

    const shared = await getSharedWebGpu();
    const context = canvas.getContext('webgpu');
    if (context == null) {
      throw new Error('Unable to acquire a webgpu canvas context');
    }

    this.shared = shared;
    this.context = context;
    context.configure({
      device: shared.device,
      format: shared.format,
      alphaMode: 'premultiplied',
    });
  }

  private createResources(
    seriesId: string,
    capacity: number
  ): SeriesResources | undefined {
    const { shared } = this;
    if (shared == null) {
      return undefined;
    }
    const { device, bindGroupLayout } = shared;
    const buffer = device.createBuffer({
      label: `plot-points-${seriesId}`,
      size: capacity * BYTES_PER_POINT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, // eslint-disable-line no-bitwise
    });
    const uniformBuffer = device.createBuffer({
      label: `plot-uniforms-${seriesId}`,
      size: UNIFORM_FLOAT_COUNT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, // eslint-disable-line no-bitwise
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer } },
      ],
    });
    return {
      data: createSeriesData(),
      origin: { x: 0, y: 0 },
      buffer,
      capacity,
      uniformBuffer,
      bindGroup,
      uploadedLength: 0,
    };
  }

  private getResources(seriesId: string): SeriesResources | undefined {
    let resources = this.resources.get(seriesId);
    if (resources == null) {
      resources = this.createResources(seriesId, MIN_CAPACITY);
      if (resources != null) {
        this.resources.set(seriesId, resources);
      }
    }
    return resources;
  }

  /* eslint-disable no-param-reassign -- these update the caller's resource record in place */
  /** Writes `count` points starting at `offset` from the CPU mirror into the GPU buffer. */
  private uploadRange(
    resources: SeriesResources,
    offset: number,
    count: number
  ): void {
    const device = this.shared?.device;
    if (device == null || count <= 0) {
      return;
    }
    const values = new Float32Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      values[i * 2] = resources.data.x[offset + i] - resources.origin.x;
      values[i * 2 + 1] = resources.data.y[offset + i] - resources.origin.y;
    }
    device.queue.writeBuffer(
      resources.buffer,
      offset * BYTES_PER_POINT,
      values.buffer,
      values.byteOffset,
      values.byteLength
    );
    resources.uploadedLength = Math.max(
      resources.uploadedLength,
      offset + count
    );
  }

  private ensureCapacity(
    resources: SeriesResources,
    required: number
  ): boolean {
    const { shared } = this;
    if (shared == null || required <= resources.capacity) {
      return false;
    }
    const { device } = shared;
    const capacity = nextCapacity(required);
    resources.buffer.destroy();
    const buffer = device.createBuffer({
      size: capacity * BYTES_PER_POINT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, // eslint-disable-line no-bitwise
    });
    resources.buffer = buffer;
    resources.capacity = capacity;
    resources.uploadedLength = 0;
    resources.bindGroup = device.createBindGroup({
      layout: shared.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: resources.uniformBuffer } },
        { binding: 1, resource: { buffer } },
      ],
    });
    return true;
  }
  /* eslint-enable no-param-reassign */

  setShape(shape: PlotShape): void {
    this.descriptors = shape.series;
    const ids = new Set(shape.series.map(series => series.id));
    Array.from(this.resources.entries()).forEach(([id, resources]) => {
      if (!ids.has(id)) {
        resources.buffer.destroy();
        resources.uniformBuffer.destroy();
        this.resources.delete(id);
      }
    });
  }

  setSeriesData(seriesId: string, data: SeriesData): void {
    const resources = this.getResources(seriesId);
    if (resources == null) {
      return;
    }
    // Sources may hand back their own arrays, so keep a private copy to mutate
    resources.data = copySeriesData(data);
    // Re-baseline the origin whenever the whole series is replaced
    resources.origin = {
      x: data.length > 0 ? data.x[0] : 0,
      y: data.length > 0 ? data.y[0] : 0,
    };
    this.ensureCapacity(resources, resources.data.length);
    resources.uploadedLength = 0;
    this.uploadRange(resources, 0, resources.data.length);
  }

  applyDeltas(deltas: SeriesDelta[]): void {
    for (let i = 0; i < deltas.length; i += 1) {
      const delta = deltas[i];
      const resources = this.getResources(delta.seriesId);
      if (resources == null) {
        return;
      }
      if (delta.type === 'replace' || delta.type === 'clear') {
        this.setSeriesData(
          delta.seriesId,
          applyDeltaToSeriesData(resources.data, delta)
        );
      } else {
        const offset =
          delta.type === 'append' ? resources.data.length : delta.offset;
        resources.data = applyDeltaToSeriesData(resources.data, delta);
        const grew = this.ensureCapacity(resources, resources.data.length);
        if (grew) {
          this.uploadRange(resources, 0, resources.data.length);
        } else {
          this.uploadRange(resources, offset, delta.data.length);
        }
      }
    }
  }

  setViewport(viewport: Bounds): void {
    this.viewport = viewport;
  }

  setTheme(theme: PlotTheme): void {
    this.theme = theme;
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = width;
    this.height = height;
    this.devicePixelRatio = devicePixelRatio;
    const canvas = this.context?.canvas;
    if (canvas != null) {
      canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
      canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
    }
  }

  private writeUniforms(
    resources: SeriesResources,
    color: string,
    size: number
  ): void {
    const { device } = this.shared as SharedWebGpu;
    const values = this.uniformValues;
    const [red, green, blue, alpha] = parseColor(color);
    values[0] = this.viewport.xMin - resources.origin.x;
    values[1] = this.viewport.xMax - resources.origin.x;
    values[2] = this.viewport.yMin - resources.origin.y;
    values[3] = this.viewport.yMax - resources.origin.y;
    values[4] = red;
    values[5] = green;
    values[6] = blue;
    values[7] = alpha;
    values[8] = this.width * this.devicePixelRatio;
    values[9] = this.height * this.devicePixelRatio;
    values[10] = size * this.devicePixelRatio;
    values[11] = 0;
    device.queue.writeBuffer(resources.uniformBuffer, 0, values);
  }

  render(): void {
    const { context, shared, theme } = this;
    if (context == null || shared == null) {
      return;
    }
    const { device, scatterPipeline, linePipeline } = shared;

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    for (let i = 0; i < this.descriptors.length; i += 1) {
      const descriptor = this.descriptors[i];
      const resources = this.resources.get(descriptor.id);
      if (resources != null && resources.data.length > 0) {
        const color = getSeriesColor(theme, i, descriptor.style?.color);
        const isLine = descriptor.type === 'line';
        const size = isLine
          ? descriptor.style?.lineWidth ?? theme.lineWidth
          : descriptor.style?.pointSize ?? theme.pointSize;
        this.writeUniforms(resources, color, size);

        const instanceCount = isLine
          ? resources.data.length - 1
          : resources.data.length;
        if (instanceCount > 0) {
          pass.setPipeline(isLine ? linePipeline : scatterPipeline);
          pass.setBindGroup(0, resources.bindGroup);
          pass.draw(4, instanceCount);
        }
      }
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.resources.forEach(resources => {
      resources.buffer.destroy();
      resources.uniformBuffer.destroy();
    });
    this.resources.clear();
    this.descriptors = [];
    // The device is shared with every other plot, so only this canvas is released
    this.context?.unconfigure();
    this.context = null;
    this.shared = null;
  }
}

export const webGpuRendererFactory: PlotRendererFactory = {
  name: 'webgpu',
  capabilities: CAPABILITIES,
  isSupported: async () => {
    if (typeof navigator === 'undefined' || navigator.gpu == null) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter != null;
  },
  create: () => new WebGpuRenderer(),
};

export default WebGpuRenderer;
