var Mouse = {
	pos: [0, 0],
	delta: [0, 0],
	last: [0, 0],
	clicked: false,
	scrollDelta: 1,
	setup: function() {
		window.addEventListener("mousedown", function(e) {
			//console.log(e);
			Mouse.clicked = true;
		})
		window.addEventListener("mouseup", function(e) {
			//console.log(e);
			Mouse.clicked = false;
		})

		window.addEventListener("mousewheel", function(e) {
			e.preventDefault();
			//console.log(e);
			var scrollDir = e.deltaY * 0.01;

			var scrollAmount = 0.1 * scrollDir;
			var scrollScale = 1 + scrollAmount;

			var mx = viewTrans[6] + (Mouse.pos[0]);// Mouse.pos[0];// - ((Mouse.pos[0] / gl.canvas.width) + 0.5);
			var my = viewTrans[7] + (1- Mouse.pos[1]);// = viewTrans[7] + 0.5;// Mouse.pos[1];// + ((-Mouse.pos[1] / gl.canvas.height) + 0.5);

			mat3.translate(viewScale, viewScale, [mx, my]);
			mat3.scale(viewScale, viewScale, [scrollScale, scrollScale]);
			mat3.translate(viewScale, viewScale, [-mx, -my]);
			//Mouse.clicked = false;
		})

	},
	get: function(x, y) {
		this.pos[0] = x / gl.canvas.width;
		this.pos[1] = y / gl.canvas.height;
	},
	update: function() {
		this.delta[0] = -(this.pos[0] - this.last[0]);
		this.delta[1] = (this.pos[1] - this.last[1]);

		//console.log(this.pos);
		//console.log(gl.canvas.width + " : " + gl.canvas.height);
	},
	lateUpdate: function() {
		//Mouse.scrollDelta = 0;
		this.last[0] = this.pos[0];
		this.last[1] = this.pos[1];
	}
}