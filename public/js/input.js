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
			console.log(e);
			var scrollDir = e.deltaY * 0.01;

			var scrollAmount = 0.1 * scrollDir;
			var scrollScale = 1 + scrollAmount;
			var temp = mat3.create(1, 1, 1);
			//mat3.translate(viewScale, viewScale, [-Mouse.pos[0] / gl.canvas.width, Mouse.pos[1] / gl.canvas.height]);
			mat3.scale(viewScale, viewScale, [scrollScale, scrollScale]);
			//Mouse.clicked = false;
		})

	},
	get: function(x, y) {
		this.pos[0] = x;
		this.pos[1] = y;
	},
	update: function() {
		
		this.delta[0] = -(this.pos[0] - this.last[0]) * 0.001;
		this.delta[1] = (this.pos[1] - this.last[1]) * 0.001;

	},
	lateUpdate: function() {
		//Mouse.scrollDelta = 0;
		this.last[0] = this.pos[0];
		this.last[1] = this.pos[1];
	}
}