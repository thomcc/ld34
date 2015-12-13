'use strict';
const math = require('./math');
const Vec2 = require('./vec2');
const Clock = require('./clock');
const {UIRand} = require('./rand');
const {ASSERT} = require('./debug');

function smoothDampV2(out, pos, target, vel, smoothing, maxSpeed, dt) {
	smoothing = Math.max(0.0001, smoothing);
	let n = 2.0 / smoothing;
	let step = n * dt;
	let curve = 1.0 / (1.0 + step + 0.48*step*step + 0.235*step*step*step);
	let distX = pos.x-target.x, distY = pos.y-target.y;
	let maxLength = maxSpeed*smoothing;

	if (distX*distX + distY*distY > maxLength*maxLength) {
		let invDl = math.safeInverseLength(distX, distY);
		distX *= invDl;
		distY *= invDl;
	}
	let targetX = pos.x - distX;
	let targetY = pos.y - distY;

	let changeX = (vel.x + n*distX)*dt;
	let changeY = (vel.y + n*distY)*dt;

	vel.x = (vel.x - n*changeX)*curve;
	vel.y = (vel.y - n*changeY)*curve;
	vel.nanCheck()
	
	let resultX = targetX + (distX + changeX) * curve;
	let resultY = targetY + (distY + changeY) * curve;

	if ((target.x-pos.x)*(resultX - target.x) + (target.y-pos.y)*(resultY - target.y) > 0.0) {
		resultX = target.x;
		resultY = target.y;
		vel.x = 0.0;
		vel.y = 0.0;
	}
	out.x = resultX;
	out.y = resultY;
	out.nanCheck()
	return out;
}

class Camera {
	constructor(game, focus, target, width, height) {
		this.game = game;
		this.focus = focus;
		this.target = target;
		// this.realTarget = new Vec2(0.0, 0.0);
		this.width = width;
		this.height = height;
		this.goal = new Vec2(0.0, 0.0);
		this.unclampedPos = new Vec2(0.0, 0.0);
		this.pos = new Vec2(0.0, 0.0);
		this.vel = new Vec2(0.0, 0.0);
		this.maxSpeed = Number.MAX_VALUE;
		this.smoothing = 0.3;
		this.jitterLevel = 0;
		this.shake = new Vec2(0.0, 0.0);
		this.shakeDrag = 0.2;
		this.driftMul = new Vec2(0.1, 0.2);

		this.minX = 0;
		this.maxX = width;
		this.minY = 0;
		this.maxY = height;
	}

	xBound() { return this.game.width; }
	yBound() { return this.game.height; }

	setPosition(nx, ny, reset) {
		if (reset) {
			this.vel.set(0, 0);
			this.goal.set(nx, ny);
			this.shake.set(0, 0);
		}
		this.unclampedPos.set(nx, ny)
		this.pos.x = math.clamp(nx, this.width*0.5, this.xBound()-this.width*0.5);
		this.pos.y = math.clamp(ny, this.height*0.5, this.yBound()-this.height*0.5);


		this.minX = this.pos.x-this.width*0.5;
		this.minY = this.pos.y-this.height*0.5;

		this.maxX = this.minX+this.width;
		this.maxY = this.minY+this.height;

		let {pos:{x:fx, y:fy}, radius} = this.focus;

		// @HACK: prevent camera from not containing player...
		if (fx - radius < this.minX) {
			this.minX = fx-radius;
			this.pos.x = this.minX + this.width*0.5;
			this.maxX = this.minX + this.width;
		}

		if (fy - radius < this.minY) {
			this.minY = fy-radius;
			this.pos.y = this.minY + this.height*0.5;
			this.maxY = this.minY + this.height;
		}

		if (fx + radius > this.maxX) {
			this.maxX = fx + radius;
			this.pos.x = this.maxX - this.width*0.5;
			this.minX = this.maxX - this.width;
		}

		if (fy + radius > this.maxY) {
			this.maxY = fy + radius;
			this.pos.y = this.maxY - this.height*0.5;
			this.minY = this.maxY - this.height;
		}
		ASSERT(+this.minX === this.minX);
		ASSERT(+this.minY === this.minY);
		ASSERT(+this.maxX === this.maxX);
		ASSERT(+this.maxY === this.maxY);
		this.pos.nanCheck();
		this.vel.nanCheck();
		this.goal.nanCheck();
		this.target.nanCheck();
	}

	
	update(dt) {
		smoothDampV2(this.goal, this.goal, this.target, this.vel, this.smoothing, this.maxSpeed, dt);
		let driftX = Math.cos(Clock.accumTime*this.driftMul.x) * 5 * this.jitterLevel
		let driftY = Math.cos(Clock.accumTime*this.driftMul.y) * 5 * this.jitterLevel

		this.unclampedPos.x = this.goal.x + driftX + this.shake.x;
		this.unclampedPos.y = this.goal.y + driftY + this.shake.y;

		this.shake.x -= this.shakeDrag*this.shake.x*dt;
		this.shake.y -= this.shakeDrag*this.shake.y*dt;
		
		this.setPosition(this.unclampedPos.x, this.unclampedPos.y);
	}
	
	
}

module.exports = Camera;
