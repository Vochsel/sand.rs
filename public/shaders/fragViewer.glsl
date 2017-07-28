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

float grid(vec2 p) {
  vec2 orient = normalize(vec2(1.0,0.0));
  vec2 perp = vec2(orient.y, -orient.x);
  float g = mod(floor(64. * dot(p, orient)) + floor(64. * dot(p, perp)), 2.);
  return g;
}

void main() {
    float aspect = resolution.x / resolution.y;

    float buffer_aspect = buffer_res.x / buffer_res.y;

    vec2 sc = gl_FragCoord.xy / resolution;
    vec2 bsc = gl_FragCoord.xy / buffer_res;
    vec2 uv = sc;
    uv.x *= aspect;
    vec2 bufCoord = sc;// * 2.0 - 1.0;
    
    //bufCoord.x *= aspect / buffer_aspect; //Needed but broken

    vec3 m = vec3(bufCoord, 1.0);
    m = view_mat * m;


    vec2 q = sc.xy;
    q.x *= aspect;
    float g = grid(q);
    vec3 col = vec3(g * 0.05 + 0.75);
    //m.y = 1.0 - m.y;
    vec3 sample = texture2D(buf, m.xy* vec2(aspect / buffer_aspect,1.0)).xyz;

    col = mix(col, sample, insideBox(m.xy * vec2(aspect / buffer_aspect,1.0), vec2(0.0), vec2(1.0)));

    gl_FragColor = vec4(col, 1.0);
}