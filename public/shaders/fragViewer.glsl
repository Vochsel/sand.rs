precision mediump float;

uniform vec2 resolution;
uniform float time;

uniform sampler2D buffer;


void main() {
  float aspect = resolution.x / resolution.y;

  vec2 sc = gl_FragCoord.xy / resolution;
  vec2 uv = sc * 2.0 - 1.0;
  uv.x *= aspect;

  vec3 col = texture2D(buffer, sc).xyz;

  gl_FragColor = vec4(col, 1.0);
}