'use strict';
const Vec2 = require('./Vec2');
// const LineSegment = require('./line_segment');
const math = require('./math');
const {ASSERT} = require('./debug');
// based on code originally by amit patel: www.redblobgames.com/articles/visibility/
// needs some work since it seems to be O(n^2) in the number of points in the level... @NOTE: may have fixed this now
// if this weren't in a jam i'd make an effort to fix that problem, and to reuse the
// line segment / raycasting code I already wrote...


function leftOf({start, end}, x, y) {
	return (end.x-start.x)*(y-start.y) - (end.y-start.y)*(x-start.x) < 0.0;
}

function inFrontOf(a, b, center) {
	// @NOTE: check if we can just compare a.d to b.d...
	let a1 = leftOf(a, math.lerp(b.start.x, b.end.x, 0.01),
	                   math.lerp(b.start.y, b.end.y, 0.01));
	let a2 = leftOf(a, math.lerp(b.end.x, b.start.x, 0.01),
	                   math.lerp(b.end.y, b.start.y, 0.01));
	let a3 = leftOf(a, center.x, center.y);

	let b1 = leftOf(b, math.lerp(a.start.x, a.end.x, 0.01),
	                   math.lerp(a.start.y, a.end.y, 0.01));
	let b2 = leftOf(b, math.lerp(a.end.x, a.start.x, 0.01),
	                   math.lerp(a.end.y, a.start.y, 0.01));
	let b3 = leftOf(b, center.x, center.y);

	if (b1 === b2 && b2 !== b3) return true;
	if (a1 === a2 && a2 === a3) return true;
	if (a1 === a2 && a2 !== a3) return false;
	if (b1 === b2 && b2 === b3) return false;
	return false;
}
let idctr = 0;
class VisSegment {
	constructor(start, end) {
		this.start = start;
		this.end = end;
		this.start.segment = this;
		this.end.segment = this;
		this.d = 0.0;
		this.next = null;
		this.prev = null;
		this.listGen_ = -1;
		this.id_ = ++idctr;
	}
	clone() {
		let vs = new VisSegment(this.start, this.end);
		vs.start = this.start;
		vs.end = this.end;
		vs.start = this.start;
		vs.end = this.end;
		vs.d = this.d;
		vs.next = this.next;
		vs.prev = this.prev;
		// vs.listGen_ = this.listGen_;
		// vs.id_ = this.id_;
		return vs;
	}
}

let currentListGen = 0;

function lineIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    var s = ((p4x - p3x) * (p1y - p3y) - (p4y - p3y) * (p1x - p3x))/ ((p4y - p3y) * (p2x - p1x) - (p4x - p3x) * (p2y - p1y));
    return Vec2.temp(p1x + s * (p2x - p1x), p1y + s * (p2y - p1y));
}

class SegList {
	constructor() {
		this.head = null;
		this.tail = null;
	}

	append(seg) {
		// console.log('APPEND: '+seg.id_);
		if (seg.listGen_ === currentListGen) {
			seg = seg.clone();
			// console.log(' NEW ID => '+seg.id_)
		}
		seg.listGen_ = currentListGen;
		seg.next = seg.prev = null;
		if (this.head == null && this.tail == null) {
			this.head = this.tail = seg;
			// console.log('  ONLY NODE: '+seg.id_);
		} else {
			ASSERT(seg != this.head && seg != this.tail);
			// console.log('  TAIL '+this.tail.id_+' => '+seg.id_);
			this.tail.next = seg;
			seg.prev = this.tail;
			this.tail = seg;
		}
		// this.check();
	}

	remove(seg) {
		if (seg === this.tail) this.tail = seg.prev;
		if (seg === this.head) this.head = seg.next;
		if (seg.next) seg.next.prev = seg.prev;
		if (seg.prev) seg.prev.next = seg.next;
		seg.next = seg.prev = null;
	}

	empty() {
		return !this.head;
	}

	insertBefore(seg, other) {
		// console.log('INSERT_BEFORE: '+seg.id_+', '+other.id_);
		if (other.listGen_ === currentListGen) {
			other = other.clone();
			// console.log('  NEW ID => '+other.id_);
		}
		other.listGen_ = currentListGen;
		other.next = other.prev = null;
		ASSERT(seg != null);
		if (this.empty() || seg == null) {
			return this.append(other);
		}
		// console.log('  BETWEEN: '+(!seg.prev ? 'nothing' : seg.prev.id_)+' AND: '+seg.id_);

		other.prev = seg.prev;
		other.next = seg;
		seg.prev = other;
		if (other.prev) {
			other.prev.next = other;
		}
		other.next.prev = other;
		if (seg === this.head) {
			this.head = other;
		}
		// this.check();
	}

	clear(unlink) {
		while (this.head != null) {
			let {next} = this.head;
			this.head.prev = this.head.next = null;
			this.head = next;
		}
		this.head = this.tail = null;

	}

	toString() {
		let r = [];
		for (let n = this.head; n != null; n = n.next) {
			r.push('['+n.id_+']');
			if (n.next === this.head) {
				debugger;
				document.body.innerHTML += 'BAD';
			}
		}
		return '['+r.join(' ')+']'
	}

	check() {
		// console.log(this.toString());
		let seen = {};
		ASSERT((this.head == null) === (this.tail == null));
		ASSERT(this.head.prev == null);
		ASSERT(this.tail.next == null);

		for (let n = this.head; n != null; n = n.next) {

			if (n.prev) ASSERT(n.prev.next === n);
			else ASSERT(n === this.head);

			if (n.next) ASSERT(n.next.prev === n);
			else ASSERT(n === this.tail);
			ASSERT(!(n.id_ in seen));
			seen[n.id_] = true;
		}

	}
}

class SegPoint {
	constructor(pos) {
		this.x = pos.x;
		this.y = pos.y;
		this.pos = pos;
		this.begin = false;
		this.segment = null;
		this.angle = 0.0;
	}
}

// @TODO: support camera explicitly.
class VisTracker {
	constructor() {
		this.segments = [];
		this.points = [];
		this.open = new SegList();
		this.center = new Vec2(0.0, 0.0);
		this.outXs = [];
		this.outYs = [];
	}

	setSegments(segs) {
		this.segments.length = 0;
		this.points.length = 0;
		// this.open.clear();
		// this.outXs.length = 0;
		// this.outYs.length = 0;
		segs.forEach(({start, end}) => {
			this.addSegment(start, end);
		});
	}

	addSegment(start, end) {
		let sp = new SegPoint(start);
		let ep = new SegPoint(end);
		this.segments.push(new VisSegment(sp, ep));
		this.points.push(sp, ep);
	}

	setCenter({x, y}) {
		this.center.set(x, y);
		for (let i = 0; i < this.segments.length; ++i) {
			let seg = this.segments[i];
			let dx = 0.5 * (seg.start.x + seg.end.x) - x;
			let dy = 0.5 * (seg.start.y + seg.end.y) - y;
			seg.d = dx*dx + dy*dy;
			seg.start.angle = Math.atan2(seg.start.y-y, seg.start.x-x);
			seg.end.angle = Math.atan2(seg.end.y-y, seg.end.x-x);
			var delta = seg.end.angle - seg.start.angle;
			if (delta <= -Math.PI) { delta += 2*Math.PI; }
			if (delta > Math.PI) { delta -= 2*Math.PI; }
			seg.start.begin = (delta > 0.0);
			seg.end.begin = !seg.start.begin;
		}
	}

	sweep(maxAngle=999) {
		++currentListGen;
		this.outXs.length = 0;
		this.outYs.length = 0;
		this.points.sort((a, b) => {
			if (a.angle > b.angle) return 1;
			if (a.angle < b.angle) return -1;
			if (!a.begin && b.begin) return 1;
			if (a.begin && !b.begin) return -1;
			return 0;
		});
		this.open.clear();
		let beginAngle = 0.0;
		for (let pass = 0; pass < 2; ++pass) {
			for (let ep = 0, epl = this.points.length; ep < epl; ++ep) {
				let p = this.points[ep];
				if (pass === 1 && p.angle > maxAngle) {
					break;
				}
				var currentOld = this.open.head;
				if (p.begin) {
					let node = this.open.head;
					while (node != null && inFrontOf(p.segment, node, this.center)) {
						node = node.next;
					}
					if (node == null) { this.open.append(p.segment); }
					else { this.open.insertBefore(node, p.segment); }
					this.open.check();
				} else {
					this.open.remove(p.segment);
				}

				let currentNew = this.open.head;
				if (currentOld != currentNew) {
					if (pass === 1) {
						this.addTri_(beginAngle, p.angle, currentOld);
					}
					beginAngle = p.angle;
				}
			}
		}
	}

	addTri_(a1, a2, segment) {
		let centerX = +this.center.x, centerY = +this.center.y;
		let p1x = centerX, p1y = +centerY;
		let p2x = p1x + Math.cos(a1), p2y = p1y + Math.sin(a1);
		let p3x = 0.0, p3y = 0.0;
		let p4x = 0.0, p4y = 0.0;

		if (segment) {
			p3x = +segment.start.x;
			p3y = +segment.start.y;
			p4x = +segment.end.x;
			p4y = +segment.end.y;
		}
		else {
			debugger;
			p3x = centerX + Math.cos(a1)*10000;
			p3y = centerY + Math.sin(a1)*10000;
			p4x = centerX + Math.cos(a2)*10000;
			p4y = centerY + Math.sin(a2)*10000;
		}

		let {x: xBegin, y: yBegin} = lineIntersection(p3x, p3y, p4x, p4y,
		                                              p1x, p1y, p2x, p2y);
		p2x = centerX + Math.cos(a2);
		p2y = centerY + Math.sin(a2);

		let {x: xEnd, y: yEnd} = lineIntersection(p3x, p3y, p4x, p4y,
		                                          p1x, p1y, p2x, p2y);


/*
		let d21x = p2x-p1x, d21y = p2y-p1y;
		let d31x = p3x-p1x, d31y = p3y-p1y;
		let d43x = p4x-p3x, d43y = p4y-p3y;

		let s = (d21x*d31y - d21y*d31x) / (d21y*d43x - d21x*d43y);
		let xBegin = p3x + s * d43x;
		let yBegin = p3y + s * d43y;

		p2x = centerX + Math.cos(a2);
		p2y = centerY + Math.sin(a2);

		d21x = p2x-p1x;
		d21y = p2y-p1y;
		s = (d21x*d31y - d21y*d31x) / (d21y*d43x - d21x*d43y);

		let xEnd = p3x + s * d43x;
		let yEnd = p3y + s * d43y;

		this.outXs.push(xEnd);
		this.outYs.push(yEnd);*/

		this.outXs.push(xBegin, xEnd);
		this.outYs.push(yBegin, yEnd);
	}



}

exports.VisTracker = VisTracker;
