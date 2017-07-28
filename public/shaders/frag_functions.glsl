/* =================== Functions ================ */

vec4 circle(vec2 uv, vec2 p, vec3 col, float r)
{
    float l = length(uv - p);
    //float c = smoothstep(r, r - 0.0025, l);
	float c = smoothstep(r, r - 0.00025, l);
    
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
