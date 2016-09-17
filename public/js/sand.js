function Artboard(w, h) {
	//Canvas Dimensions
	this.width = w;
	this.height = h;

	//Background Settings
	this.background = {
		colour: "#000000"
	};

	//Particle Settings
	this.particle = new Particle("#FFFFFF", 0.1, 1.0);
}

function Particle(colour, radius, opacity) {
	this.colour = colour;
	this.radius = radius;
	this.radius = radius;
}