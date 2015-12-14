'use strict';
const math = require('./math');
const Vec2 = require('./vec2');
const Clock = require('./clock');
const {UIRand} = require('./rand');
const {ASSERT} = require('./debug');
const Input = require('./input');
const Consts = require('./constants');

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
		// this.vel = new Vec2(0.0, 0.0);
		// this.maxSpeed = Number.MAX_VALUE;
		// this.smoothing = 0.3;
		this.jitterLevel = 0;
		this.shake = new Vec2(0.0, 0.0);
		this.shakeDrag = 0.2;
		this.driftMul = new Vec2(0.1, 0.2);

		this.lookahead = 1.1;
		this.speed = 2.5;

		this.minX = 0;
		this.maxX = width;
		this.minY = 0;
		this.maxY = height;
	}

	xBound() { return this.game.width; }
	yBound() { return this.game.height; }

	setPosition(nx, ny, reset) {
		if (reset) {
			// this.vel.set(0, 0);
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
		// this.vel.nanCheck();
		this.goal.nanCheck();
		this.target.nanCheck();
	}


	update(dt) {
		let cx = this.pos.x;
		let cy = this.pos.y;
		let fx = this.focus.pos.x;
		let fy = this.focus.pos.y;

		if (Math.abs(fx - cx) < 100/Consts.SCALE) {
			fx = cx;
		}
		if (Math.abs(fy - cy) < 100/Consts.SCALE) {
			fy = cy;
		}

		let fvx = this.focus.vel.x*0.1;
		let fvy = this.focus.vel.y*0.1;

		let gx = fx + fvx * this.lookahead;
		let gy = fy + fvy * this.lookahead;
		let aiming = false;
		let aimDiv = 1;

		if (Input.mouse.isDown) {
			// aiming = true;
			aimDiv = 4;
		}

		if (Input.keyboard.isDown('space')) {
			// aiming = true;
			aimDiv = 2;
		}

		if (aiming) {
			let mwx = this.game.mouse.x;
			let mwy = this.game.mouse.y;

			let frx = mwx - this.focus.pos.x;
			let fry = mwy - this.focus.pos.y;
			gx += frx / aimDiv;
			gy += fry / aimDiv;
		}

		gx = math.clamp(gx, this.width/2, this.xBound()-this.width/2);
		gy = math.clamp(gy, this.height/2, this.yBound()-this.height/2);

		var nx = gx - cx;
		var ny = gy - cy;

		var relax = 1.0 - Math.exp(-this.speed*dt);

		nx = this.pos.x + nx*relax;
		ny = this.pos.y + ny*relax;

		this.setPosition(nx, ny);

		/*
		smoothDampV2(this.goal, this.goal, this.target, this.vel, this.smoothing, this.maxSpeed, dt);
		let driftX = Math.cos(Clock.accumTime*this.driftMul.x) * 5 * this.jitterLevel
		let driftY = Math.cos(Clock.accumTime*this.driftMul.y) * 5 * this.jitterLevel

		this.unclampedPos.x = this.goal.x + driftX + this.shake.x;
		this.unclampedPos.y = this.goal.y + driftY + this.shake.y;

		this.shake.x -= this.shakeDrag*this.shake.x*dt;
		this.shake.y -= this.shakeDrag*this.shake.y*dt;

		this.setPosition(this.unclampedPos.x, this.unclampedPos.y);*/
	}


}

module.exports = Camera;
