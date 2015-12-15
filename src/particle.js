'use strict';
const Entity = require('./entity');
const Input = require('./input');
const drawing = require('./drawing');
const Consts = require('./constants');
const Clock = require('./clock');
const {RNG} = require('./rand')
const math = require('./math');


class Particle extends Entity {
	constructor(game, x=0.0, y=0.0, z=0.0) {
		super(game, x, y, z);
		this.collidesWithEntities = false;
		this.collidesWithPlayer = false;
		this.radius = 1;
		this.drag.set(1, 1);

		this.hasZ = true;
		this.zDrag = 0.5;
		this.color = 0xff000000;
		this.life = RNG.betweenF(0.4, 0.8);
		do {
			this.vel.x = RNG.betweenF(-1.0, 1.0);
			this.vel.y = RNG.betweenF(-1.0, 1.0);
		} while (this.vel.lenSq() > 1.0);
		this.vel.x *= 60;
		this.vel.y *= 60;
		this.zAcc = -60;
	}

	update(dt) {
		super.update(dt);
		this.life -= dt;
		if (this.life <= 0) {
			this.enabled = false;
		}
	}
	postUpdate(dt) {
		this.acc.set(0, 0);
		this.zAcc = -60;
	}

	render(ctx, buffer, minX, minY) {
		let {width, height} = buffer;
		let x = Math.round(this.pos.x-minX);
		let y = Math.round(this.pos.y-minY);//-this.zPos); // no visual representation for z
		if ((x >>> 0) >= width) return;
		if ((y >>> 0) >= height) return;
		let {pixels} = buffer.getPixbuf();
		let c = this.color >>> 0;
		if (this.radius < 1.0) {
			pixels[x+y*width] = c;
			return;
		}
		let x0 = math.clamp(Math.round(x-this.radius), 0, width-1)>>>0;
		let x1 = math.clamp(Math.round(x+this.radius), 0, width-1)>>>0;
		let y0 = math.clamp(Math.round(y-this.radius), 0, height-1)>>>0;
		let y1 = math.clamp(Math.round(y+this.radius), 0, height-1)>>>0;
		for (let yy = y0; yy < y1; ++yy) {
			let row = (yy*width) >>> 0;
			for (let xx = x0; xx < x1; ++xx) {
				pixels[xx+row] = c;
			}
		}
	}


}

module.exports = Particle;
