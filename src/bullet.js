'use strict';

const {Tween, TweenGroup} = require('./tweens')
const Entity = require('./entity');
const Input = require('./input');
const drawing = require('./drawing');
const Consts = require('./constants');
const Clock = require('./clock');
const {RNG} = require('./rand');
const Gore = require('./gore');
const Sounds = require('./audio');
class Bullet extends Entity {
	constructor(game, shooter, dx, dy, dmg=RNG.upTo(4), speed=400) {
		super(game, shooter.pos.x+dx*shooter.radius, shooter.pos.y+dy*shooter.radius);
		Sounds.play('bang');
		this.dmg = dmg;
		this.speed = speed;
		this.shooter = shooter;
		this.drag.set(0, 0);
		this.vel.x = dx*this.speed;
		this.vel.y = dy*this.speed;
		this.life = 3.0;
		this.timed = true;
	}

	render(ctx, buffer, minX, minY) {
		let x0 = Math.round(this.pos.x-minX);
		let y0 = Math.round(this.pos.y-minY);
		let x1 = Math.round(this.lastPos.x-minX);
		let y1 = Math.round(this.lastPos.y-minY);

		let dx = x1-x0, dy = y1-y0;
		let dist = Math.ceil(Math.sqrt(dx*dx+dy*dy));
		for (let i = 0; i < dist; ++i) {
			// if (RNG.xChanceInY(i, dist)) continue;
			let br = (i * 128 / dist+64)&0xff;
			let xx = (x0 - dx * i / dist)|0;
			let yy = (y0 - dy * i / dist)|0;
			let pixel = 0xff000000 | (br * 0x10101);
			buffer.putPixel(xx, yy, pixel);
		}
	}

	onCollision(who) {
		if (!this.enabled) return;
		if (who != null && who != this.shooter) {
			who.damage(this.dmg, this.pos, this.vel);
			this.enabled = false;
		}
		if (who != this.shooter) this.enabled = false;
	}

}
module.exports = Bullet;
