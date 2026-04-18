export const SAND_SHADER_HEADER = /* wgsl */ `
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
  sand_amount     : u32,
  mouse_x         : f32,
  mouse_y         : f32,
};

struct Sand {
  size    : f32,
  opacity : f32,
  pos     : vec2f,
  col     : vec3f,
};

@group(0) @binding(0) var<uniform> u   : Uniforms;
@group(0) @binding(1) var prevTex      : texture_2d<f32>;
@group(0) @binding(2) var samp         : sampler;

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

export const SAND_SHADER_MAIN = /* wgsl */ `
@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f( 3.0, -1.0), vec2f(-1.0,  3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment
fn fs_sand(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let sc = frag.xy / u.buffer_res;
  let prev = textureSample(prevTex, samp, sc).rgb;

  if (u.time < 0.05) {
    return vec4f(u.bg_col, 1.0);
  }
  if (u.renderer_active < 0.5) {
    return vec4f(prev, 1.0);
  }

  let aspect = u.buffer_res.x / u.buffer_res.y;
  var uv = sc * 2.0 - 1.0;
  uv.x *= aspect;
  uv.y = -uv.y;

  var accum_col = vec3f(0.0);
  var accum_a   : f32 = 0.0;
  let amt       = f32(u.sand_amount);

  for (var i: u32 = 0u; i < u.sand_amount; i = i + 1u) {
    let p = (f32(i) / amt) * 2.0 - 1.0;
    let s = formula(uv, p);
    let d = length(uv - s.pos);
    let c = smoothstep(s.size, s.size - 0.00025, d);
    accum_a   = accum_a + c * s.opacity;
    accum_col = mix(accum_col, s.col, 0.5);
  }
  let a = clamp(accum_a, 0.0, 0.9) * u.sand_opacity;
  let result = mix(prev, accum_col, a);
  return vec4f(result, 1.0);
}
`;

export const VIEWER_SHADER = /* wgsl */ `
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
  sand_amount     : u32,
  mouse_x         : f32,
  mouse_y         : f32,
};

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

  // fit buffer letterboxed inside canvas, centred
  let scale = select(
    vec2f(buffer_aspect / canvas_aspect, 1.0),
    vec2f(1.0, canvas_aspect / buffer_aspect),
    canvas_aspect < buffer_aspect
  );
  var uv = (sc - vec2f(0.5)) / vec2f(u.view_scale) - vec2f(u.view_tx, u.view_ty);
  uv = uv / scale + vec2f(0.5);

  let in_box = step(vec2f(0.0), uv) * (1.0 - step(vec2f(1.0), uv));
  let mask = in_box.x * in_box.y;

  // checker grid background
  let q = sc * vec2f(canvas_aspect, 1.0) * 32.0;
  let g = (floor(q.x) + floor(q.y)) - 2.0 * floor((floor(q.x) + floor(q.y)) * 0.5);
  let bg = vec3f(0.10 + g * 0.015);

  let s = textureSample(sandTex, samp, uv).rgb;
  return vec4f(mix(bg, s, mask), 1.0);
}
`;

export function buildSandShader(userFormulaWGSL) {
  return `${SAND_SHADER_HEADER}\n${userFormulaWGSL}\n${SAND_SHADER_MAIN}`;
}
