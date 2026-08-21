/**
 * WGSL shaders for the WebGPU renderer.
 *
 * Positions live in a storage buffer as `vec2<f32>` relative to a per series
 * origin. Keeping them relative preserves precision for domains such as epoch
 * millisecond timestamps, which lose ~2 minutes of resolution when stored as an
 * absolute f32.
 */

const SHARED = /* wgsl */ `
struct Uniforms {
  // Viewport bounds relative to the series origin: (xMin, xMax, yMin, yMax)
  viewport: vec4<f32>,
  color: vec4<f32>,
  resolution: vec2<f32>,
  size: f32,
  _padding: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> points: array<vec2<f32>>;

fn toNdc(point: vec2<f32>) -> vec2<f32> {
  let xSpan = uniforms.viewport.y - uniforms.viewport.x;
  let ySpan = uniforms.viewport.w - uniforms.viewport.z;
  let x = select(0.0, (point.x - uniforms.viewport.x) / xSpan, xSpan != 0.0);
  let y = select(0.0, (point.y - uniforms.viewport.z) / ySpan, ySpan != 0.0);
  return vec2<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0);
}

// Unit quad corners in triangle-strip order
fn quadCorner(index: u32) -> vec2<f32> {
  var corners = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),
  );
  return corners[index];
}
`;

export const SCATTER_SHADER = /* wgsl */ `${SHARED}
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let center = toNdc(points[instanceIndex]);
  let corner = quadCorner(vertexIndex);
  // Pad by a pixel so the antialiased edge is not clipped by the quad
  let radius = uniforms.size * 0.5 + 1.0;
  let offset = corner * radius * 2.0 / uniforms.resolution;

  var output: VertexOutput;
  output.position = vec4<f32>(center + offset, 0.0, 1.0);
  output.local = corner * radius;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let radius = uniforms.size * 0.5;
  let distanceFromCenter = length(input.local);
  let alpha = uniforms.color.a * (1.0 - smoothstep(radius - 0.75, radius + 0.75, distanceFromCenter));
  if (alpha <= 0.0) {
    discard;
  }
  return vec4<f32>(uniforms.color.rgb * alpha, alpha);
}
`;

export const LINE_SHADER = /* wgsl */ `${SHARED}
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) distanceFromCenter: f32,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let halfResolution = uniforms.resolution * 0.5;
  let startPixel = (toNdc(points[instanceIndex]) * 0.5 + 0.5) * uniforms.resolution;
  let endPixel = (toNdc(points[instanceIndex + 1u]) * 0.5 + 0.5) * uniforms.resolution;

  var direction = endPixel - startPixel;
  let lengthPixels = length(direction);
  direction = select(vec2<f32>(1.0, 0.0), direction / lengthPixels, lengthPixels > 1e-6);
  let normal = vec2<f32>(-direction.y, direction.x);

  // Pad by a pixel for the antialiased edge
  let halfWidth = uniforms.size * 0.5 + 1.0;
  let corner = quadCorner(vertexIndex);
  // Extending along the segment by the half width closes the gap at joins
  let base = select(startPixel, endPixel, corner.x > 0.0);
  let pixel = base
    + direction * corner.x * halfWidth
    + normal * corner.y * halfWidth;

  var output: VertexOutput;
  output.position = vec4<f32>(pixel / halfResolution - 1.0, 0.0, 1.0);
  output.distanceFromCenter = corner.y * halfWidth;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let halfWidth = uniforms.size * 0.5;
  let distance = abs(input.distanceFromCenter);
  let alpha = uniforms.color.a * (1.0 - smoothstep(halfWidth - 0.75, halfWidth + 0.75, distance));
  if (alpha <= 0.0) {
    discard;
  }
  return vec4<f32>(uniforms.color.rgb * alpha, alpha);
}
`;
