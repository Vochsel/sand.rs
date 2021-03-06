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

/* =================== Functions ================ */

vec4 circle(vec2 uv, vec2 p, vec3 col, float r)
{
    float l = length(uv - p);
    float c = smoothstep(r, r - 0.01, l);
    
    return vec4(col, c);
}

float circle(vec2 q, vec2 p, float r)
{
	float l = length(q - p);
	return smoothstep(r, r - 0.005, l);
}

float map(vec2 q)
{
	float c = circle(q, vec2(0.0, 0.0), 0.05);
	return c;
}

vec2 formula(vec2 uv, float p)
{
    float t = time;
    //pr += uv.x;
    float pr = rand(p * t * 2.0);// + rand(p * t * 1.0 + 5.0);
    pr = clamp(pr, 0.0, 1.0);
    float amt = pr * PI2;
    
    float num = 10.0;
    float inum = 1.0/num;
    
    //float x = 0.0;
    //float y = 0.0;
    
    
    float x = mod(pr, inum) * 20.0;
    x += rand(t) * x;
    float y = floor(pr * num) * inum;
    y += (sin(pr * 2.0) * (rand(t) * 0.1) - 0.05) * exp(x) * 0.2;
    y += sin((pr * 500.0) + sin(t * 0.2)) * x * 0.02;
    //y += rand(sin(p) + sin(t*0.2)) * 0.2 * x;
    //y = mod(y, 0.1);
    //float y = 2.0 + sin(pr * 10.0) * 0.8 * sin(t);
    
    x -= 1.5;
    y -= 0.5;
    
    //x += sin(rand(t * p) * 0.1) * x;
    //y += sin(rand((t * p) + 5.0) * 0.1) * y;
    
    vec2 o = vec2(x, y);
    
    return o;
}

vec4 create(vec2 uv)
{
    vec4 value = vec4(0.0);
    
    float amt = float(SAND_AMT);
    vec3 c = vec3(SAND_COL.r, SAND_COL.g, SAND_COL.b);
    for(int i = 0; i < SAND_AMT; ++i)
    {
     	vec4 c = circle(uv, formula(uv, float(i) / amt), SAND_COL, GRAIN_SIZE);   
        value.rgb = mix(value.rgb, c.rgb, 0.5);
        value.w += c.w;
        //value.w = mix(value.w, c.w, 0.05);
    }
    value.w = clamp(value.w, 0.0, 0.9);
    value.w *= SAND_OPACITY;
    return value;
}

/* ===================== Main =================== */

void main() {
 	if(time < 0.25) {
        gl_FragColor = vec4(bgcol, 1.0);
        return;
    } 

	float aspect = buffer_res.x / buffer_res.y;

	vec2 sc = gl_FragCoord.xy / buffer_res;

    if(!renderer_active) {
        gl_FragColor = CH0(sc);
        return;
    }

	vec2 uv = sc * 2.0 - 1.0;
	uv.x *= aspect;

	vec3 colour = CH0(sc).xyz;

	vec4 result = create(uv);

	colour = mix(colour, result.rgb, result.a);

  	gl_FragColor = vec4(colour, 1.0);
}