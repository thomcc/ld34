'use strict';
const Vec2 = require('./vec2');
const math = require('./math');
const {ASSERT} = require('./debug');
const drawing = require('./drawing');

class LineSegment {
	constructor(start, end) {
		this.start = start;
		this.end = end;
	}
	
	closestPoint(out, {x, y}) {
		const segX = this.end.x - this.start.x;
		const segY = this.end.y - this.start.y;

		const fx = x - this.start.x;
		const fy = y - this.start.y;

		const proj = segX * fx + segY * fy;
		const sdot = segX*segX+segY*segY;
		if (out) {
			if (proj <= 0) {
				out.x = this.start.x;
				out.y = this.start.y;
			} else if (proj >= sdot) {
				out.x = this.end.x;
				out.y = this.end.y;
			} else {
				const amount = proj / sdot;
				out.x = this.start.x + amount * segX;
				out.y = this.start.y + amount * segY;
			}
		}
		return fx * -segY + fy * segX < 0;
	}

	getClosestPoint(out, point) {
		if (!out) out = Vec2.temp(0.0, 0.0);
		this.closestPointIsBehind(out, point);
		return out;
	}

	debugRender(dbgCtx) {
		drawing.drawLine(dbgCtx, this.start.x, this.start.y, this.end.x, this.end.y);
		drawing.drawBox(dbgCtx, this.start.x, this.start.y);
		drawing.drawBox(dbgCtx, this.end.x, this.end.y);
		let delta = this.start.to(this.end);
		let norm = delta.perp().normalize();
		let mx = (this.start.x + this.end.x) * 0.5;
		let my = (this.start.y + this.end.y) * 0.5;
		drawing.drawLine(dbgCtx, mx, my, mx + 4*norm.x, my + 4*norm.y);
	}

	raycast(outPos, outDir, castPos, rayDir, size) {
		let bgnHit = math.raycastTimePoint(castPos, rayDir, this.start, Vec2.ZERO, size);
		let endHit = math.raycastTimePoint(castPos, rayDir, this.end,   Vec2.ZERO, size);
		let midHit = math.raycastTimeLine(castPos, rayDir, this.start, this.end, size);

		let hit = Math.min(Math.min(bgnHit, midHit), endHit);
		if (0 <= hit && hit <= 1) {
			let rayPoint = Vec2.temp(castPos.x + hit * rayDir.x,
			                         castPos.y + hit * rayDir.y);
			if (size > 0) {
				let closest = this.getClosestPoint(Vec2.temp(0.0, 0.0), rayPoint);
				
				let dx = rayPoint.x - closest.x;
				let dy = rayPoint.y - closest.y;
				let il = 1.0 / (Math.sqrt(dx*dx + dy*dy)+1e-37);
				dx *= il;
				dy *= il;
				out.x = closest.x;
				out.y = closest.y;
				outDir.x = dx;
				outDir.y = dy;
			} else {
				let nx = -(this.end.y - this.start.y);
				let ny = this.end.x - this.start.x;
				let il = 1.0 / (Math.sqrt(nx*nx + ny*ny)+1e-37);
				nx *= il;
				ny *= il;
				if (nx * rayDir.x + ny * rayDir.y > 0) { 
					nx = -nx; 
					ny = -ny; 
				}
				out.x = rayPos.x;
				out.y = rayPos.y;
				outDir.x = nx;
				outDir.y = ny;
			}
		}
	}
}

module.exports = LineSegment;
