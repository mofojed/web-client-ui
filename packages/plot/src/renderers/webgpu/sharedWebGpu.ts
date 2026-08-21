/// <reference types="@webgpu/types" />
import Log from '@deephaven/log';
import { LINE_SHADER, SCATTER_SHADER } from './shaders';

const log = Log.module('sharedWebGpu');

export interface SharedWebGpu {
  device: GPUDevice;
  format: GPUTextureFormat;
  bindGroupLayout: GPUBindGroupLayout;
  scatterPipeline: GPURenderPipeline;
  linePipeline: GPURenderPipeline;
}

let sharedPromise: Promise<SharedWebGpu> | undefined;

function createPipelines(
  device: GPUDevice,
  format: GPUTextureFormat
): Omit<SharedWebGpu, 'device' | 'format'> {
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, // eslint-disable-line no-bitwise
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'read-only-storage' },
      },
    ],
  });
  const layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const blend: GPUBlendState = {
    // Fragment shaders output premultiplied alpha
    color: {
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
    alpha: {
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
  };

  const createPipeline = (code: string): GPURenderPipeline => {
    const shaderModule = device.createShaderModule({ code });
    return device.createRenderPipeline({
      layout,
      vertex: { module: shaderModule, entryPoint: 'vertexMain' },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format, blend }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  };

  return {
    bindGroupLayout,
    scatterPipeline: createPipeline(SCATTER_SHADER),
    linePipeline: createPipeline(LINE_SHADER),
  };
}

async function createShared(): Promise<SharedWebGpu> {
  const adapter = await navigator.gpu?.requestAdapter();
  if (adapter == null) {
    throw new Error('No WebGPU adapter available');
  }
  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();

  device.lost
    .then(info => {
      log.warn('WebGPU device lost', info.reason, info.message);
      // Drop the cache so the next plot builds a fresh device
      sharedPromise = undefined;
    })
    .catch(error => log.error('Error waiting on device loss', error));

  // Validation errors are asynchronous, so without this they vanish silently
  device.addEventListener('uncapturederror', event => {
    log.error('WebGPU error', (event as GPUUncapturedErrorEvent).error.message);
  });

  return { device, format, ...createPipelines(device, format) };
}

/**
 * Resolves the one device, shader modules, and pipelines that every WebGPU plot
 * on the page shares.
 *
 * Sharing is what lets a page hold many plots at once. WebGL caps a document at
 * roughly 8-16 live contexts and silently drops the oldest beyond that, whereas
 * WebGPU canvas contexts are cheap views onto a single device. Sharing also
 * means shaders are compiled once rather than once per plot.
 */
export function getSharedWebGpu(): Promise<SharedWebGpu> {
  if (sharedPromise == null) {
    sharedPromise = createShared().catch(error => {
      sharedPromise = undefined;
      throw error;
    });
  }
  return sharedPromise;
}

/** Drops the cached device. Exposed for tests; plots never need to call it. */
export function resetSharedWebGpu(): void {
  sharedPromise = undefined;
}
