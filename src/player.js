'use strict';

const {Tween, TweenGroup} = require('./tweens')
const Entity = require('./entity');
const Input = require('./input');
const drawing = require('./drawing');
const Consts = require('./constants');
const Clock = require('./clock');

class Player extends Entity {
	constructor(game) {
		super(game);
		this.radius = 5.0;
		this.normalizeAccel = true;
		this.speed = 20*20;
		this.drag = 5;
		this.walking = false;
		this.animProgress = 0.0;
	}

	think(dt) {
		if (this.walking) {
			this.animProgress += Math.min(this.lastPos.distance(this.pos)/10, 1);
		}
		let {x:mwx, y:mwy} = this.game.mouse;
		let fy = mwy-this.pos.y;
		let fx = mwx-this.pos.x;
		let len = Math.sqrt(fx*fx+fy*fy);

		if (Input.mouse.isDown && len > 1 && !Input.keyboard.isDown('space')) {
			this.acc.set((mwx-this.pos.x)/Consts.TileSize, (mwy-this.pos.y)/Consts.TileSize);
			this.walking = true;
		} else {
			this.walking = false;
			this.animProgress = 0.0;
			this.acc.set(0.0, 0.0);
		}
		this.heading = Math.atan2(fy, fx);
	}

	render(mx, my, layer) {
		let rotation = Math.round(this.heading / (Math.PI*2)*16)&15;

		let anim = (this.walking ? Math.floor(this.animProgress%7) : 0) + 0
		layer.context.strokeStyle = 'green';
		layer.context.drawImage(this.game.assets.playerRotations.canvas,
			16*anim, 16*rotation, 16, 16,
			this.pos.x-mx-8,
			this.pos.y-my-8,
			16, 16);
		drawing.drawCircle(this.game.debugContext, this.pos.x, this.pos.y, this.radius);
		//(layer.context, this.pos.x-mx, this.pos.y-my, this.radius);
	}

}

module.exports = Player;
