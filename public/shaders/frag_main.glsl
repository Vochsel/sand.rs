vec4 create(vec2 uv)
{
    vec4 value = vec4(0.0);
    
    float amt = float(SAND_AMT);

    vec3 c = vec3(SAND_COL.r, SAND_COL.g, SAND_COL.b);
    
    for(int i = 0; i < SAND_AMT; ++i)
    {
        Sand outSand;
        outSand.pos = vec2(0.0);
        outSand.size = GRAIN_SIZE;
        outSand.col = vec3(SAND_COL.r, SAND_COL.g, SAND_COL.b);
        outSand.opacity = SAND_OPACITY;

        formula(uv, (float(i) / amt) * 2.0 - 1.0, outSand);

        vec4 c = circle(uv, outSand.pos, SAND_COL, outSand.size);   
        
        value.rgb = mix(value.rgb, outSand.col, 0.5);
        value.w += c.w * outSand.opacity;
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