const SHARED_TYPES = /* wgsl */ `
struct Uniforms {
  resolution      : vec2f,
  buffer_res      : vec2f,
  bg_col          : vec3f,
  sand_radius     : f32,
  sand_col        : vec3f,
  sand_opacity    : f32,
  time            : f32,
  renderer_active : f32,
  view_tx         : f32,
  view_ty         : f32,
  view_scale      : f32,
  sample_count    : u32,
  mouse_x         : f32,
  mouse_y         : f32,
  sample_cursor   : u32,
  frame_seed      : u32,
};

struct Sand {
  size    : f32,
  opacity : f32,
  pos     : vec2f,
  col     : vec3f,
};

struct Sample {
  pos_size : vec4f,
  col      : vec4f,
};

struct SampleBuffer {
  data : array<Sample>,
};
`;

const SHARED_FUNCTIONS = /* wgsl */ `
const PI  : f32 = 3.14159265359;
const PI2 : f32 = 6.28318530718;

fn rand1(c: f32) -> f32 {
  let co = vec2f(c, c);
  return fract(sin(dot(co, vec2f(12.9898, 78.233))) * 43758.5453);
}

fn rand2(c: vec2f) -> f32 {
  return fract(sin(dot(c, vec2f(12.9898, 78.233))) * 43758.5453);
}

fn hash1(n: f32) -> f32 { return fract(sin(n) * 1e4); }

fn hash2(p: vec2f) -> f32 {
  return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
}

fn noise2(x: vec2f) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let a = hash2(i);
  let b = hash2(i + vec2f(1.0, 0.0));
  let c = hash2(i + vec2f(0.0, 1.0));
  let d = hash2(i + vec2f(1.0, 1.0));
  let u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

fn fbm(x_in: vec2f) -> f32 {
  var x = x_in;
  var v: f32 = 0.0;
  var a: f32 = 0.5;
  let shift = vec2f(100.0);
  let rot = mat2x2f(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (var i = 0; i < 5; i++) {
    v += a * noise2(x);
    x = rot * x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

fn default_sand() -> Sand {
  return Sand(u.sand_radius * 0.1, u.sand_opacity, vec2f(0.0), u.sand_col);
}

fn mouse_uv() -> vec2f {
  return vec2f(u.mouse_x, u.mouse_y) * 2.0 - 1.0;
}
`;

const SAMPLE_COMPUTE_PREFIX = /* wgsl */ `
${SHARED_TYPES}

@group(0) @binding(0) var<uniform> u            : Uniforms;
@group(0) @binding(1) var<storage, read_write> samples : SampleBuffer;

${SHARED_FUNCTIONS}
`;

const SAMPLE_COMPUTE_MAIN = /* wgsl */ `
const GOLDEN_RATIO : f32 = 0.61803398875;
const R2_X         : f32 = 0.7548776662466927;
const R2_Y         : f32 = 0.5698402909980532;

fn sample_phase(idx: u32) -> f32 {
  return fract(0.5 + f32(idx) * GOLDEN_RATIO);
}

fn sample_seed(idx: u32) -> vec2f {
  return fract(vec2f(0.5) + vec2f(f32(idx) * R2_X, f32(idx) * R2_Y));
}

@compute @workgroup_size(64)
fn cs_samples(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= u.sample_count) {
    return;
  }

  let idx = u.sample_cursor + i;
  let aspect = u.buffer_res.x / u.buffer_res.y;
  let phase = sample_phase(idx) * 2.0 - 1.0;
  var seed_uv = sample_seed(idx) * 2.0 - 1.0;
  seed_uv.x *= aspect;
  seed_uv.y = -seed_uv.y;

  var s = formula(seed_uv, phase);
  s.size = max(s.size, 0.0005);
  s.opacity = clamp(s.opacity, 0.0, 1.0);

  samples.data[i] = Sample(
    vec4f(s.pos, s.size, s.opacity),
    vec4f(s.col, 1.0)
  );
}
`;

export function buildSampleComputeShader(userFormulaWGSL) {
  return `${SAMPLE_COMPUTE_PREFIX}\n${userFormulaWGSL}\n${SAMPLE_COMPUTE_MAIN}`;
}

export const PARTICLE_SHADER = /* wgsl */ `
${SHARED_TYPES}

struct VSOut {
  @builtin(position) position : vec4f,
  @location(0) local          : vec2f,
  @location(1) color          : vec3f,
  @location(2) opacity        : f32,
  @location(3) radius         : f32,
};

@group(0) @binding(0) var<uniform> u       : Uniforms;
@group(0) @binding(1) var<storage, read> samples : SampleBuffer;

@vertex
fn vs_particles(
  @builtin(vertex_index) vi: u32,
  @builtin(instance_index) ii: u32
) -> VSOut {
  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0)
  );
  let sample = samples.data[ii];
  let corner = corners[vi];
  let aspect = u.buffer_res.x / u.buffer_res.y;
  let center = vec2f(sample.pos_size.x / aspect, sample.pos_size.y);
  let radius = sample.pos_size.z;
  let offset = vec2f(corner.x * radius / aspect, corner.y * radius);

  var out: VSOut;
  out.position = vec4f(center + offset, 0.0, 1.0);
  out.local = corner * radius;
  out.color = sample.col.rgb;
  out.opacity = sample.pos_size.w;
  out.radius = radius;
  return out;
}

@fragment
fn fs_particles(in: VSOut) -> @location(0) vec4f {
  let edge = max(0.0005, in.radius * 0.35);
  let coverage = smoothstep(in.radius, max(0.0, in.radius - edge), length(in.local));
  let alpha = clamp(coverage * in.opacity * u.sand_opacity, 0.0, 1.0);
  return vec4f(in.color * alpha, alpha);
}
`;

export const VIEWER_SHADER = /* wgsl */ `
${SHARED_TYPES}

@group(0) @binding(0) var<uniform> u   : Uniforms;
@group(0) @binding(1) var sandTex      : texture_2d<f32>;
@group(0) @binding(2) var samp         : sampler;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f( 3.0, -1.0), vec2f(-1.0,  3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment
fn fs_view(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let canvas_aspect = u.resolution.x / u.resolution.y;
  let buffer_aspect = u.buffer_res.x / u.buffer_res.y;
  let sc = frag.xy / u.resolution;

  let scale = select(
    vec2f(buffer_aspect / canvas_aspect, 1.0),
    vec2f(1.0, canvas_aspect / buffer_aspect),
    canvas_aspect < buffer_aspect
  );
  var uv = (sc - vec2f(0.5)) / vec2f(u.view_scale) - vec2f(u.view_tx, u.view_ty);
  uv = uv / scale + vec2f(0.5);

  let in_box = step(vec2f(0.0), uv) * (1.0 - step(vec2f(1.0), uv));
  let mask = in_box.x * in_box.y;

  let q = sc * vec2f(canvas_aspect, 1.0) * 32.0;
  let g = (floor(q.x) + floor(q.y)) - 2.0 * floor((floor(q.x) + floor(q.y)) * 0.5);
  let bg = vec3f(0.10 + g * 0.015);

  let s = textureSample(sandTex, samp, uv).rgb;
  return vec4f(mix(bg, s, mask), 1.0);
}
`;
