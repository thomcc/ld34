'use strict';
const Game = require('./game');
const {update: updateInput} = require('./input');
const Clock = require('./clock');
const Consts = require('./constants');
const Input = require('./input');
const {createCanvas, createContext2D} = require('./util');
const Vec2 = require('./vec2');

class GameRunner {
	constructor() {
		let screen = this.screen = document.getElementById('screen');
		this.screen.width = Consts.ClientScreenWidth * Consts.DevicePixels;
		this.screen.height = Consts.ClientScreenHeight * Consts.DevicePixels;
		this.screen.style.width = Consts.ClientScreenWidth+"px";
		this.screen.style.height = Consts.ClientScreenHeight+"px";
		this.screenCtx = screen.getContext('2d');
		
		this.debugElem = document.getElementById('debug');

		this.debugCanvas = createCanvas(Consts.ClientScreenWidth, Consts.ClientScreenHeight);
		this.debugCtx = this.debugCanvas.getContext('2d');

		this.drawCanvas = createCanvas(Consts.ScreenWidth, Consts.ScreenHeight);
		this.drawContext = this.drawCanvas.getContext('2d');

		Input.initialize(screen);
		window.addEventListener('keydown', (e) => {
			if (e.which === 27) {
				this.paused = !this.paused;
				if (!this.paused) 
					this.start();
			}
		})
		this.paused = false;
		this.game = null;
		this.startTime = 0;
		this.accum = 0;
		this.lastUpdate = 0;
		this.frames = 0;
		this.ticks = 0;
		this.lastSecond = 0;
		this.fpsElem = document.getElementById('fps');
		this.tpsElem = document.getElementById('tps');
		this.mspfElem = document.getElementById('mspf');
		this.doUpdate = (timestamp) => this.update(timestamp);
	}

	start() {
		if (!this.game) this.game = new Game(this.drawCanvas, this.debugCanvas);
		this.startTime = 0;
		this.accum = 0;
		this.lastUpdate = 0;
		this.frames = 0;
		this.ticks = 0;
		this.lastSecond = 0;
		requestAnimationFrame(this.doUpdate);
	}

	update(timestamp) {
		if (this.paused) {
			return;
		}
		if (!this.lastUpdate) {
			this.lastUpdate = timestamp;
			this.lastSecond = timestamp;
			return requestAnimationFrame(this.doUpdate);
		}
		requestAnimationFrame(this.doUpdate);
		Clock.realTime = timestamp / 1000.0;
		let unscaledDeltaTime = 1.0 / Clock.fps;
		
		let dt = unscaledDeltaTime * Clock.timeScale;
		Clock.realDeltaTime = (timestamp - this.lastUpdate) / 1000.0;
		Clock.deltaTime = dt;

		this.accum += Clock.realDeltaTime;
		if (this.accum >= 5*unscaledDeltaTime) {
			this.accum = unscaledDeltaTime;
		}
		let frameStart = Clock.now();
		while (this.accum >= unscaledDeltaTime) {
			++this.ticks;
			Vec2.Pool.reset();
			this.game.update(dt);
			Clock.accumTime += dt;
			Input.update();
			this.accum -= unscaledDeltaTime;
			++Clock.ticks;
		}
		++this.frames;
		this.game.render();
		this.render();

		let frameEnd = Clock.now();
		if (this.mspfElem != null) {
			this.mspfElem.textContent = 'mspf: '+(frameEnd - frameStart).toFixed(2);
		}

		if (timestamp - this.lastSecond >= 1000.0) {
			this.lastSecond = timestamp;
			console.log("fps: "+this.frames+", tps: "+this.ticks+', mspf: '+(frameEnd-frameStart).toFixed(2));
			if (this.tpsElem != null) {
				this.tpsElem.textContent = "tps: "+this.ticks;
			}
			if (this.fpsElem != null) {
				this.fpsElem.textContent = "fps: "+this.frames;
			}
			this.frames = this.ticks = 0;
		}
	}

	render() {
		const {screenCtx, screen} = this;
		screenCtx.imageSmoothingEnabled = false;
		screenCtx.mozImageSmoothingEnabled = false;
		screenCtx.webkitImageSmoothingEnabled = false;
		screenCtx.clearRect(0, 0, screenCtx.canvas.width, screenCtx.canvas.height);
		screenCtx.globalCompositeOperation = 'source-over';
		screenCtx.globalAlpha = 1.0;
		if (this.game.layers) {
			let gco = 'source-over';
			let globalAlpha = 1.0;
			for (let i = 0; i < this.game.layers.length; ++i) {
				let {blendMode, alpha, canvas} = this.game.layers[i];
				if (blendMode && blendMode !== gco) {
					gco = screenCtx.globalCompositeOperation = blendMode;
				}
				if (globalAlpha && globalAlpha !== alpha) {
					globalAlpha = screenCtx.globalAlpha = alpha;
				}
				screenCtx.drawImage(canvas, 
					0, 0, canvas.width, canvas.height, 
					0, 0, screen.width, screen.height);
			}
		}
		else {
			screenCtx.drawImage(this.drawCanvas, 
				0, 0, this.drawCanvas.width, this.drawCanvas.height, 
				0, 0, screen.width, screen.height);
		}
		screenCtx.drawImage(this.debugCanvas, 
			0, 0, this.debugCanvas.width, this.debugCanvas.height, 
			0, 0, screen.width, screen.height);
	}
}





module.exports = GameRunner;
