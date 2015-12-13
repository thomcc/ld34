'use strict';

const {Tween, TweenGroup} = require('./tweens')
const GameObject = require('./game_object');
const {distance2D} = require('./math');
const Vec2 = require('./vec2');

class Entity extends GameObject {
	constructor(game, x=0.0, y=0.0) {
		super(game);
		this.pos.x = x;
		this.pos.y = y;
		this.tweenGroup = new TweenGroup();

		this.collidesWithWorld = true;
		this.collidesWithEntities = true;
		this.collidesWithPlayer = true;
		this.mobile = true;
		this.solid = true;
		
		this.alpha = 1.0;
		this.lastPos = new Vec2(0.0, 0.0);
		this.vel = new Vec2(0.0, 0.0);
		this.acc = new Vec2(0.0, 0.0);

		this.drag = 0.0;
		this.collisionIterations = 1;

		this.heading = 0;

		this.normalizeAccel = false;
		this.speed = 1;

		this._cell = -1;
		this._indexInCell = -1;
	}

	think(dt) {}

	update(dt) {
		this.think(dt);
		this.tweenGroup.update(dt);
		if (this.mobile) {
			this.move(dt);
			this.game.grid.update(this);
		}
	}

	move(dt) {
		this.lastPos.copy(this.pos);
		this.lastPos.nanCheck();
		if (this.normalizeAccel) {
			if (this.acc.length() > 1.0) {
				this.acc.normalizeOrZero();
			}
		}
		this.acc.scale(this.speed);
		this.acc.x += -this.drag * this.vel.x;
		this.acc.y += -this.drag * this.vel.y;
		this.acc.nanCheck();

		this.pos.x += this.vel.x*dt + this.acc.x*dt*dt*0.5;
		this.pos.y += this.vel.y*dt + this.acc.y*dt*dt*0.5;
		this.pos.nanCheck();

		this.vel.x += this.acc.x*dt;
		this.vel.y += this.acc.y*dt;
		this.vel.nanCheck();
		
		if (this.collidesWithWorld) {
			for (let i = 0; i < this.collisionIterations; ++i) {
				this.collideWithWorld(dt);
			}
		}
	}

	collideWithWorld(dt) {
		const collisionMaxTries = 4;
		let collisionPos = Vec2.Pool.get();
		for (let tries = 0;;) {
			let sign = this.game.closestPoint(collisionPos, this.pos, this.radius);
			if (sign === 0) {
				break;
			}
			collisionPos.nanCheck();
			let dx = this.pos.x - collisionPos.x;
			let dy = this.pos.y - collisionPos.y;

			let dist = Math.sqrt(dx*dx+dy*dy);

			let penetration = this.radius - sign * dist;
			if (penetration <= 0.001) {
				// @@ROBUSTNESS: this is a hack
				break;
			}
			if (dist === 0) {
				break;
			}
			dx /= dist;
			dy /= dist;
			// this should project us out of the collision
			this.onCollision(null, collisionPos.set(dx, dy), sign*penetration, true);
			if (++tries >= collisionMaxTries) {
				// degenerate cases where projecting us out of something
				// projects us into something else
				console.warn("Collision detection hit max iteration.", penetration);
				return false;
			}
		}
		return true;
	}

	onCollision(who, normal, penetration, wasHard) {
		this.pos.nanCheck();
		this.vel.nanCheck();
		if (wasHard) {
			this.pos.x += normal.x * penetration;
			this.pos.y += normal.y * penetration;
			let dot = this.vel.dot(normal);
			if (dot < 0) {
				this.vel.x -= dot*normal.x;
				this.vel.y -= dot*normal.y;
			}
		}
		else {
			if (who == null || !who.mobile) {
				this.vel.x += normal.x * penetration;
				this.vel.y += normal.y * penetration;
				this.pos.x += normal.x * penetration;
				this.pos.y += normal.y * penetration;
			}
			else {
				this.vel.x += normal.x * penetration * 0.5;
				this.vel.y += normal.y * penetration * 0.5;
				this.pos.x += normal.x * penetration * 0.5;
				this.pos.y += normal.y * penetration * 0.5;

				who.vel.x -= normal.x * penetration * 0.5;
				who.vel.y -= normal.y * penetration * 0.5;
				who.pos.x -= normal.x * penetration * 0.5;
				who.pos.y -= normal.y * penetration * 0.5;
			}
		}
		this.pos.nanCheck();
		this.vel.nanCheck();
	}

	tweenTo(field, tweenOptions) {
		tweenOptions.enabledField = 'enabled';
		return this.tweenGroup.add(new Tween(this, field, tweenOptions)).promise;
	}
}

module.exports = Entity;
