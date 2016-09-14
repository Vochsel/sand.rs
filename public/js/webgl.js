var gl;
var sand = {prog: null, progInfo: null};
var view = {prog: null, progInfo: null};

var activeBuffer;
var fbs = new Array(2);

var lastTime, curTime, deltaTime, elapsedTime = 0;

function CreateFromShaders(obj, vertSrc, fragSrc)
{
	obj.prog = twgl.createProgramFromSources(gl, [vertSrc, fragSrc]);
	obj.progInfo = twgl.createProgramInfoFromProgram(gl, obj.prog);
	return obj;
}

function FBtoTex(fb)
{
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
	document.getElementById("out").appendChild(can);
	var img = new Image();
	img.src = can.toDataURL();


	twgl.bindFramebufferInfo(gl, null);
	return img;
}

function exportImg()
{
	window.open(FBtoTex(fbs[1].framebuffer).src)
	//document.getElementById("out").appendChild(FBtoTex(fbs[1].framebuffer));
}



function Setup(files)
{
	gl = twgl.getWebGLContext(wutils.dom.get("viewer"), {preserveDrawingBuffer:true});
	
	twgl.resizeCanvasToDisplaySize(gl.canvas);
	
	sand = CreateFromShaders(sand, files[0], files[1]);
	view = CreateFromShaders(view, files[0], files[2]);

	bufferWidth = gl.canvas.width;
	bufferHeight = gl.canvas.height;

	//console.log(bufferWidth)

	var arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };

    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    //var fbs = new Array(2);
	var attachments = [
		{ format: gl.RGBA, type: gl.UNSIGNED_BYTE, min: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE, },
		{ format: gl.DEPTH_STENCIL, },
	];

	
    fbs[0] = twgl.createFramebufferInfo(gl, attachments, bufferWidth, bufferHeight);
    fbs[1] = twgl.createFramebufferInfo(gl, attachments, bufferWidth, bufferHeight);


	activeBuffer = 0;

    function update(time) 
    {

    }
	
    function render(time) 
    {
      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		var v = wutils.conversion.hexToVec(sandColor.value);
      var uniforms = {
      	  bgcol: wutils.conversion.hexToVec(backgroundColor.value),
        sand_col_r: v[0],
        sand_col_g: v[1],
        sand_col_b: v[2],
        time: time ,
        resolution: [gl.canvas.width, gl.canvas.height], 
        buffer_res: [bufferWidth, bufferHeight],
        buffer: fbs[activeBuffer].attachments[0],

        renderer_active: renderer.active,

      
        sand_rad: sandSize.value
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