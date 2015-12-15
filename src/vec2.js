'use strict'
const {ASSERT} = require('./debug');
class Vec2 {
	constructor(x, y) { this.x = +x||0.0; this.y = +y||0.0; }
	perp() { return new Vec2(-this.y, this.x); }
	to(o) { return new Vec2(o.x-this.x, o.y-this.y); }
	dot(o) { return this.x*o.x+this.y*o.y; }

	perpDot(o) { return -this.y*o.x+this.x*o.y; }
	plus(o) { return new Vec2(this.x+o.x, this.y+o.y); }

	minus(o) { return new Vec2(this.x-o.x, this.y-o.y); }
	lenSq() { return this.x*this.x+this.y*this.y; }
	len() { return Math.sqrt(this.x*this.x + this.y*this.y); }
	length() { return this.len(); }
	lengthSquared() { return lenSq(); }
	scaled(n) { return new Vec2(this.x*n, this.y*n); }
	normalize() { this.normalizeGetLen(); return this; }
	clone() { return new Vec2(this.x, this.y); }
	copy({x, y}) { this.x = x; ; this.y = y; return this; }

	scale(n) { this.x *= n; this.y *= n; return this; }
	set(x, y) { this.x = x; this.y = y; return this; }
	clear() { return this.set(0.0, 0.0); }
	add(o) { this.x += o.x; this.y += o.y; return this; }

	addScaled(o, n) { this.x += o.x*n; this.y += o.y*n; return this; }

	translate(x, y) { this.x += x; this.y += y; return this; }
	normalized() { return this.clone().normalize(); }
	scaled(n) { return this.clone().scale(n); }
	toString() { return `(${this.x}, ${this.y})`; }

	distance(o) {
		let dx = this.x - o.x, dy = this.y - o.y;
		return Math.sqrt(dx*dx + dy*dy);
	}

	distanceSq(o) {
		this
		let dx = this.x - o.x, dy = this.y - o.y;
		return dx*dx + dy*dy;
	}

	normalizeGetLen() {
		let l2 = this.x*this.x+this.y*this.y;
		if (l2 === 0.0) { this.x = 0.0; this.y = 1.0; return 0.00001; }
		let il = 1.0/Math.sqrt(l2);
		this.x *= il;
		this.y *= il;
		this
		return l2*il;
	}

	normalizeOrZero() {
		return this.scale(1.0/(Math.sqrt(this.x*this.x+this.y*this.y)+1e-37));
	}

	xFlip(about=0.0) { this.x = 2.0 * about - this.x; return this; }
	yFlip(about=0.0) { this.y = 2.0 * about - this.y; return this; }

	rotate(angle, about) {
		let aboutX = 0.0, aboutY = 0.0;
		if (about) { aboutX = about.x; aboutY = about.y; }
		let x = this.x - aboutX;
		let y = this.y - aboutY;
		let c = Math.cos(angle);
		let s = Math.sin(angle);
		let nx = x * c - y * s;
		let ny = x * s + y * c;
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	}

	rotate90(about) {
		let aboutX = 0.0, aboutY = 0.0;
		if (about) { aboutX = about.x; aboutY = about.y; }
		let x = this.x - aboutX;
		let y = this.y - aboutY;
		this.x = -y+aboutX;
		this.y =  x+aboutY;
		return this;
	};

	rotate180(about) {
		let aboutX = 0.0, aboutY = 0.0;
		if (about) { aboutX = about.x; aboutY = about.y; }
		let x = this.x - aboutX;
		let y = this.y - aboutY;
		this.x = -x+aboutX;
		this.y = -y+aboutY;
		return this;
	};

	rotate270(about) {
		let aboutX = 0.0, aboutY = 0.0;
		if (about) { aboutX = about.x; aboutY = about.y; }
		let x = this.x - aboutX;
		let y = this.y - aboutY;
		this.x =  y+aboutX;
		this.y = -x+aboutY;
		return this;
	};

	rotate(angle, about) {
		let aboutX = 0.0, aboutY = 0.0;
		if (about) { aboutX = about.x; aboutY = about.y; }
		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		let x = this.x - aboutX;
		let y = this.y - aboutY;
		let nx = (cos * x) - (sin * y);
		let ny = (sin * x) + (cos * y);
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	}

	rotated90(about) { return this.clone().rotate90(about); }
	rotated180(about) { return this.clone().rotate180(about); }
	rotated270(about) { return this.clone().rotate270(about); }

	xFlipped(aboutX) { return this.clone().xFlip(aboutX); }
	yFlipped(aboutY) { return this.clone().yFlip(aboutY); }


	nanCheck() {
		ASSERT(+this.x === this.x);
		ASSERT(+this.y === this.y);
		return this;
	}
}

Vec2.ZERO = Object.freeze(new Vec2(0.0, 0.0));

Vec2.zero = function() { return new Vec2(0.0, 0.0); };
Vec2.fromDir = function(dir) { return new Vec2(Math.cos(dir), Math.sin(dir)); };
Vec2.towards = function(p0, p1) { return new Vec2(p1.x - p0.x, p1.y - p0.y); };
Vec2.towardsXY = function(x0, y0, x1, y1) { return new Vec2(x1 - x0, y1 - y0); };

Vec2.Pool = {
	items: [],
	count: 0,
	get(x, y) {
		if (this.count === this.items.length)
			this.items.push(new Vec2(0.0, 0.0));
		return this.items[this.count++].set(+x||0.0, +y||0.0);
	},
	reset() { this.count = 0; },
	update() { this.count = 0; }
}

Vec2.temp = function(x, y) { return Vec2.Pool.get(x, y); };


module.exports = Vec2;
