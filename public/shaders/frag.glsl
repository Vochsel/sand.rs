precision mediump float;

uniform vec2 resolution;
uniform vec2 buffer_res;
uniform float time;

uniform sampler2D buffer;

/* ========== Shader Lib - Ben Skinner ========== */

// Universal
#define rgb(r, g, b) vec3(float(r)/255., float(g)/255., float(b)/255.)

#define PI  3.14159265359
#define PI2 6.28318530718

// Shadertoy Specific
#define TX(ch, uv) texture2D(ch, uv)

#define CH0(uv) TX(buffer, uv)

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float rand(float c){
    vec2 co = vec2(c);
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

/* ================Shader Variables ============= */

#define BG vec3(0.9)
#define GRAIN_SIZE 0.0135
#define SAND_OPACITY 0.01
#define SAND_AMT 1000

/* ===================== Shader ================= */

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
    float t = time * 1.0;
    
    float pr = p + (rand(vec2(t)) * 0.5 - 0.25);
    float amt = pr * PI2;
    
    float st = sin(amt);
    float ct = cos(amt);
    float ang = atan(st, ct);
    
    vec2 o;
    //float ran = rand(vec2(t * 0.1)) * (sin(ang + 1.0) * 0.1) * p * 10.;
    float ran = rand(vec2(t * 10.0))  * p;
    //ran += rand(vec2(sin(t * 25.0))) * sin(p) * 20.0 - 5.0;
    float rad = 0.5 + fract(p + 2.0)*0.2;
    rad += (rand(t * 100.0) * pow(p, 90.0)) - 0.25;
    //rad = clamp(rad, 0.0, 0.9);
    o.x = (st * rad) + (rand(t + 2.0) * 0.1);// * rad;
    o.y = (ct * rad) + (rand(t + 4.0) * 0.1);// * rad;
    
    return o;
}

vec4 layout(vec2 uv)
{
    vec4 value = vec4(0.0);
    
    float amt = float(SAND_AMT);
    for(int i = 0; i < SAND_AMT; ++i)
    {
     	vec4 c = circle(uv, formula(uv, float(i) / amt), vec3(0.1, 0.12, 0.1), GRAIN_SIZE);   
        value.rgb = mix(value.rgb, c.rgb, 0.5);
        value.w += c.w;
        //value.w = mix(value.w, c.w, 0.05);
    }
    value.w = clamp(value.w, 0.0, 0.9);
    value.w *= SAND_OPACITY;
    return value;
}


void main() {
 	if(time < 1.0) {
        gl_FragColor = vec4(BG, 1.0);
        return;
    }

	float aspect = buffer_res.x / buffer_res.y;

	vec2 sc = gl_FragCoord.xy / buffer_res;
	vec2 uv = sc * 2.0 - 1.0;
	uv.x *= aspect;

	vec3 colour = CH0(sc).xyz;

	vec4 result = layout(uv);

	colour = mix(colour, result.rgb, result.a);

  	gl_FragColor = vec4(colour, 1.0);
}