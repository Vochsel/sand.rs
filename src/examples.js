export const EXAMPLES = [
  {
    name: "Spiral",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let radius = 0.4 - rand1(p) + sin(u.time) * 0.5;
  let xx = tan(u.time + p * 2.0) * radius;
  let yy = sin(u.time + p * 4.0) * radius;
  s.size    = 0.0025;
  s.opacity = 0.025;
  s.pos     = vec2f(xx, yy);
  return s;
}`,
  },
  {
    name: "Orbit",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let prand = rand1(p * u.time * 0.01);
  let w = sin(prand * 4.0) * 0.5;
  let r = 0.45 + w;
  s.col = vec3f(uv.x * 0.5 + 0.5, uv.y * 0.5 + 0.5, 1.0);
  s.size    = 0.003;
  s.opacity = 0.05;
  s.pos     = vec2f(sin(p + prand + w) * r, cos(p + prand - w) * r);
  return s;
}`,
  },
  {
    name: "Rosette",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let k = 5.0;
  let theta = p * PI + u.time * 0.2;
  let r = 0.55 * cos(k * theta) + 0.05 * rand1(p + u.time);
  s.pos = vec2f(r * cos(theta), r * sin(theta));
  s.size    = 0.0035;
  s.opacity = 0.08;
  s.col = mix(vec3f(0.95, 0.6, 0.2), vec3f(0.2, 0.5, 0.95), 0.5 + 0.5 * sin(theta * 3.0));
  return s;
}`,
  },
  {
    name: "Galaxy",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let arm   = floor(rand1(p) * 4.0);
  let t     = p * 8.0 + u.time * 0.05;
  let r     = 0.05 + 0.55 * fract(t * 0.1 + arm * 0.25);
  let theta = t + arm * (PI2 / 4.0) + r * 4.0;
  let jitter = vec2f(rand1(p * 7.0) - 0.5, rand1(p * 13.0) - 0.5) * 0.04;
  s.pos = vec2f(r * cos(theta), r * sin(theta)) + jitter;
  s.size    = mix(0.002, 0.006, rand1(p * 31.0));
  s.opacity = 0.06 * (1.0 - r);
  s.col = mix(vec3f(0.9, 0.85, 1.0), vec3f(0.6, 0.4, 1.0), r);
  return s;
}`,
  },
  {
    name: "Bloom",
    defaults: {
      sampleCount: 384,
      bufferSize: 1024,
    },
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let ring = floor(p * 16.0);
  let ring_t = fract(p * 16.0);
  let ring_seed = ring + 1.0;
  let petals = 5.0 + floor(rand1(ring_seed) * 4.0);
  let theta = ring_t * PI2 + u.time * (0.04 + 0.02 * rand1(ring_seed + 1.0));
  let radius = 0.18 + ring * 0.022 + 0.12 * sin(theta * petals + ring_seed);
  s.pos = vec2f(cos(theta), sin(theta)) * radius;
  s.size = mix(0.0022, 0.0042, ring_t);
  s.opacity = 0.03 + 0.018 * (1.0 - ring_t);
  s.col = mix(vec3f(0.18, 0.52, 0.36), vec3f(1.0, 0.92, 0.68), ring_t);
  return s;
}`,
  },
  {
    name: "Lissajous",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let a = 3.0;
  let b = 2.0;
  let delta = u.time * 0.3;
  let t = p * PI2 + u.time * 0.1;
  s.pos = vec2f(0.7 * sin(a * t + delta), 0.7 * sin(b * t));
  s.size    = 0.0025;
  s.opacity = 0.06;
  s.col = vec3f(0.5 + 0.5 * sin(t), 0.7, 0.5 + 0.5 * cos(t));
  return s;
}`,
  },
  {
    name: "Starfield",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let seed = floor(p * 64.0);
  let dir = vec2f(rand1(seed) - 0.5, rand1(seed + 1.0) - 0.5) * 2.0;
  let speed = 0.2 + rand1(seed + 2.0) * 0.6;
  let life = fract(u.time * speed * 0.1 + rand1(seed + 3.0));
  s.pos = normalize(dir) * life * 0.9;
  s.size    = mix(0.001, 0.005, life);
  s.opacity = (1.0 - life) * 0.15;
  s.col = mix(vec3f(1.0), vec3f(0.6, 0.7, 1.0), rand1(seed + 4.0));
  return s;
}`,
  },
  {
    name: "Swarm (mouse)",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let m = mouse_uv();
  let theta = p * PI2 + u.time * 0.5;
  let r = 0.05 + 0.4 * abs(sin(p * 3.0 + u.time));
  let target = m + vec2f(cos(theta), sin(theta)) * r;
  let jitter = (vec2f(rand1(p + u.time), rand1(p * 2.0 + u.time)) - 0.5) * 0.02;
  s.pos = target + jitter;
  s.size    = 0.003;
  s.opacity = 0.07;
  s.col = mix(u.sand_col, vec3f(1.0, 0.4, 0.6), 0.5);
  return s;
}`,
  },
  {
    name: "Wave Lattice",
    code: `fn formula(uv: vec2f, p: f32) -> Sand {
  var s = default_sand();
  let q = p * PI2 * 4.0;
  let x = sin(q * 0.5) * 0.7;
  let y = sin(q * 0.5 + u.time + cos(x * 3.0)) * 0.4;
  s.pos = vec2f(x, y);
  s.size    = 0.0025;
  s.opacity = 0.05;
  s.col = vec3f(0.8, 0.9, 1.0);
  return s;
}`,
  },
];
