var bufferWidth = 4096;
var bufferHeight = 4096;

var renderer = {
	active: true
}

var artboard = {
	background: {
		colour: wutils.data.create("#494746")
	},
	particle: {
		colour: wutils.data.create("#ffe8c4"),
		radius: wutils.data.create(0.02),
		opacity: wutils.data.create(1.0)
	},
	width: wutils.data.create(1280),
	height: wutils.data.create(720),
}

var editor;


function OnLoad() {
	artboard.background.colour.inlet("bgCol_input");
	artboard.background.colour.inlet("bgCol_output");

	artboard.particle.colour.inlet("sandCol_input");
	artboard.particle.colour.inlet("sandCol_output");

	artboard.particle.radius.inlet("sandSize_input");
	artboard.particle.radius.inlet("sandSize_output");

	artboard.particle.opacity.inlet("sandOpacity_input");
	artboard.particle.opacity.inlet("sandOpacity_output");

	artboard.width.inlet("buffer_width_input");
	
	artboard.height.inlet("buffer_height_input");
	

	wutils.input.keybind("r", function(e){ 
		//viewMat = mat3.create();
		console.log(viewMat);
	});
	
	editor = CodeMirror.fromTextArea(wutils.dom.get("editor_input"), {
		tabSize: 2,
		indentUnit: 2,
		mode: 'text/x-glsl'
	});

	wutils.file.load("demo/default.sand", function(file) {
		editor.setValue(file);
	});
	
	var shaders = wutils.file.loadMultiple(["shaders/vert.glsl", 
										"shaders/frag.glsl", 
										"shaders/fragViewer.glsl",
										"shaders/frag_header.glsl",
										"shaders/frag_functions.glsl",
										"shaders/frag_main.glsl"], function(files) {

		//Setup WebGL
		Setup(files);
	});
}



function renderer_toggle() {
	renderer.active = !renderer.active;
}

function renderer_reset() {
	elapsedTime = 0;
}

function renderer_export() {
	exportImg();
}