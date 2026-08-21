import { canvasRendererFactory } from './canvas/CanvasRenderer';
import { RendererRegistry } from './RendererRegistry';
import { webGpuRendererFactory } from './webgpu/WebGpuRenderer';

/** Preferred order: WebGPU when the platform allows it, Canvas 2D otherwise. */
export const DEFAULT_RENDERER_PREFERENCE = ['webgpu', 'canvas'] as const;

/**
 * The registry used when a plot is not given one.
 *
 * Additional renderers can be registered on this instance at startup, or a
 * private registry can be passed per plot.
 */
export const defaultRendererRegistry = new RendererRegistry();
defaultRendererRegistry.register(webGpuRendererFactory);
defaultRendererRegistry.register(canvasRendererFactory);

export default defaultRendererRegistry;
