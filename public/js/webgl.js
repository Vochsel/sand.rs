var gl;
var sand = {prog: null, progInfo: null};
var view = {prog: null, progInfo: null};

var activeBuffer;
var fbs = new Array(2);

var lastTime, curTime, deltaTime, elapsedTime = 0;

var viewMat = mat3.create()
var viewTrans = mat3.create()
var viewScale = mat3.create()

function CreateFromShaders(obj, vertSrc, fragSrc)
{
	obj.prog = twgl.createProgramFromSources(gl, [vertSrc, fragSrc]);
	obj.progInfo = twgl.createProgramInfoFromProgram(gl, obj.prog);
	return obj;
}

function FBtoTex(fb)
{
    bufferWidth = artboard.width.value;
	bufferHeight = artboard.height.value;
	//console.log(fb);
	//gl.viewport(0, 0, 100, 100);
	twgl.bindFramebufferInfo(gl, fb);
	var data = new Uint8Array(bufferWidth * bufferHeight * 4);
	//gl.clearColor(1.0, 0.0, 0.0, 1.0);
	gl.readPixels(0, 0, bufferWidth, bufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

	var can = document.createElement('canvas');
	can.width = bufferWidth;
	can.height = bufferHeight;

	var ctx = can.getContext('2d');
	var imageData = ctx.createImageData(bufferWidth, bufferHeight);
	imageData.data.set(data);

	ctx.putImageData(imageData, 0, 0);
	//document.getElementById("out").appendChild(can);
	var img = new Image();
	img.src = can.toDataURL();


	twgl.bindFramebufferInfo(gl, null);
	return img;
}

function exportImg()
{
	window.open(FBtoTex(fbs[1]).src)
	//document.getElementById("out").appendChild(FBtoTex(fbs[1].framebuffer));
}

function CreateFramebuffers(width, height)
{
    var attachments = [
        { format: gl.RGBA, type: gl.UNSIGNED_BYTE, min: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE, flipY : 1},
        { format: gl.DEPTH_STENCIL, },
    ];

    fbs[0] = twgl.createFramebufferInfo(gl, attachments, width, height);
    fbs[1] = twgl.createFramebufferInfo(gl, attachments, width, height);

    renderer_reset();
}

function CompileShader(progObj, strings)
{
    var shader = wutils.string.combine(strings);
    progObj = CreateFromShaders(progObj, vertShader, shader);
    return progObj
}

var vertShader = "";

var fragHeader = "";
var fragFunctions = "";
var fragMain = "";
var fragFormula = wutils.data.create("vec2 formula(vec2 uv, float p){    float prand = rand(p * time * 0.01) ;    float w = p * 0.1;    float rad = sin(time * p) * w + 0.5;    vec2 o = vec2(0.0, 0.0);    o.x = sin(p + prand) * rad;    o.y = cos(p + prand) * rad;    return o;}");


/*

vec2 formula(vec2 uv, float p)
{
    p = p * 4.0 - 2.0;
    float particleRand = rand(p * time * 0.01);
    float offset = particleRand * sin(p);
    float r = (-time / PI / 100.0) + 0.5 + offset;
    vec2 o = vec2(sin(particleRand) * r, cos(particleRand) * r);

    return o;
}

vec2 formula(vec2 uv, float p)
{
    float prand = rand(p * time * 0.01) ;

    float w = p * 0.1;

    float rad = sin(time * p) * w + 0.5;

    vec2 o = vec2(0.0, 0.0);
    o.x = sin(p + prand) * rad;
    o.y = cos(p + prand) * rad;

    return o;
}


*/


function Setup(files)
{
	gl = twgl.getWebGLContext(wutils.dom.get("viewer_canvas"), {preserveDrawingBuffer:true});

	twgl.resizeCanvasToDisplaySize(gl.canvas);

    vertShader = files[0];

    fragHeader = files[3];
    fragFunctions = files[4];
    fragMain = files[5];

	sand = CreateFromShaders(sand, files[0], files[1]);
	view = CreateFromShaders(view, files[0], files[2]);

	//bufferWidth = gl.canvas.width;
	//bufferHeight = gl.canvas.height;

	//console.log(bufferWidth)

	var arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };

    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    //var fbs = new Array(2);

    CreateFramebuffers(bufferWidth, bufferHeight);
    artboard.width.outlet(function(val) {
        CreateFramebuffers(val, artboard.height.value);
    });
    artboard.height.outlet(function(val) {
        CreateFramebuffers(artboard.width.value, val);
    });

    fragFormula.inlet("CodeMirror", "keydown");
    fragFormula.inlet("CodeMirror", "input");

    //editor.on('keyup', function(instance, e) {
    //console.log(e);
    //  compile_code(editor.getValue());
    //    CompileShader(sand, [fragHeader, fragFunctions, editor.getValue(), fragMain]);
    //});

    fragFormula.outlet(function(val) {
        //console.log(val)
       // CompileShader(sand, [fragHeader, fragFunctions, editor.getValue(), fragMain]);
    });
    console.log(editor);
    editor.on('keyup', function(instance, e) {
    //console.log(e);
    //  compile_code(editor.getValue());
        CompileShader(sand, [fragHeader, fragFunctions, editor.getValue(), fragMain]);
    });

    CompileShader(sand, [fragHeader, fragFunctions, editor.getValue(), fragMain]);


    //fragFormula.outlet(function(val) {
       
    //    CompileShader(sand, [fragHeader, fragFunctions, fragFormula.value, fragMain]);
    //});

    gl.canvas.addEventListener("mousemove", function(e) {
    	Mouse.get(e.offsetX, e.offsetY);
    });

	activeBuffer = 0;

	Mouse.setup();

    function update(time)
    {
    	Mouse.update();
    	if(Mouse.clicked)
    	{
    		mat3.translate(viewTrans, viewTrans, Mouse.delta);
            //console.log(viewMat)
            //console.log("x: " + viewTrans[6]);
            //console.log("y: " + viewTrans[7]);
    	}
    	//if(Math.abs(Mouse.scrollDelta) > 0.5);

    	//console.log(viewMat);
    	//console.log(Mouse.delta[0]);
    }

    function render(time)
    {
      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		//var v = wutils.conversion.hexToVec(artboard.particle.colour.value);

		//mat3.mul(viewMat, viewTrans, viewScale);

        bufferWidth = artboard.width.value;
        bufferHeight = artboard.height.value;

		mat3.mul(viewMat, viewScale, viewTrans);
        var uniforms = {
        	bgcol: wutils.conversion.hexToVec(artboard.background.colour.value),
            sand_col: wutils.conversion.hexToVec(artboard.particle.colour.value),

            time: time ,
            resolution: [gl.canvas.width, gl.canvas.height],
            buffer_res: [bufferWidth, bufferHeight],
            buf: fbs[activeBuffer].attachments[0],

            renderer_active: renderer.active,

            view_mat: viewMat,

            sand_radius: artboard.particle.radius.value,
            sand_opacity: artboard.particle.opacity.value
        };

      activeBuffer = (activeBuffer + 1) % fbs.length;

      	//Sand
        twgl.bindFramebufferInfo(gl, fbs[activeBuffer]);

	    	gl.useProgram(sand.progInfo.program);
	    	twgl.setBuffersAndAttributes(gl, sand.progInfo, bufferInfo);
	      	twgl.setUniforms(sand.progInfo, uniforms);

 		  	twgl.drawBufferInfo(gl, gl.TRIANGLES, bufferInfo);

      	twgl.bindFramebufferInfo(gl, null);

      	//View
      	uniforms.buffer = fbs[(activeBuffer + 1) % fbs.length].attachments[0];
      	//uniforms.resolution = [512, 512];

		gl.useProgram(view.progInfo.program);
		twgl.setUniforms(view.progInfo, uniforms);

	    twgl.drawBufferInfo(gl, gl.TRIANGLES, bufferInfo);
    }

    function lateUpdate(time) {
    	Mouse.lateUpdate();
    }

    function displayLoop(time) {
    	curTime = Date.now() / 1000;
    	deltaTime = curTime - lastTime;
    	if(deltaTime !== NaN && deltaTime < 1.0)
    		elapsedTime += deltaTime;

		update(elapsedTime);
		render(elapsedTime);
		lateUpdate(elapsedTime);

		lastTime = curTime;
		requestAnimationFrame(displayLoop);
    }
  requestAnimationFrame(displayLoop);
}
