'use strict';
let {UIRand} = require('./rand');

function soundVariations(src, min=0.8, max=1.5, count=10) {
	let res = [
		new Howl({ src: src, volume: 0.2, rate: 1 }),
	];
	for (let rate = min; rate <= max; rate += (max-min)/count)
		res.push(new Howl({ rate, src: src, volume: 0.2 }));
	return res;
}
let Sounds = {
	currentSong: null,
	boom: soundVariations(['res/boom1.wav']),
	bang: soundVariations(['res/bang2.mp3'], 0.8, 0.95, count=5),
	ouch: soundVariations(['res/big-ouch.mp3']),
	monstOuch: soundVariations(['res/monst-ouch.mp3']),
	growl: soundVariations(['res/growl.mp3'], 1.0, 2.0),

	bangs: [
		new Howl({ src: ['res/bang1.wav'], rate: 1 }),
		new Howl({ src: ['res/bang1.wav'], rate: 0.9 }),
		new Howl({ src: ['res/bang1.wav'], rate: 1.1 }),
		new Howl({ src: ['res/bang1.wav'], rate: 1.5 }),
		new Howl({ src: ['res/bang1.wav'], rate: 0.8 }),
	],
	song1: new Howl({ src: ['res/menubg.ogg', 'res/menubg.mp3'], loop: true, volume: 0.5 }),
	song2: new Howl({ src: ['res/song2.ogg', 'res/song2.mp3'], loop: true, volume: 0.5 }),
	song3: new Howl({ src: ['res/song3.ogg', 'res/song3.mp3'], loop: true, volume: 0.5 }),
	wobbles: new Howl({
		src: ['res/wobbles.ogg', 'res/wobbles.mp3'],
		sprite: {
			wobble0: [0, 8000],
			wobble1: [12500, 19000],
			wobble2: [24200, 31600],
			wobble3: [36300, 43600],
			wobble4: [47800, 56000],
			wobble5: [59400, 67800],
		}
	}),

	stopMusic(fade=false) {
		if (this.currentSong == null) return;
		if (fade) {
			let cs = this.currentSong;
			cs.fade(0.5, 0.0, 1.0);
			cs.once('faded', () => cs.stop());
		}
		else {
			cs.stop();
		}
		this.currentSong = null;
	},

	playMusic(id, fade=true) {
		if (!(id in this)) id = 'song'+id;
		if (this.currentSong) {
			let cs = this.currentSong;
			let ns = this.currentSong = this[id];
			if (fade) {
				cs.fade(0.5, 0.0, 1.0);
				cs.once('faded', () => {
					cs.stop();
					if (ns === this.currentSong) {
						ns.play();
						ns.fade(0.0, 0.5, 1.0);
					}
				});
			}
			else {
				cs.stop();
				ns.play();
			}
		}
		else if (id in this) {
			this.currentSong = this[id];
			this.currentSong.play();
			if (fade) {
				this.currentSong.fade(0.0, 0.5, 1.0);
			}
		}
	},

	playEffect(name) {
		if (name === 'wobble') this.playWobble();
		else if (name in this) {
			UIRand.choose(this[name]).play();
		}
		else {
			console.warn('cnat play '+name);
		}
	},

	playWobble(which=-1) {
		if (which < 0) {
			which = UIRand.upTo(6);
		}
		this.wobbles.play('wobble'+which);
	}

}

window.Sounds = Sounds;


module.exports = Sounds;
