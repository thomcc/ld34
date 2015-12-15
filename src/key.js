'use strict';
const Particle = require('./particle');
const Consts = require('./constants');
const Clock = require('./clock');
const {RNG} = require('./rand')
const math = require('./math');
const Sounds = require('./audio');
const Entity = require('./entity');
const Vec2 = require('./vec2');
class Key extends Entity {
	constructor(game, x, y, keyInfo) {
		super(game, x, y);
		this.keyInfo = keyInfo;
		this.radius = 8;
		this.mobile = false;
		this.noiseTimer = 0;
	}

	onCollision(who) {
		if (who === this.game.player) {
			this.unlock()
		}
	}
	unlock() {
		Sounds.play('unlock');
		this.game.unlock(this.keyInfo);
		this.enabled = false;
	}

	update(dt) {
		super.update(dt);
		this.noiseTimer += dt;
		let pdist = this.game.player.pos.distance(this.pos);
		if (pdist < this.radius + this.game.player.radius) {
			this.unlock();
		} else if (this.noiseTimer > 3000) {
			if (this.game.player.pos.distance(this.pos) < 10*Consts.TileSize) {
				Sounds.playWobble(this.keyInfo.id);
			}
		}
	}


	render(layer) {
		if (!this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x+this.radius, this.pos.y+this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x+this.radius, this.pos.y-this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x-this.radius, this.pos.y+this.radius))&&
		    !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x-this.radius, this.pos.y-this.radius))) {
			return;
		}
		layer.context.drawImage(this.game.assets.misc,
			16, 16*this.keyInfo.id, 16, 16,
			this.pos.x-8,
			this.pos.y-8,
			16, 16
		);
	}
}
module.exports = Key;
