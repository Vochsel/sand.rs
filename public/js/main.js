var bufferWidth = 256;
var bufferHeight = 256;


var shaders = wutils.file.loadMultiple(["shaders/vert.glsl", "shaders/frag.glsl", "shaders/fragViewer.glsl"], function(files) {
	console.log(files);

	//Setup WebGL
	Setup(files);
});