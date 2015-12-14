'use strict';

const Consts = require('./constants')
const Camera = require('./camera');
const CollisionGrid = require('./collision_grid');
const {Tween, TweenGroup} = require('./tweens')
const PixelBuffer = require('./pixel_buffer');
const Player = require('./player');
const {TestLevel, Tiles, TileInfo} = require('./level_data');
const polybool = require('poly-bool');
const LineSegment = require('./line_segment');
const Layer = require('./gfx_layer');
const Vec2 = require('./vec2');
const math = require('./math');
const Input = require('./input');
const util = require('./util');
const drawing = require('./drawing');
const {VisTracker} = require('./lighting');
const Sounds = require('./audio');

const {perlinNoise, octaveNoise, UIRand} = require('./rand');

const STATES = { Loading: 0, Menu: 1, Game: 2 };


function loadLevel(tmx) {
	let mapElem = tmx.querySelector('map');
	let result = {
		width: mapElem.getAttribute('width'),
		height: mapElem.getAttribute('height'),
	};
	[].forEach.call(mapElem.querySelectorAll('properties property'), function(elem) {
		let val = elem.getAttribute('value');
		if (!isNaN(val)) {
			let fval = Number(val);
			if (+fval === fval) val = fval;
		}
		result[elem.getAttribute('name')] = val;
	});

	[].forEach.call(mapElem.querySelectorAll('layer'), function(layer) {
		if (result.data != null) return; // TODO
		let data = layer.querySelector('data');
		if (data == null) {
			console.warn("Layer without data...", layer, tmx);
			return;
		}
		if (data.getAttribute('encoding') && data.getAttribute('encoding').toLowerCase() !== 'csv') {
			console.error("Illegal tilemap type");
		}
		// try anyway
		let text = data.textContent.trim();
		let tileIds = text.split(/[\s,]+/g).filter(v => v.length !== 0).map(v => v|0);
		if (tileIds.length != result.width*result.height) {
			console.error("Not sure what to do about this, wrong size tile map...", tileIds, tmx);
			throw Error("Bad tile map");
		}
		result.tiles = tileIds
	});
	return result;
}

const segmentTmp = [];
class LD34 {
	constructor(drawCanv, dbgCanv) {
		this.debugCanvas = dbgCanv;
		this.debugContext = dbgCanv.getContext('2d');
		this.entities = [];
		this.effects = [];
		this.paused = false;
		this.screen = drawCanv;
		this.ctx = drawCanv.getContext('2d');
		this.tweenGroup = new TweenGroup();
		this.loadingFailed = false;

		this.bgLayer = new Layer('bg', drawCanv.width, drawCanv.height);
		this.bgmodLayer = new Layer('bgmod', drawCanv.width, drawCanv.height);
		this.tileLayer = new Layer('tile',  drawCanv.width, drawCanv.height);
		this.entsLayer = new Layer('ents', drawCanv.width, drawCanv.height);
		this.fxLayer = new Layer('fx', drawCanv.width, drawCanv.height);
		this.lightLayer = new Layer('light', drawCanv.width, drawCanv.height);
		this.hudLayer = new Layer('hud', drawCanv.width, drawCanv.height);
		this.overlayLayer = new Layer('overlay', drawCanv.width, drawCanv.height);

		this.startedGame = false;

		this.layers = [
			this.bgLayer,
			//this.bgmodLayer,
			this.entsLayer,
			this.bgmodLayer,
			// this.fxLayer,
			this.lightLayer,
			this.tileLayer,
			this.hudLayer,
			this.overlayLayer,
		];
		this.mouse = new Vec2(0.0, 0.0);

		this.width = 1000;
		this.height = 1000;

		this.grid = null;
		this.visTracker = new VisTracker();

		this.player = new Player(this);
		this.camTarget = new Vec2(0.0, 0.0);
		this.camera = new Camera(this, this.player, this.camTarget, drawCanv.width, drawCanv.height);
		this.tiles = [];
		this.edgeGeom = [];
		this.state = STATES.Loading;
		this.loadProgress = 0;
		this.assets = {};
		this.seenBuffer = null;
		this.bgbuffer = null;
		this.lightMaskCanvas = util.createCanvas(drawCanv.width, drawCanv.height);
		this.lightMaskCtx = this.lightMaskCanvas.getContext('2d');

		this.loadAssets();
	}

	loadAssets() {
		let items = [
			{path: 'res/player.png', name: 'player', type: 'image'},
			{path: 'res/sprites.png', name: 'tiles', type: 'image'},
			{path: 'res/lvl0.tmx', name: 'level0', type: 'level'},
		];
		let loaded = 0;
		return Promise.all(items.map(({path, name, type}) => {
			let p = null;
			switch (type) {
			case 'image':
				p = util.loadImage(path);
				break;
			case 'level':
				p = util.loadXML(path).then(doc => loadLevel(doc));
				break;
			default:
				console.error("Not sure how to load ", type, name, path);
				debugger;
			}
			return p.then(stuff => {
				this.assets[name] = stuff;
				this.loadProgress = ((++loaded)/items.length)*0.8;
				return stuff;
			});
		})).then(() => {
			if (window.TIME_FUNCTIONS) console.time("getRotatedTiles");
			this.assets.playerRotations = PixelBuffer.getRotatedTiles(this.assets.player, 16);
			if (window.TIME_FUNCTIONS) console.timeEnd('getRotatedTiles');
			this.setState(STATES.Game);
		}).catch(e => {
			console.error(e);
			this.loadingFailed = true;
		});
	}

	startLevel(level) {
		this.startedGame = true;
		this.entities.length = 0;
		this.effects.length = 0;
		this.width = level.width*Consts.TileSize;
		this.height = level.height*Consts.TileSize;
		this.grid = new CollisionGrid(this.width, this.height, Consts.TileSize*2); // hm...
		// this.player.reset();
		this.addEntity(this.player, level.spawnX*Consts.TileSize+1.1, level.spawnY*Consts.TileSize+1.1)
		this.camera.setPosition(this.player.pos.x, this.player.pos.y, true);
		this.tileWidth = level.width;
		this.tileHeight = level.height;
		this.tiles = new Array(this.tileWidth*this.tileHeight);
		let geom = [];
		for (let y = 0; y < this.tileHeight; ++y) {
			for (let x = 0; x < this.tileWidth; ++x) {
				let i = x+y*this.tileWidth;
				let tileId = level.tiles[i];
				if (tileId >= Tiles.length) tileId = 0;
				let tileInfo = Tiles[tileId];
				this.tiles[i] = tileId ? tileInfo.offsetBy(x*Consts.TileSize, y*Consts.TileSize) : tileInfo;
				if (tileId) {
					geom = polybool(geom, [this.tiles[i].edges.map(({start}) => [start.x, start.y])])
				}
				this.tiles[i].id = tileId;
			}
		}

		geom.forEach((poly) => {
			for (let i = 1; i < poly.length; ++i) {
				let [px, py] = poly[i-1];
				let [cx, cy] = poly[i];
				let [nx, ny] = poly[(i+1)%poly.length];
				let dpx = cx-px, dpy = cy-py;
				let dnx = nx-cx, dny = ny-cy;
				let lp = Math.sqrt(dpx*dpx+dpy*dpy);
				if (lp !== 0) { dpx /= lp; dpy /= lp; }
				let ln = Math.sqrt(dnx*dnx+dny*dny);
				if (ln !== 0) { dnx /= ln; dny /= ln; }
				// same direction.
				if (Math.abs(dnx*dpx + dny*dpy - 1) < 0.0001) {
					poly.splice(i, 1);
					--i;
				}
			}
		});

		this.edgeGeom.length = 0;
		geom.forEach((poly, i) => {
			for (let i = 0; i < poly.length; ++i) {
				let [px, py] = poly[i];
				let [nx, ny] = poly[(i+1)%poly.length];
				this.edgeGeom.push(new LineSegment(new Vec2(px, py), new Vec2(nx, ny)));
			}
		});
		// let count = Math.ceil((this.geomPoints.length+4)*1.5);
		// let ptXYA = new Float32Array(count*3);
		// let tmpPoint = new Uint8Array(count)
		this.visTracker.setSegments(this.edgeGeom);
		this.bgbuffer = new PixelBuffer(this.width, this.height);
		// this.seenBuffer = new PixelBuffer(this.width, this.height);
		// this.seenBuffer.context.fillStyle = 'black'
		// this.seenBuffer.context.fillRect(0, 0, this.width, this.height);

		Sounds.playMusic(1);

	}

	addEntity(ent, x=ent.pos.x, y=ent.pos.y) {
		ent.pos.x = x;
		ent.pos.y = y;
		this.entities.push(ent);
		this.grid.add(ent);
		return ent;
	}

	segmentsAround(pos, radius) {
		let left = math.clamp(Math.floor((pos.x - radius) / Consts.TileSize)-1, 0, this.tileWidth-1);
		let right = math.clamp(Math.ceil((pos.x + radius) / Consts.TileSize)+1, 0, this.tileWidth-1);
		let top = math.clamp(Math.floor((pos.y - radius) / Consts.TileSize)-1, 0, this.tileHeight-1);
		let bottom = math.clamp(Math.ceil((pos.y + radius) / Consts.TileSize)+1, 0, this.tileHeight-1);
		let result = segmentTmp;
		result.length = 0;
		for (let y = top; y <= bottom; ++y) {
			for (let x = left; x <= right; ++x) {
				result.push.apply(result, this.tiles[y * this.tileWidth + x].edges);
			}
		}
		return result;
	}

	update(dt) {
		if (window.TIME_FUNCTIONS) console.time('update');
		switch (this.state) {
		case STATES.Game:
			if (!this.startedGame) {
				this.startLevel(this.assets.level0);
			}
			this.gameStateUpdate(dt);
			break;
		case STATES.Loading:
			// this is *stupid*
			if (this.loadProgress === 1.0) {
				this.state = STATES.Game;
			} else if (this.loadProgress >= 0.9) {
				this.loadProgress = 1.0;
			}
			break;
		case STATES.Menu:
			break; // NYI
		}
		if (window.TIME_FUNCTIONS) console.timeEnd('update');
	}

	gameStateUpdate(dt) {
		this.debugContext.clearRect(0, 0, this.debugContext.canvas.width, this.debugContext.canvas.height);
		this.debugContext.save();
		this.debugContext.scale(Consts.Scale, Consts.Scale);

		// this.camTarget.copy(this.player.pos);

		this.mouse.x = this.camera.minX + Input.mouse.x;
		this.mouse.y = this.camera.minY + Input.mouse.y;
		if (/*Input.mouse.isDown || */Input.keyboard.isDown('space')) {
			let mdx = this.mouse.x-this.player.pos.x;
			let mdy = this.mouse.y-this.player.pos.y;
			mdx /= 4;
			mdy /= 4;
			if (mdx < 20 && mdy < 20) {
				// this.camTarget.copy(this.player.pos)
			}
			else {
				// this.camTarget.set(this.player.pos.x+mdx, this.player.pos.y+mdy);
			}
		}
		else {
			this.camTarget.copy(this.player.pos);
		}


		// if (window.TIME_FUNCTIONS) console.time('update:entities');
		{
			let entities = this.entities;
			for (let i = 0; i < entities.length; ++i) {
				entities[i].update(dt);
			}
			let j = 0;
			for (let i = 0, l = entities.length; i < l; ++i) {
				if (entities[i].enabled) entities[j++] = entities[i];
			}
			entities.length = j;
		}
		// if (window.TIME_FUNCTIONS) console.timeEnd('update:entities');
		// if (window.TIME_FUNCTIONS) console.time('update:effects');
		{
			let effects = this.effects;
			for (let i = 0; i < effects.length; ++i) {
				effects[i].update(dt);
			}
			let j = 0;
			for (let i = 0, l = effects.length; i < l; ++i) {
				if (effects[i].enabled) effects[j++] = effects[i];
			}
			effects.length = j;
		}
		// this.visSegments = vishull2d(this.vishullInput, [this.player.x, this.player.y]);

		this.camera.update(dt);
		if (window.TIME_FUNCTIONS) console.time('lighting');
		//this.computeLighting();
		let {minX, minY, maxX, maxY} = this.camera;
		let p0 = Vec2.temp(minX-1, minY-1);
		let p1 = Vec2.temp(minX-1, maxY+1);
		let p2 = Vec2.temp(maxX+1, maxY+1);
		let p3 = Vec2.temp(maxX+1, minY-1);

		let ph = this.player.heading;
		let hx = Math.cos(ph);
		let hy = Math.sin(ph);
		let ihx = -hx
		let ihy = -hy;
		let ih = Vec2.temp(ihx*3+this.player.pos.x, ihy*3+this.player.pos.y);
		let minAngle = ph-Math.PI/5;
		let maxAngle = ph+Math.PI/5;
		let minAx = Math.cos(minAngle)*200 + ih.x;
		let minAy = Math.sin(minAngle)*200 + ih.y;

		let maxAx = Math.cos(maxAngle)*200 + ih.x;
		let maxAy = Math.sin(maxAngle)*200 + ih.y;

		// @TODO: avoid copying this so frequently
		this.visTracker.setSegments(this.edgeGeom.concat([
			new LineSegment(p0, p1, LineSegment.Flags.DoubleSided),
			new LineSegment(p1, p2, LineSegment.Flags.DoubleSided),
			new LineSegment(p2, p3, LineSegment.Flags.DoubleSided),
			new LineSegment(p3, p0, LineSegment.Flags.DoubleSided),

			// new LineSegment(ih, Vec2.temp(minAx, minAy)),
			// new LineSegment(ih, Vec2.temp(maxAx, maxAy)),

		]));

		this.visTracker.setCenter(this.player.pos);
		this.visTracker.sweep();
		if (window.TIME_FUNCTIONS) console.timeEnd('lighting');

		// if (window.TIME_FUNCTIONS) console.timeEnd('update:effects');
		this.debugContext.restore();
	}

	closestPoint(out, pos, radius) {
		let min = Number.MAX_VALUE;
		let closestX = 0.0;
		let closestY = 0.0;
		let sign = 0;
		let segs = this.segmentsAround(pos, radius);
		let tmpClosest = Vec2.temp(0.0, 0.0);
		let {x:px, y:py} = pos;
		const paperWidth = 0.1;
		for (let si = 0, sl = segs.length; si < sl; ++si) {
			let seg = segs[si];
			let backface = seg.closestPoint(tmpClosest, pos);
			let dx = tmpClosest.x-px, dy = tmpClosest.y-py;
			let dist = dx*dx+dy*dy;
			if (!backface) dist -= paperWidth;
			if (dist < min) {
				closestX = tmpClosest.x;
				closestY = tmpClosest.y;
				min = dist;
				sign = backface ? -1 : 1;
			}
		}
		out.x = closestX;
		out.y = closestY;
		return sign;
	}

	raycastCell(outP, outN, x, y, rayPos, rayDir) {
		let segs = this.tiles[x + y*this.tileWidth].edges;
		let curBest = 2.0;
		let tmpP = Vec2.temp(0.0, 0.0);
		let tmpN = Vec2.temp(0.0, 0.0);
		for (let i = 0, l = segs.length; i < l; ++i) {
			let seg = segs[i];
			let isect = seg.raycast(tmpP, tmpN, rayPos, rayDir, 0);
			if (isect === -1) return -1;
			if (isect < curBest) {
				curBest = isect;
				outP.copy(tmpP);
				outN.copy(tmpN);
			}
		}
		return curBest;
	}

	setState(state) {
		this.lastState = this.state;
		this.state = state;
	}

	raycast(outP, outN, rayPos, rayDir, rayLen, extraSegs) {
		let {x:rayX, y:rayY} = rayPos;
		let {x:rayDirX, y:rayDirY} = rayDir;
		let gx = Math.floor(rayX / Consts.TileSize);
		let gy = Math.floor(rayY / Consts.TileSize);
		let rayDxI = 0;
		let rayDyI = 0;
		let sx = 999999.0;
		let sy = 999999.0;
		let ex = 0.0;
		let ey = 0.0;

		if (rayDirX < 0) {
			rayDxI = -1;
			sx = (gx * Consts.TileSize - rayX) / rayDirX;
			ex = Consts.TileSize / -rayDirX;
		}
		else if (rayDirX > 0) {
			rayDxI = 1;
			sx = ((gx + 1) * Consts.TileSize - rayX) / rayDirX;
			ex = Consts.TileSize / rayDirX;
		}

		if (rayDirY < 0) {
			rayDyI = -1;
			sy = (gy * Consts.TileSize - rayY) / rayDirY;
			ey = Consts.TileSize / -rayDirY;
		}
		else if (rayDirY > 0) {
			rayDyI = 1;
			sy = ((gy + 1) * Consts.TileSize - rayY) / rayDirY;
			ey = Consts.TileSize / rayDirY;
		}

		if (rayDxI === 0 && rayDyI === 0) {
			console.error("Empty ray vector in raycast(): ", rayDirX, rayDirY);
			return -1;
		}

		let rayMaxDist = rayLen || 10000.0;
		let tmpRayP = Vec2.temp(rayX, rayY);
		let tmpRayV = Vec2.temp(rayDirX*rayMaxDist, rayDirY*rayMaxDist);

		let esBestT = 2;
		let esBestN = Vec2.temp();
		let esBestP = Vec2.temp();
		if (extraSegs != null) {
			let segTmpP = Vec2.temp();
			let segTmpN = Vec2.temp();
			for (let si = 0; si < extraSegs.length; ++si) {
				let t = extraSegs[si].raycast(segTmpP, segTmpN, tmpRayP, tmpRayV, 0);
				if (math.betweenI(t, 0.0, 1.0) && t < esBestT) {
					esBestT = t;
					esBestN.copy(segTmpN);
					esBestP.copy(segTmpP);
				}
			}
		}

		let travel = -1;
		while ((travel = this.raycastCell(outP, outN, gx, gy, tmpRayP, tmpRayV)) !== -1) {

			if (travel !== 2) {
				if (esBestT >= 0 && esBestT !== 2) {
					travel = Math.min(esBestT, travel);
					outP.copy(esBestP);
					outN.copy(esBestN);
				}
				return travel * rayMaxDist;
			}


			if (sx < sy) {
				sx += ex;
				gx += rayDxI;
				if (gx < 0 || gx >= this.tileWidth) {
					console.warn("raycast missed everything!", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
					return -1;
				}
			}
			else {
				sy += ey;
				gy += rayDyI;
				if (gy < 0 || gy >= this.tileHeight) {
					console.warn("raycast missed everything!", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
					return -1;
				}
			}
		}
		console.warn("raycast got bad ray (start pos inside geom)", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
		return -1;
	}

	render() {
		if (window.TIME_FUNCTIONS) console.time('render');
		switch (this.lastState) {
			case STATES.Game: this.gameStateRender(); break;
			case STATES.Loading: this.renderLoading(); break;
			case STATES.Menu: break; // NYI
		}
		if (window.TIME_FUNCTIONS) console.timeEnd('render');
		this.lastState = this.state; // @@HACK: we don't want to render until we've updated with our new state at least once.
	}

	renderLoading() {
		this.overlayLayer.clear();
		this.hudLayer.fill('black');
		let progressBarWidth = this.hudLayer.width >> 1;
		let progressBarHeight = 8;

		this.hudLayer.context.strokeStyle = 'white';
		this.hudLayer.context.strokeRect(
			(this.hudLayer.width - progressBarWidth)/2,
			(this.hudLayer.height - progressBarHeight)/2,
			progressBarWidth,
			progressBarHeight
		);

		this.hudLayer.context.fillStyle = 'black';
		this.hudLayer.context.fillRect(
			(this.hudLayer.width - progressBarWidth)/2,
			(this.hudLayer.height - progressBarHeight)/2,
			progressBarWidth,
			progressBarHeight
		);

		this.hudLayer.context.fillStyle = this.loadingFailed ? 'red': 'white';

		this.hudLayer.context.fillRect(
			(this.hudLayer.width - progressBarWidth)/2,
			(this.hudLayer.height - progressBarHeight)/2,
			progressBarWidth*this.loadProgress,
			progressBarHeight
		);
	}

	gameStateRender() {

		let {minX, minY, maxX, maxY} = this.camera;
		// minX = Math.floor(minX);
		// minY = Math.floor(minY);
		let iMinX = Math.round(minX);
		let iMinY = Math.round(minY);

		for (let i = 0; i < this.layers.length; ++i) {
			this.layers[i].clear();
			this.layers[i].context.save();
			this.layers[i].context.translate(-iMinX, -iMinY);
		}

		this.debugContext.save();
		this.debugContext.scale(Consts.Scale, Consts.Scale);
		this.debugContext.lineWidth = 1 / Consts.Scale;
		this.debugContext.strokeStyle = 'red';
		this.debugContext.translate(-minX, -minY);

		let minTileX = math.clamp(Math.floor(minX/Consts.TileSize), 0, this.tileWidth-1);
		let minTileY = math.clamp(Math.floor(minY/Consts.TileSize), 0, this.tileHeight-1);

		let maxTileX = math.clamp(Math.ceil(maxX/Consts.TileSize), 0, this.tileWidth-1);
		let maxTileY = math.clamp(Math.ceil(maxY/Consts.TileSize), 0, this.tileHeight-1);

		// this.bgmodLayer.context.drawImage(this.bgbuffer.canvas, -minX, -minY);
		// this.bgmodLayer.blendMode = 'overlay';
		// this.bgmodLayer.alpha = 0.2;
		{
			if (window.TIME_FUNCTIONS) console.time('render tiles');
			let tileCtx = this.tileLayer.context;
			tileCtx.fillStyle = 'red';
			for (let ty = minTileY; ty <= maxTileY; ++ty) {
				let row = ty*this.tileWidth;
				for (let tx = minTileX; tx <= maxTileX; ++tx) {
					let tile = this.tiles[tx + row];
					if (tile.id === 0) continue;
					let tileId = tile.id-1;
					var tileX = tileId % 16
					var tileY = (tileId / 16)|0;
					tileX *= 16;
					tileY *= 16;

					tileCtx.drawImage(this.assets.tiles,
						tileX, tileY, 16, 16,
						tx * Consts.TileSize,
						ty * Consts.TileSize,
						Consts.TileSize, Consts.TileSize);
				}
			}
			if (window.TIME_FUNCTIONS) console.timeEnd('render tiles');
		}

		// if (window.TIME_FUNCTIONS) console.time('render entities');
		for (let ei = 0; ei < this.entities.length; ++ei) {
			let ent = this.entities[ei];
			if (ent.enabled) {
				ent.render(0, 0, this.entsLayer);
			}
		}
		// if (window.TIME_FUNCTIONS) console.timeEnd('render entities');

		// if (window.TIME_FUNCTIONS) console.time('render effects');
		for (let ei = 0; ei < this.effects.length; ++ei) {
			let fx = this.effects[ei];
			if (fx.enabled) {
				fx.render(0, 0, this.fxLayer);
			}
		}
		// if (window.TIME_FUNCTIONS) console.timeEnd('render effects');


		if (this.visTracker.outXs.length) {
			if (window.TIME_FUNCTIONS) console.time('render lighting');
			this.lightLayer.clear();

			this.lightLayer.alpha = 0.1;
			this.lightLayer.blendMode = 'overlay';
			let lctx = this.lightLayer.context;
			// let sctx = this.seenBuffer.context;
			lctx.save();
			lctx.beginPath();
			lctx.moveTo(this.player.pos.x, this.player.pos.y);

			let {outXs, outYs} = this.visTracker;
			lctx.moveTo(outXs[0], outYs[0]);
			for (let i = 0, l = outXs.length; i < l; ++i) {
				let px = outXs[i];
				let py = outYs[i];
				if (i === 0) { lctx.moveTo(px, py); /*sctx.moveTo(px, py);*/ }
				else { lctx.lineTo(px, py); /*sctx.lineTo(px, py);*/ }
				if (DEBUG) drawing.drawArrow(this.debugContext, this.player.pos.x, this.player.pos.y, px, py);
			}
			const ShadowBlur = 10;
			lctx.shadowColor = 'white';
			lctx.shadowBlur = ShadowBlur/2;
			lctx.shadowOffsetX = 0;
			lctx.shadowOffsetY = 0;

			lctx.closePath();
			// sctx.closePath();
			lctx.fillStyle = 'white';
			// sctx.fillStyle = 'white';
			lctx.fill();
			// sctx.fill();

			let maskCtx = this.lightMaskCtx;
			maskCtx.save();
			maskCtx.clearRect(0, 0, maskCtx.canvas.width, maskCtx.canvas.height)
			maskCtx.globalCompositeOperation = 'source-over';

			maskCtx.shadowColor = 'black';
			maskCtx.shadowBlur = ShadowBlur;
			maskCtx.shadowOffsetX = 0;
			maskCtx.shadowOffsetY = 0;
			maskCtx.beginPath();
			maskCtx.moveTo(this.player.pos.x-minX, this.player.pos.y-minY);
			maskCtx.arc(
				this.player.pos.x-minX,
				this.player.pos.y-minY,
				200,
				this.player.heading-Math.PI/5,
				this.player.heading+Math.PI/5);
			maskCtx.closePath()
			maskCtx.fill();
			maskCtx.restore();

			maskCtx.globalCompositeOperation = 'source-in';
			maskCtx.drawImage(lctx.canvas, 0, 0);
			lctx.restore();
			lctx.translate(iMinX, iMinY);

			lctx.clearRect(0, 0, lctx.canvas.width, lctx.canvas.height);
			lctx.fillStyle = 'black';
			lctx.fillRect(0, 0, lctx.canvas.width, lctx.canvas.height);
			lctx.drawImage(maskCtx.canvas, 0, 0);
			// this.seenBuffer.context.drawImage(maskCtx.canvas, iMinX, iMinY);
			if (window.TIME_FUNCTIONS) console.timeEnd('render lighting');
		}

		// this.bgLayer.fill('rgb(55, 55, 55)');
		// this.bgmodLayer.clear();
		// this.bgmodLayer.context.drawImage(this.seenBuffer.canvas, 0, 0);
		//,
		//	0, 0, this.bgmodLayer.width, this.bgmodLayer.height,
		//	-iMinX, -iMinY, this.bgmodLayer.width, this.bgmodLayer.height);
		// this.bgmodLayer.blendMode = 'multiply';
		// this.bgmodLayer.alpha = 0.3

		let DRAW_DEBUG_GEOM = false;

		if (DRAW_DEBUG_GEOM) {
			this.debugContext.strokeStyle = 'yellow';
			this.edgeGeom.forEach(seg =>
				seg.debugRender(this.debugContext));
			this.debugContext.strokeStyle = 'yellow';

		}

		for (let i = 0; i < this.layers.length; ++i) {
			this.layers[i].context.restore();
		}


		this.debugContext.restore();
	}
}

module.exports = LD34;
