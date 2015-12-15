'use strict';

const {Tween, TweenGroup} = require('./tweens')
const Entity = require('./entity');
const Input = require('./input');
const {RNG} = require('./rand');
const drawing = require('./drawing');
const Consts = require('./constants');
const Clock = require('./clock');
const Bullet = require('./bullet');
const Gore = require('./gore');
const Blood = require('./blood');
const Sounds = require('./audio');
class Player extends Entity {
	constructor(game) {
		super(game);
		this.radius = 5.0;
		this.normalizeAccel = true;
		this.speed = 20*20;
		this.drag.set(5, 5);
		this.walking = false;
		this.animProgress = 0.0;
		this.health = 50;
		this.maxHealth = 50;
	}

	damage(amt, pos, vel) {
		let gib = new Gore(this.game, pos.x, pos.y);
		gib.vel.scale(0.1).addScaled(vel, 0.4);
		this.vel.addScaled(vel, 0.3);
		this.game.addEntity(gib);
		this.health -= amt;
		if (this.health <= 0) {
			Sounds.play('die');
			this.game.killPlayer()
		} else {
			Sounds.play('ouch');
		}
	}

	think(dt) {
		if (this.walking) {
			this.animProgress += Math.min(this.lastPos.distance(this.pos)/10, 1);
		}
		let {x:mwx, y:mwy} = this.game.mouse;
		let fy = mwy-this.pos.y;
		let fx = mwx-this.pos.x;
		let len = Math.sqrt(fx*fx+fy*fy);

		if (this.health > 0) {
			if (Input.mouse.isDown && len > 1 && !Input.keyboard.isDown('space')) {
				this.acc.set((mwx-this.pos.x)/Consts.TileSize, (mwy-this.pos.y)/Consts.TileSize);
				this.walking = true;
			} else {
				this.walking = false;
				this.animProgress = 0.0;
				this.acc.set(0.0, 0.0);
			}

			this.heading = Math.atan2(fy, fx);
			if (Input.mouse.wasPressed() && Input.keyboard.isDown('space')) {
				let bullet = new Bullet(this.game, this, fx/len, fy/len, 10);
				this.game.addEntity(bullet);
			}
		}
		if (this.health != this.maxHealth) {
			if (RNG.xChanceInY(this.maxHealth-this.health, this.maxHealth)) {
				let blood = new Blood(this.game, this.pos.x, this.pos.y);
				blood.zPos = 5;
				blood.vel.x *= 0.05; blood.vel.x += this.vel.x;
				blood.vel.y *= 0.05; blood.vel.y += this.vel.y;
				this.game.addEntity(blood);
			}
			if (RNG.oneChanceIn(60)) {
				this.health = Math.min(this.health+1, this.maxHealth);
			}
		}
	}

	render(layer, pix, minX, minY) {
		if (this.health <= 0) {
			layer.context.drawImage(this.game.assets.dead,
				0, 0, 32, 16, Math.round(this.pos.x-16), Math.round(this.pos.y-8), 32, 16);
			layer.context.drawImage(this.game.assets.dead,
				0, 16, 32, 16, Math.round(this.pos.x-16), Math.round(this.pos.y-8), 32, 16);
			return;
		}
		let rotation = Math.round(this.heading / (Math.PI*2)*16)&15;
		let anim = (this.walking ? Math.floor(this.animProgress%7) : 0) + 0
		layer.context.strokeStyle = 'green';
		layer.context.drawImage(this.game.assets.playerRotations.canvas,
			16*anim, 16*rotation, 16, 16,
			Math.round(this.pos.x-8),
			Math.round(this.pos.y-8),
			16, 16);


		// drawing.drawCircle(this.game.debugContext, this.pos.x, this.pos.y, this.radius);
		//(layer.context, this.pos.x-mx, this.pos.y-my, this.radius);
	}

}

module.exports = Player;
