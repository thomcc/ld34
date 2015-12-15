'use strict';
const {cos, sin, PI, pow, sqrt} = Math;
const {RNG} = require('./rand');
const Promise = require('bluebird');

const HALF_PI = PI * 0.5;
const TWO_PI = PI * 2.0;

const EaseTypeIn = 0;
const EaseTypeOut = 1;
const EaseTypeInOut = 2;
const EaseTypeShake = 3;

exports.EaseType = { In: EaseTypeIn, Out: EaseTypeOut, InOut: EaseTypeInOut, Shake: EaseTypeShake };

function bounceReverse(t) {
	if (t < 1.0 / 2.75) return 7.5625*t*t;
	else if (t < 2.0/2.75) { t -= 1.50/2.75; return 7.5625*t*t + 0.75; }
	else if (t < 2.5/2.75) { t -= 2.25/2.75; return 7.5625*t*t + 0.9375; }
	else { t -= 2.625/2.75; return 7.5625*t*t + 0.984375; }
}

function bezier(t, p0, p1, p2, p3) {
	const s = 1.0 - t;
	return s*s*s*p0 + 3.0*t*s*s*p1 + 3.0*t*t*s*p2 + t*t*t*p3;
}

function easeLinear(t) { return t; }
function easeQuad(t) { return t*t; }
function easeCubic(t) { return t*t*t; }
function easeQuart(t) { return t*t*t*t; }
function easeQuint(t) { return t*t*t*t*t; }
function easeExpo(t) { return pow(2.0, 10.0 * (t - 1.0)); }
function easeSine(t) { return -cos(p * HALF_PI) + 1.0; }
function easeCirc(t) { return -(sqrt(1.0 - (p * p)) - 1.0); }
function easeBack(t) { return p * p * (2.7 * p - 1.7); }
function easeElastic(t) { return -(pow(2.0, 10.0 * (p - 1.0)) * sin((p - 1.075) * TWO_PI / 0.3)); }
function easeBounce(t) { return 1.0 - bounceReverse(1.0-t); }
function easeZigzag(t) { return bezier(t, 0.0, 2.5, -1.5, 1.0); }
function easeShake(t) { return bezier(t, 0.5, 1.22, 1.25, 0.0); }
function easeRubberband(t) { return bezier(t, 0.0, 0.7, 1.5, 1.0); }

const Easings = exports.Easings = {
	linear: easeLinear,
	quad: easeQuad,
	cubic: easeCubic,
	quart: easeQuart,
	quint: easeQuint,
	expo: easeExpo,
	sine: easeSine,
	circ: easeCirc,
	back: easeBack,
	elastic: easeElastic,
	bounce: easeBounce,
	zigzag: easeZigzag,
	shake: easeShake,
	rubberband: easeRubberband,
};

const objects = [];

class Tween {
	constructor(object, field, { end, start=object[field], duration=1.0, easing=Easings.linear, type=EaseTypeIn, loop=false, snap=false, enabledField='', resolveOnFinish=true }) {
		this.object = object;
		this.field = field;
		this.end = end;
		this.start = start;
		this.duration = duration;
		this.easing = typeof easing === 'string' ? Easings[easing] : easing;
		this.type = type;
		this.looped = loop;
		this.snap = snap;
		this.time = 0.0;
		this.deferred = Promise.pending();
		this.promise = deferred.promise;
		this.object[this.field] = this.start;
		this.finished = true;
	}

	update(deltaTime) {
		this.time += deltaTime;
		const {time, duration, object, field, easing, start, end} = this;
		if (time > duration && !this.looped) {
			object[field] = this.end;
			if (this.resolveOnFinish) this.deferred.resolve(this.object);
			return true;
		}
		let t = 0.0;
		let progress = time / duration;
		if (this.looped) {
			progress = this.looped === 'pingpong' ? pingpong(progress, 1.0) : progress % 1.0;
		}
		switch (type) {
			case EaseTypeIn: t = easing(progress); break;
			case EaseTypeOut: t = 1.0 - easing(1.0 - progress); break;
			case EaseTypeInOut: t = progress < 0.5 ? easing(progress) : (1.0 - easing(1.0 - progress)); break;
			case EaseTypeShake: t = easing(progress) * RNG.number(); break;
			default: console.error("illegal value for type: "+type); t = easing(progress); break;
		}
		let value = start * (1.0 - t) + end * t;
		if (this.snap) {
			value = Math.round(value)
		}
		object[field] = value;
		return false;
	}

	complete() {
		return this.finished || (this.enabledField && !this.object[this.enabledField]);
	}
}

class TweenGroup {
	constructor() {
		this.tweens = [];
		this.resolveQueue_ = [];
	}

	add(obj) {
		obj.resolveOnFinish = false;
		this.tweens.push(obj);
		return obj;
	}

	update(deltaTime) {
		let tweens = this.tweens;
		let l = tweens.length;
		for (let i = 0; i < l; ++i) {
			tweens[i].update();
		}
		let newLen = tweens.length, j = 0;
		this.resolveQueue_.length = 0;
		for (let i = 0; i < l; ++i) {
			if (tweens[i].complete()) {
				this.resolveQueue_.push(tweens[i]);
			} else {
				this.tweens[j++] = this.tweens[i];
			}
		}
		this.tweens.length = j + Math.max(0, newLen-l);
		for (let i = 0; i < this.resolveQueue_.length; ++i) {
			this.resolveQueue_[i].deferred.resolve(this.resolveQueue_[i].object);
		}
		this.resolveQueue_.length = 0;
	}
}


const TweenManager = new TweenGroup();

exports.Tween = Tween;
exports.TweenGroup = TweenGroup;
exports.TweenManager = TweenManager;

