var bufferWidth = 512;
var bufferHeight = 512;

var renderer = {
	active: true
}

var artboard = {
	background: {
		colour: wutils.data.create("#494746")
	},
	particle: {
		colour: wutils.data.create("#fffaf5"),
		radius: wutils.data.create(0.5),
		opacity: wutils.data.create(0.6)
	}
}



function OnLoad()
{
	artboard.background.colour.inlet("bgCol_input");
	artboard.background.colour.inlet("bgCol_output");
	
	artboard.particle.colour.inlet("sandCol_input");
	artboard.particle.colour.inlet("sandCol_output");

	artboard.particle.radius.inlet("sandSize_input");
	artboard.particle.radius.inlet("sandSize_output");
	
	artboard.particle.opacity.inlet("sandOpacity_input");
	artboard.particle.opacity.inlet("sandOpacity_output");



}

var shaders = wutils.file.loadMultiple(["shaders/vert.glsl", "shaders/frag.glsl", "shaders/fragViewer.glsl"], function(files) {
	console.log(files);

	//Setup WebGL
	Setup(files);
});

function renderer_toggle()
{
	renderer.active = !renderer.active;
}

function renderer_reset()
{
	elapsedTime = 0;
}