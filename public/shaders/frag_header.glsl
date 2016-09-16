precision mediump float;

/* ========== Shader Lib - Ben Skinner ========== */

// Universal
#define rgb(r, g, b) vec3(float(r)/255., float(g)/255., float(b)/255.)

#define PI  3.14159265359
#define PI2 6.28318530718

// Shadertoy Specific
#define TX(ch, uv) texture2D(ch, uv)

#define CH0(uv) TX(buf, uv)

float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
float rand(float c){ vec2 co = vec2(c); return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

/* ==================== Uniforms ================= */

uniform vec3 sand_col;
uniform float sand_radius;
uniform float sand_opacity;

uniform vec2 resolution;
uniform vec2 buffer_res;

uniform float time;

uniform bool renderer_active;
uniform vec3 bgcol;

uniform sampler2D buf;

/* ================ Shader Variables ============= */

#define BG vec3(0.9)
#define GRAIN_SIZE sand_radius * 0.1
#define SAND_OPACITY sand_opacity
#define SAND_AMT 100
#define SAND_COL sand_col

