var bufferWidth = 956;
var bufferHeight = 956;


var shaders = wutils.file.loadMultiple(["shaders/vert.glsl", "shaders/frag.glsl", "shaders/fragViewer.glsl"], function(files) {
	console.log(files);

	//Setup WebGL
	Setup(files);
});