'use strict';

const {Tween, TweenGroup} = require('./tweens')
const Vec2 = require('./vec2');

class GameObject {
	constructor(game) {
		this.game = game;
		this.id = GameObject.idCounter++;
		this.pos = new Vec2(0.0, 0.0);
		this.radius = 1.0;
		this.enabled = true;
	}

	update(dt) {}

	render(offsetX, offsetY, layer) {}
}
GameObject.idCounter = 0;

module.exports = GameObject;
