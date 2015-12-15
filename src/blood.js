'use strict';
const Particle = require('./particle');
const Consts = require('./constants');
const Clock = require('./clock');
const {RNG} = require('./rand')
const math = require('./math');

class Blood extends Particle {
	constructor(game, x, y, z) {
		super(game, x, y, z);
		this.collidesWithEntities = false;
		this.collidesWithPlayer = false;
		this.radius = 0.5;
		this.zAcc = -80

		this.color = RNG.colorBetween(0xff000060, 0xff000080);
		this.zBounce = 0.1;
	}

	update(dt) {
		super.update(dt);
		if (RNG.oneChanceIn(10)) {
			this.game.bloodBuffer.putPixel(Math.round(this.pos.x), Math.round(this.pos.y), this.color);
		}
	}

	onGroundCollision() {
		this.game.bloodBuffer.putPixel(Math.round(this.pos.x), Math.round(this.pos.y), this.color);
	}
}
module.exports = Blood;