'use strict';

let {createCanvas} = require('./util')
let math = require('./math');
class PixelBuffer {
	constructor(width, height, trackBounds=false) {
		this.width = width;
		this.height = height;
		this.canvas = createCanvas(this.width, this.height);
		this.context = this.canvas.getContext('2d');
		this.imageData = this.context.createImageData(this.width, this.height);
		this.pixels = new Uint32Array(this.imageData.data.buffer);
		this.bounds = {minX: width, minY: height, maxX: 0, maxY: 0}; // dirty rect
		this.trackBounds = trackBounds;
		this.pixelsDirty = false;
	}

	reset() {
		this.resetBounds();
		for (let i = 0, pix = this.pixels, len = pix.length; i < len; ++i) {
			pix[i] = 0;
		}
	}

	refreshImageData() {
		this.imageData = this.context.getImageData(0, 0, this.width, this.height);
		this.pixels = new Uint32Array(this.imageData.data.buffer);
	}

	resetBounds() {
		this.bounds.minX = this.width;
		this.bounds.minY = this.height;
		this.bounds.maxX = 0;
		this.bounds.maxY = 0;
	}

	update() {
		this.context.clearRect(0, 0, this.width, this.height);
		this.context.putImageData(this.imageData, 0, 0);
	}
	
	putPixel(x, y, v) {
		if ((x >>> 0) < this.width && (y >>> 0) < this.height) {
			this.pixelsDirty = true;
			this.pixels[x+y*this.width] = v;
			if (this.trackBounds) {
				this.bounds.minX = Math.min(this.bounds.minX, x);
				this.bounds.maxX = Math.max(this.bounds.maxX, x);
				this.bounds.minY = Math.min(this.bounds.minY, y);
				this.bounds.maxY = Math.max(this.bounds.maxY, y);
			}
		}
	}

	inBounds(x, y) {
		return (x >>> 0) < this.width && (y >>> 0) < this.height;
	}
	
	getPixel(x, y) {
		if ((x >>> 0) < this.width && (y >>> 0) < this.height) {
			return this.pixels[x+y*this.width];
		}
		return 0;
	}

	bresenham(x0, y0, x1, y1, color) {
		this.pixelsDirty = true;
		x0 = x0|0;
		y0 = y0|0;
		x1 = x1|0;
		y1 = y1|0;
		color = color|0;
		var dx = Math.abs(x1 - x0)|0;
		var dy = Math.abs(y1 - y0)|0;
		var sx = (x0 < x1) ? 1 : -1;
		var sy = (y0 < y1) ? 1 : -1;
		var err = dx - dy;
		var pixels = this.pixels;
		var width = this.width>>>0;
		var height = this.height>>>0;
		if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
			pixels[x0+y0*width] = color;
		}
		else if (x1 < 0 || x1 >= width || y1 < 0 && y1 >= height) {
			return;
		}

		this.bounds.minX = Math.min(this.bounds.minX, x0, x1);
		this.bounds.maxX = Math.max(this.bounds.maxX, x0, x1);
		this.bounds.minY = Math.min(this.bounds.minY, y0, y1);
		this.bounds.maxY = Math.max(this.bounds.maxY, y0, y1);

		pixels[x0+y0*width] = color;
		while (x0 !== x1 && y0 !== y1) {
			var e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				x0 += sx;
				if (x0 < 0 || x0 > width) {
					break;
				}
			}
			if (e2 <  dx) {
				err += dx;
				y0 += sy;
				if (y0 < 0 || y0 > height) {
					break;
				}
			}
			pixels[x0+y0*width] = color;
		}
	}
}

PixelBuffer.fromImage = function(image) {
	let pb = new PixelBuffer(image.width, image.height);
	pb.context.drawImage(image, 0, 0);
	pb.refreshImageData();
	return pb;
};

PixelBuffer.getRotatedTiles = function(image, tileSize, rotations=16) {
	let pb = PixelBuffer.fromImage(image);
	let result = new PixelBuffer(pb.width, pb.height * rotations);
	let numTiles = Math.floor(image.width / tileSize);
	for (let rot = 0; rot < rotations; ++rot) {
		let angle = (rot / rotations) * 2 * Math.PI;
		let sa = Math.sin(angle);
		let ca = Math.cos(angle);
		let yOffset = rot*tileSize;
		for (let tile = 0; tile < numTiles; ++tile) {
			let xOffset = tile*tileSize;
			for (let j = 0; j < tileSize; ++j) {
				for (let i = 0; i < tileSize; ++i) {
					let px = Math.floor(ca*(i-tileSize/2) + sa*(j-tileSize/2) + tileSize/2);
					let py = Math.floor(ca*(j-tileSize/2) - sa*(i-tileSize/2) + tileSize/2);
					px = math.clamp(px, 0, tileSize-1);
					py = math.clamp(py, 0, tileSize-1);
					result.putPixel(xOffset+i, yOffset+j, pb.getPixel(xOffset+px, py));
				}
			}
		}
	}
	result.update();
	return result;
};

module.exports = PixelBuffer;
