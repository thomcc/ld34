'use strict';

const PCGRandom = require('pcg-random');
const quickNoise = require('quick-noise-js');

const RandUtils = {
	nextInt(a) { return this.integer(a); },
	random() { return this.number(); },

	upTo(a) { return this.integer(a); },
	upToI(a) { return this.upTo(a+1); }, // inclusive
	upToF(a) { return this.number() * a; },
	
	betweenF(min, max) { return min + this.number() * (max-min); },
	betweenI(min, max) { return min + this.upTo(max-min+1); },
	betweenX(min, max) { return min + this.upTo(max-min); },


	oneChanceIn(n) { return this.upTo(n) === 0; },
	coinflip() { return this.oneChanceIn(2); },
	probability(n) { return this.number() < n; },

	choose(arr) {
		if (arr.length === 0) {
			console.error("empty array in choose");
			return null;
		}
		return arr[this.upTo(arr.length)];
	},

	round(v) {
		const vi = Math.floor(v);
		return vi + this.probability(v-vi) ? 1 : 0;
	},

	diceRoll(count, size) {
		if (count <= 0 || size <= 0) return 0;
		let result = count;
		for (let i = 0; i < count; ++i) {
			result += this.upTo(size);
		}
		return result;
	},
	
	bestRoll(max, rolls) {
		let best = 0;
		for (let i = 0; i < rolls; ++i) {
			best = Math.max(this.upTo(max), best);
		}
		return best;
	},
	
	gaussian01() {
		let u = 0.0, v = 0.0, r = 0.0;
		do {
			u = this.number() * 2.0 - 1.0;
			v = this.number() * 2.0 - 1.0;
			r = u*u + v*v;
		} while (r === 0.0 || r > 1.0);
		const mul = Math.sqrt(-2.0 * Math.log(r) / r);
		return u * mul;
	},

	gaussian(mean, stddev) {
		return this.gaussian01() * stddev + mean;
	},

	uniform(mean=0.0, halfRange=1.0) {
		return this.number() * (halfRange*2.0) + (mean - 1.0);
	},
	
	chooseIndexWeighted(weights) {
		let l = weights.length;
		if (l === 0) {
			console.error("empty array passed to chooseIndexWeighted");
			return -1;
		}
		let sum = 0;
		for (let i = 0; i < l; ++i)
			sum += weights[i];
		sum *= this.number();
		for (let i = 0; i < l; ++i) {
			sum -= weights[i];
			if (sum <= 0.0)
				return i;
		}
		console.error("fell through choice loop", weights);
		return this.upTo(weights.length);
	},

	chooseWeightedFn(arr, getWeight) {
		let l = arr.length;
		if (l === 0) {
			console.error("empty array passed to chooseWeightedFn");
			return -1;
		}
		let sum = 0;
		for (let i = 0; i < l; ++i)
			sum += getWeight(arr[i]);
		sum *= this.number();
		for (let i = 0; i < l; ++i) {
			sum -= getWeight(arr[i]);
			if (sum <= 0.0) return i;
		}
		console.error("fell through choice loop", arr);
		return this.upTo(arr.length);
	},
	
	shuffle(arr) {
		for (let i = arr.length-1; i > 0; --i) {
			let r = this.upToI(i);
			let tmp = arr[r]; arr[r] = arr[i]; arr[i] = tmp;
		}
		return arr;
	}
}

Object.assign(PCGRandom.prototype, RandUtils);

const Rand = new PCGRandom();
const UIRand = new PCGRandom();
exports.Rand = Rand;
exports.UIRand = UIRand;
exports.RNGType = PCGRandom;

const perlinNoise = quickNoise.noise;

exports.perlinNoise = perlinNoise;
exports.octaveNoise = octaveNoise;

function octaveNoise(x, y, z, octaves=3, persistence=0.5) {
	let total = 0.0;
	let frequency = 1.0;
	let amplitude = 1.0;
	let maxValue = 0.0;
	for (let i = 0; i < octaves; ++i) {
		total += perlinNoise(x * frequency, y * frequency, z * frequency) * amplitude;
		maxValue += amplitude;
		amplitude *= persistence;
		frequency *= 2.0;
	}
	return total / maxValue;
}
