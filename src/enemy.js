'use strict';
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
const math = require('./math');
const Vec2 = require('./vec2');
const STATE = {
	Wander: 0,
	Attack: 1,
	Search: 2,
	Wait: 3,
}

class Enemy extends Entity {
	constructor(game, x, y) {
		super(game, x, y);
		this.radius = 5.0;
		this.normalizeAccel = true;
		this.speed = 14*20;
		this.drag.set(8, 8);
		this.walking = false;
		this.animProgress = 0.0;
		this.maxHealth = 15;
		this.health = this.maxHealth;
		this.castsShadow = true;
		this.targetPos = new Vec2();
		this.haveTarget = false;
		this.lastSawPlayer = new Vec2();
		this.state = STATE.Wander;
		this.waitTimer = 0.0;
		this.shootTimer = 0.0;
		this.type = RNG.upTo(this.game.assets.enemyRotations.length);
	}

	pickRandomTarget() {
		let p = Vec2.temp(), n = Vec2.temp();
		for (let i = 0; i < 3; ++i) {
			let v = Vec2.temp(RNG.betweenF(-1, 1), RNG.betweenF(-1, 1)).normalize();
			let r = this.game.raycast(this.targetPos, n, this.pos, v, 1000);
			if (r > 20 || RNG.oneChanceIn(10)) {
				this.moveTowards(this.targetPos);
				this.state = STATE.Wander;
				return;
			}
		}
		this.state = STATE.Wait;
	}

	onCollision(who) {
		if (this.state === STATE.Wander && who == null) {
			this.pickRandomTarget();
		}
	}

	damage(amt, pos, vel) {
		this.health -= amt;
		if (this.health <= 0) {
			Sounds.play('die');
			this.solid = false;
			this.castsShadow = false;
			this.game.grid.remove(this)
			this.collidesWithEntities = false;
			this.collidesWithPlayer = false;
		} else {
			Sounds.play('monstOuch');
		}
		this.drag.x += 2;
		this.drag.y += 2;

		let gib = new Gore(this.game, pos.x, pos.y);
		gib.vel.scale(0.1).addScaled(vel, 0.4);
		this.game.addEntity(gib);
	}

	moveTowards(pos) {
		let fy = pos.y-this.pos.y;
		let fx = pos.x-this.pos.x;
		let len = Math.sqrt(fx*fx+fy*fy);

		this.acc.set((pos.x-this.pos.x)/Consts.TileSize, (pos.y-this.pos.y)/Consts.TileSize);
		this.walking = true;
		this.heading = Math.atan2(fy, fx);
	}

	think(dt) {
		if (this.health <= 0) return;

		if (this.health != this.maxHealth) {
			if (RNG.xChanceInY(this.maxHealth-this.health, this.maxHealth)) {
				let blood = new Blood(this.game, this.pos.x, this.pos.y);
				blood.zPos = 5;
				blood.vel.x *= 0.05; blood.vel.x += this.vel.x;
				blood.vel.y *= 0.05; blood.vel.y += this.vel.y;
				this.game.addEntity(blood);
			}
		}

		if (this.walking) {
			this.animProgress += Math.min(this.lastPos.distance(this.pos)/10, 1);
		}

		if (this.state === STATE.Wander) {
			this.drag.set(10, 10);
		}
		else {
			this.drag.set(8, 8);
		}

		let canSeePlayer = this.game.canSee(this.pos, this.game.player.pos);
		if (canSeePlayer && this.state !== STATE.Attack) {
			Sounds.play(RNG.choose(['wait', 'stop']));
			this.state = STATE.Attack;
			this.lastSawPlayer.copy(this.game.player.pos);
			this.shootAt(this.game.player.pos)
		}
		else if (this.state === STATE.Attack && !canSeePlayer) {
			this.state = STATE.Search;
		}

		switch (this.state) {
		case STATE.Wander:
			if (this.pos.distance(this.targetPos) < 8) {
				this.waitTimer = RNG.betweenF(1.0, 3.0);
				this.state = STATE.Wait;
			}
			else {
				this.moveTowards(this.targetPos);
			}
			break;
		case STATE.Wait:
			this.waitTimer -= dt;
			if (this.waitTimer < 0) {
				this.state = STATE.Wander;
				this.pickRandomTarget();
			}
			else {
				if (RNG.oneChanceIn(60)) {
					this.heading = RNG.betweenF(0, Math.PI*2);
				}
				if (RNG.oneChanceIn(60)) {
					this.acc.set(RNG.betweenF(-10, 10), RNG.betweenF(-10, 10));
				}
			}

			break;
		case STATE.Search:
			if (this.pos.distance(this.lastSawPlayer) < 8) {
				this.state = STATE.Wait;
				this.waitTimer = RNG.betweenF(0.0, 1.0);
			}
			else {
				this.moveTowards(this.game.player.pos);
			}
			break;
		case STATE.Attack:
			this.shootTimer -= dt;
			let pdist = this.pos.distance(this.game.player.pos);
			if (pdist < 30) {
				this.shootTimer -= dt*2;
			}
			if (pdist < 100) {
				this.moveTowards(this.game.player.pos);
			}
			if (this.shootTimer < 0) {
				this.shootAt(this.game.player.pos);
			}
			break;
		}
	}

	postUpdate() {
		this.acc.set(0, 0);
	}

	shootAt(pos) {
		let fy = pos.y-this.pos.y;
		let fx = pos.x-this.pos.x;
		let len = Math.sqrt(fx*fx+fy*fy);
		if (len != 0) {
			let bullet = new Bullet(this.game, this, fx/len, fy/len);
			this.game.addEntity(bullet);
		}
		this.shootTimer = RNG.betweenF(1, 4);
	}

	render(layer) {
		if (!this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x+this.radius, this.pos.y+this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x+this.radius, this.pos.y-this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x-this.radius, this.pos.y+this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x-this.radius, this.pos.y-this.radius))) {
			return;
		}
		if (this.health <= 0) {
			layer.context.drawImage(this.game.assets.deadEnemies[this.type].canvas,
				0, 0, 32, 16, Math.round(this.pos.x-16), Math.round(this.pos.y-8), 32, 16);
			layer.context.drawImage(this.game.assets.deadEnemies[this.type].canvas,
				0, 16, 32, 16, Math.round(this.pos.x-16), Math.round(this.pos.y-8), 32, 16);
		}
		else {
			let rotation = Math.round(this.heading / (Math.PI*2)*16)&15;

			let anim = (this.walking ? Math.floor(this.animProgress%7) : 0) + 0
			layer.context.drawImage(this.game.assets.enemyRotations[this.type].canvas,
				16*anim, 16*rotation, 16, 16,
				Math.round(this.pos.x-8),
				Math.round(this.pos.y-8),
				16, 16);
		}
		// drawing.drawCircle(this.game.debugContext, this.pos.x, this.pos.y, this.radius);
		//(layer.context, this.pos.x-mx, this.pos.y-my, this.radius);
	}

}

module.exports = Enemy;



