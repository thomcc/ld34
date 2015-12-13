'use strict';
const {ASSERT} = require('./debug');

const EPSILON = 0.0001;
const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

exports.EPSILON = EPSILON;
exports.DEG2RAD = DEG2RAD;
exports.RAD2DEG = RAD2DEG;

exports.toRadians = toRadians;
function toRadians(v) { return v * DEG2RAD; }

exports.toDegrees = toDegrees;
function toDegrees(v) { return v * RAD2DEG; }

exports.clamp = clamp;
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

exports.saturate = saturate;
function saturate(v) { return clamp(v, 0.0, 1.0); }

exports.lerp = lerp;
function lerp(a, b, t) { let s = saturate(t); return a * (1.0 - s) + b * s; }

exports.uLerp = uLerp;
function uLerp(a, b, t) { return a + (b - a) * t; }

exports.square = square;
function square(v) { return v*v; }

exports.cube = cube;
function cube(v) { return v*v*v; }

exports.approxZero = approxZero;
function approxZero(v, eps=EPSILON) { return v <= eps || v >= -eps; }

exports.approxEqual = approxEqual;
function approxEqual(a, b, eps=EPSILON) { return Math.abs(a-b) <= eps * Math.max(1.0, Math.abs(a), Math.abs(b)); }

exports.safeDiv = safeDiv;
function safeDiv(a, b, r) { return b === 0.0 ? r : a/b; }

exports.safeDiv0 = safeDiv0;
function safeDiv0(a, b) { return safeDiv(a, b, 0.0); }

exports.safeDiv1 = safeDiv1;
function safeDiv1(a, b) { return safeDiv(a, b, 1.0); }

exports.signOf = signOf;
function signOf(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }

exports.smoothStep01 = smoothStep01;
function smoothStep01(t) { return t*t*t*(t*(t*6.0 - 15.0) + 10.0); }

exports.linearStep = linearStep;
function linearStep(a, b, t) { return saturate(safeDiv0(t-a, b-a)); }

exports.smoothStep = smoothStep;
function smoothStep(a, b, t) { return smoothStep01(linearStep(a, b, t)); }

exports.repeat = repeat;
function repeat(t, len) { return t - Math.floor(t/len)*len; }

exports.pingpong = pingpong;
function pingpong(t, len) { return len - Math.abs(repeat(t, len*2)-len); }

exports.length2D = length2D;
function length2D(x, y) { return Math.sqrt(x*x+y*y); }

exports.length3D = length3D;
function length3D(x, y, z) { return Math.sqrt(x*x+y*y+z*z); }

exports.distance2D = distance2D;
function distance2D(x0, y0, x1, y1) {
	let dx = x0-x1, dy = y0-y1;
	return Math.sqrt(dx*dx + dy*dy);
};

exports.distance3D = distance3D;
function distance3D(x0, y0, z0, x1, y1, z1) {
	let dx = x0-x1, dy = y0-y1, dz = z0-z1;
	return Math.sqrt(dx*dx + dy*dy + dz*dz);
};

exports.normLen2D = normLen2D;
function normLen2D(x, y) {
	let l = x*x + y*y;
	return l < EPSILON ? 1.0 : Math.sqrt(l);
};

exports.safeInvLen = exports.safeInverseLength = safeInvLen;
function safeInvLen(x, y) {
	return 1.0 / (Math.sqrt(x*x+y*y)+1e-37);
};

exports.normLen3D = normLen3D;
function normLen3D(x, y, z) {
	let l = x*x + y*y + z*z;
	return l < EPSILON ? 1.0 : Math.sqrt(l);
};

exports.lerpColors = lerpColors;
function lerpColors(c0, c1, t, supportAlpha=false) {
	let b0 = ((c0 >>> 16) & 0xff)/255.0;
	let g0 = ((c0 >>> 8) & 0xff)/255.0;
	let r0 = ((c0 >>> 0) & 0xff)/255.0;
	let a0 = ((c0 >>> 24) & 0xff)/255.0;

	let b1 = ((c1 >>> 16) & 0xff)/255.0;
	let g1 = ((c1 >>> 8) & 0xff)/255.0;
	let r1 = ((c1 >>> 0) & 0xff)/255.0;
	let a1 = ((c1 >>> 24) & 0xff)/255.0;

	let rr = (lerp(r0, r1, t) * 255)|0;
	let rg = (lerp(g0, g1, t) * 255)|0;
	let rb = (lerp(b0, b1, t) * 255)|0;
	let ra = supportAlpha ? (lerp(a0, a1, t) * 255)|0 : 0xff;

	return (ra << 24)|(rb << 16)|(rg << 8)|rr;
};

exports.buildPixelRGBA = buildPixelRGBA;
function buildPixelRGBA(r, g, b, a) {
	r = r&0xff; g = g&0xff; b = b&0xff; a = a&0xff;
	return (a << 24)|(b << 16)|(g << 8)|r;
}

exports.buildPixelRGB = buildPixelRGB;
function buildPixelRGB(r, g, b) {
	r = r&0xff; g = g&0xff; b = b&0xff;
	return (b << 16)|(g << 8)|r;
}

exports.gammaToLinear32 = gammaToLinear32;
function gammaToLinear32(pixel) {
	let b = ((pixel >>> 16) & 0xff)/255.0;
	let g = ((pixel >>> 8) & 0xff)/255.0;
	let r = ((pixel >>> 0) & 0xff)/255.0;

	let rr = ((r*r) * 255)|0;
	let rg = ((g*g) * 255)|0;
	let rb = ((b*b) * 255)|0;

	return (pixel & 0xff000000) | (rb << 16) | (rg << 8) | rr;
}

exports.changeSaturation = changeSaturation;
function changeSaturation(pixel, level, gamma) {
	let r = ((pixel >>> 16) & 0xff)/255.0;
	let g = ((pixel >>> 8) & 0xff)/255.0;
	let b = ((pixel >>> 0) & 0xff)/255.0;
	let a = pixel & 0xff000000;

	if (gamma) {
		r *= r;
		g *= g;
		b *= b;
	}
	
	let avg = (1.0 / 3.0) * (r + g + b);

	let dr = r-avg;
	let dg = g-avg;
	let db = b-avg;

	let rr = avg + level*dr;
	let rg = avg + level*dg;
	let rb = avg + level*db;

	if (gamma) { 
		rr = Math.sqrt(rr);
		rg = Math.sqrt(rg);
		rb = Math.sqrt(rb);
	}

	let pr = (rr*255.0)|0;
	let pg = (rg*255.0)|0;
	let pb = (rb*255.0)|0;

	return (pixel & 0xff000000) | (pr << 16) | (pg << 8) | pb;
}

exports.raycastTimePoint = raycastTimePoint;
function raycastTimePoint(pos0, dir0, pos1, dir1, Size) {
	let dirDX = dir0.x - dir1.x, dirDY = dir0.y - dir1.y;
	let posDX = pos0.x - pos1.x, posDY = pos0.y - pos1.y;

	let dirMag = dirDX*dirDX + dirDY*dirDY;
	let ref = 2.0 * (posDX * dirDX + posDY * dirDY);
	let d2d = posDX * posDX + posDY * posDY - Size * Size;

	let eps = 0.0001;

	if (d2d <= 0) return -1;
	if (Math.abs(dirMag) < eps) return 2;

	if (ref >= 0) return 2;

	let t = ref*ref - 4*dirMag*d2d;
	if (t < 0) return 2;

	let s = -0.5 * (ref - Math.sqrt(t));
	return Math.min(s / dirMag, d2d / s);
};

exports.raycastTimeLine = raycastTimeLine;
function raycastTimeLine(rayPos, rayDir, p0, p1, size) {
	let segDirX = p1.x - p0.x, segDirY = p1.y - p0.y;
	let segLen = Math.sqrt(segDirX*segDirX + segDirY*segDirY);

	ASSERT(segLen !== 0);

	segDirX /= segLen;
	segDirY /= segLen;

	let segNormX = -segDirY;
	let segNormY =  segDirX;

	let fx = rayPos.x - p0.x;
	let fy = rayPos.y - p0.y;

	let pnf = segNormX * fx + segNormY * fy;
	let pnr = segNormX * rayDir.x + segNormY * rayDir.y;

	let fsp = segDirX * fx + segDirY * fy;

	let dist = Math.abs(pnf) - size;

	if (dist < 0) {
		return fsp < 0 || fsp > segLen ? 2 : -1;
	}

	if (pnf * pnr >= 0) {
		return 2;
	}

	let time = dist / Math.abs(pnr);
	let segray = segDirX * rayDir.x + segDirY * rayDir.y;
	let t = fsp + time * segray;

	return t < 0 || t > segLen ? 2 : time;
}

// hm...
exports.Vec2 = require('./vec2');

