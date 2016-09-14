var bufferWidth = 512;
var bufferHeight = 512;

var renderer = {
	active: true
}

var backgroundColor = wutils.data.create("#494746");
var sandColor = wutils.data.create("#fffaf5");
var sandSize = wutils.data.create(0.5);

function OnLoad()
{
	backgroundColor.inlet("bgColor");
	backgroundColor.outlet(function(v) {
		console.log(v);
	})
	sandColor.inlet("sandColor");
	sandSize.inlet("sandSize");

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