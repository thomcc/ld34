'use strict';
const Particle = require('./particle');
const Consts = require('./constants');
const Clock = require('./clock');
const {RNG} = require('./rand')
const math = require('./math');
const Blood = require('./blood');

class Gore extends Particle {
	constructor(game, x, y, z=5) {
		super(game, x, y, z);
		this.radius = 1;
		this.life *= 2;
		this.timed = true;
		this.collidesWithEntities = false;
		this.drag.set(2, 2);
		this.elastic = true;
		this.color = RNG.colorBetween(0xff1a395f, 0xff304880);// 0xff7898f0, 0xff88a8ff)
	}

	update(dt) {
		super.update(dt);
		if (this.vel.length() > 5) {
			let blood = new Blood(this.game, this.pos.x, this.pos.y, Math.max(0.1, this.pos.z-1));
			blood.zPos = this.zPos;
			blood.vel.x *= 0.05; blood.vel.x += this.vel.x
			blood.vel.y *= 0.05; blood.vel.y += this.vel.y
			blood.zVel *= 0.05; blood.zVel += this.zVel
			this.game.addEntity(blood);
		}
	}

	doCollision(o) {
		if (!this.enabled) return;
		if (o && o instanceof Gore) return;
		for (let i = 0; i < 20; i++) {
			let blood = new Blood(this.game, this.pos.x, this.pos.y);
			blood.zPos = this.zPos;
			blood.vel.x *= 0.05; blood.vel.x += this.vel.x*0.5;
			blood.vel.y *= 0.05; blood.vel.y += this.vel.y*0.5;
			blood.zVel *= 0.05; blood.zVel += this.zVel*0.5
			this.game.addEntity(blood);
		}
	}

	onGroundCollision() {
		if (Math.abs(this.zVel) > 5) this.doCollision();
	}

	onCollision(o) {
		this.doCollision(o);
	}



}
module.exports = Gore;


