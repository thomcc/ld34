'use strict';

const PixelBuffer = require('./pixel_buffer');

class Layer {
	constructor(name, width, height) {
		this.name = name;
		// if (!pbuf) {
			this.buffer = new PixelBuffer(width, height);
		// }
		// this.buffer = pbuf;
		this.width = this.buffer.width;
		this.height = this.buffer.height;
		this.canvas = this.buffer.canvas;
		this.context = this.buffer.context;
		this.viewport = { x: 0, y: 0, width: this.width, height: this.height };

		this.alpha = 1.0;
		this.blendMode = 'source-over';
	}

	clear() {
		this.context.clearRect(0, 0, this.width, this.height);
	}

	fill(color) {
		this.context.fillStyle = color;
		this.context.fillRect(0, 0, this.width, this.height);
	}

}
module.exports = Layer;