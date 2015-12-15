'use strict';

const {Tween, TweenGroup} = require('./tweens')
const {distance2D} = require('./math');
const Vec2 = require('./vec2');
const LineSegment = require('./line_segment')
class Entity {
	constructor(game, x=0.0, y=0.0, z=0.0) {
		this.game = game;
		this.id = Entity.idCounter++;
		this.pos = new Vec2(x, y);
		this.vel = new Vec2(0, 0);
		this.radius = 1.0;
		this.enabled = true;
		this.elastic = false;

		this.collidesWithWorld = true;
		this.collidesWithEntities = true;
		this.collidesWithPlayer = true;
		this.life = 0;
		this.timed = false;

		this.tweenGroup = new TweenGroup();

		this.mobile = true;
		this.solid = true;
		this.castsShadow = false;

		this.alpha = 1.0;
		this.lastPos = new Vec2(0.0, 0.0);
		this.acc = new Vec2(0.0, 0.0);
		this.drag = new Vec2(0.0, 0.0);
		this.collisionIterations = 1;

		this.heading = 0;
		this.shadowSegments = null;

		this.normalizeAccel = false;
		this.speed = 1;

		this._cell = -1;
		this._indexInCell = -1;
		this.elasticity = 0.4;
		// @@@HACK
		this.hasZ = false;
		this.zPos = z;
		this.zVel = 0;
		this.zAcc = 0;
		this.zDrag = 0;
		this.zBounce = 0.8;
	}

	think(dt) {}
	postUpdate(dt) {}
	tryGridUpdate() {try { this.game.grid.update(this); } catch (e) { this.enabled = false; }} // @@HACK}

	update(dt) {
		if (!this.enabled) return;
		this.think(dt);
		this.tweenGroup.update(dt);
		if (this.mobile) {
			this.move(dt);
			if (this.collidesWithEntities || this.collidesWithPlayer) {
				this.tryGridUpdate();
			}
		}
		if (this.timed) {
			this.life -= dt;
			if (this.life <= 0) {
				this.enabled = false;
			}
		}
	}

	damage() {}

	updateShadowSegments() {
		let minX = this.pos.x-this.radius/2;
		let maxX = this.pos.x+this.radius/2;
		let minY = this.pos.y-this.radius/2;
		let maxY = this.pos.y+this.radius/2;

		let t0 = Vec2.temp(minX, minY).rotate(this.heading, this.pos);
		let t1 = Vec2.temp(minX, maxY).rotate(this.heading, this.pos);
		let t2 = Vec2.temp(maxX, maxY).rotate(this.heading, this.pos);
		let t3 = Vec2.temp(maxX, minY).rotate(this.heading, this.pos);

		this.shadowSegments[0].start.copy(t0); this.shadowSegments[0].end.copy(t1);
		this.shadowSegments[1].start.copy(t1); this.shadowSegments[1].end.copy(t2);
		this.shadowSegments[2].start.copy(t2); this.shadowSegments[2].end.copy(t3);
		this.shadowSegments[3].start.copy(t3); this.shadowSegments[3].end.copy(t0);
	}

	getSegments() {
		if (this.castsShadow) {
			if (this.shadowSegments == null) {
				this.shadowSegments = [
					new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)),
					new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)),
					new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)),
					new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0))
				];
			}
			this.updateShadowSegments()
			return this.shadowSegments;
		}
		return null;
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
		this.acc.x += -this.drag.x * this.vel.x;
		this.acc.y += -this.drag.y * this.vel.y;
		this.acc.nanCheck();

		this.pos.x += this.vel.x*dt + this.acc.x*dt*dt*0.5;
		this.pos.y += this.vel.y*dt + this.acc.y*dt*dt*0.5;
		this.pos.nanCheck();

		this.vel.x += this.acc.x*dt;
		this.vel.y += this.acc.y*dt;
		this.vel.nanCheck();

		if (this.hasZ) {
			this.zAcc += -this.zDrag * this.zVel;
			this.zVel += this.zAcc*dt;
			let nzPos = this.zPos + this.zVel*dt + this.zAcc*dt*dt*0.5;
			let deltaZ = nzPos - this.zPos;
			let steps = Math.ceil(Math.abs(deltaZ));
			for (let i = 0; i < steps; ++i) {
				let nz = this.zPos + deltaZ/steps;
				if (nz < 0) {
					this.zVel = -this.zVel*this.zBounce;
					this.onGroundCollision();
					break;
				}
				this.zPos = nz;
			}
		}

		if (this.collidesWithWorld) {
			for (let i = 0; i < this.collisionIterations; ++i) {
				this.collideWithWorld(dt);
			}
		}
		if (this.collidesWithEntities) {
			this.collideWithObjects(dt);
		}
		else if (this.collidesWithPlayer) {
			let e = this.game.player;
			if (this.pos.distance(e.pos) < this.radius + e.radius) {
				if (e.solid) {
					this.handleCollision(e, this.pos.to(e.pos), this.pos.distance(e.pos) - (this.radius + e.radius), false);
				}
			}
		}
	}

	collideWithObjects() {
		let es = this.game.grid.entitiesAround(this);
		for (let i = 0; i < es.length; ++i) {
			let e = es[i];
			if (e === this || !e.enabled) continue;
			if (this.pos.distance(e.pos) < this.radius + e.radius) {
				if (e.solid && e.collidesWithEntities || (this == this.game.player && e.collidesWithPlayer))
					this.handleCollision(e, this.pos.to(e.pos).normalize(), this.pos.distance(e.pos)-(this.radius + e.radius), false);
			}
		}
	}

	onGroundCollision() {}

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
			this.handleCollision(null, collisionPos.set(dx, dy), sign*penetration, true);
			if (++tries >= collisionMaxTries) {
				// degenerate cases where projecting us out of something
				// projects us into something else
				console.warn("Collision detection hit max iteration.", penetration);
				return false;
			}
		}
		return true;
	}

	handleCollision(who, normal, penetration, wasHard) {
		this.pos.nanCheck();
		this.vel.nanCheck();
		if (wasHard) {
			this.pos.x += normal.x * penetration;
			this.pos.y += normal.y * penetration;
			let dot = this.vel.dot(normal);
			if (this.elastic) {
				this.vel.x = -(2*dot*normal.x - this.vel.x);
				this.vel.y = -(2*dot*normal.y - this.vel.y);
				this.vel.x *= this.elasticity;
				this.vel.y *= this.elasticity;
			}
			else {
				if (dot < 0) {
					this.vel.x -= dot*normal.x;
					this.vel.y -= dot*normal.y;
				}
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
				// who.vel.x -= normal.x * penetration * 0.5;
				// who.vel.y -= normal.y * penetration * 0.5;

				this.pos.x += normal.x * penetration * 0.5;
				this.pos.y += normal.y * penetration * 0.5;

				// who.pos.x -= normal.x * penetration * 0.5;
				// who.pos.y -= normal.y * penetration * 0.5;
				// who.onCollision(who, normal, penetration, wasHard)
			}
		}
		this.pos.nanCheck();
		this.vel.nanCheck();
		this.onCollision(who, normal, penetration, wasHard)
	}
	onCollision(who, normal, penetration, wasHard){}

	tweenTo(field, tweenOptions) {
		tweenOptions.enabledField = 'enabled';
		return this.tweenGroup.add(new Tween(this, field, tweenOptions)).promise;
	}
}
Entity.idCounter = 0;
module.exports = Entity;
