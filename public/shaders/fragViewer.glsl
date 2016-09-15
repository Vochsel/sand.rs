precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec2 buffer_res;

uniform sampler2D buf;

uniform mat3 view_mat;

float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
    vec2 s = step(bottomLeft, v) - step(topRight, v);
    return s.x * s.y;   
}



void main() {
  	float aspect = resolution.x / resolution.y;

  	float buffer_aspect = buffer_res.x / buffer_res.y;

  	vec2 sc = gl_FragCoord.xy / resolution;
  	vec2 bsc = gl_FragCoord.xy / buffer_res;
  	vec2 uv = sc;// * 2.0 - 1.0;
  	uv.x *= aspect / buffer_aspect;

  	vec3 m = vec3(uv, 1.0);
  	m = view_mat * m;

  	vec3 col = vec3(mod(m, 0.20));
  	vec3 sample = texture2D(buf, m.xy).xyz;

	col = mix(col, sample, insideBox(m.xy, vec2(0.0), vec2(1.0)));

  	gl_FragColor = vec4(col, 1.0);
}