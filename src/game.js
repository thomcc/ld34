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

const {perlinNoise, octaveNoise, UIRand} = require('./rand');

const STATES = { Loading: 0, Menu: 1, Game: 2 };


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

		this.bgLayer = new Layer('bg', drawCanv.width, drawCanv.height);
		this.bgmodLayer = new Layer('bgmod', drawCanv.width, drawCanv.height);
		this.tileLayer = new Layer('tile',  drawCanv.width, drawCanv.height);
		this.entsLayer = new Layer('ents', drawCanv.width, drawCanv.height);
		this.fxLayer = new Layer('fx', drawCanv.width, drawCanv.height);
		this.lightLayer = new Layer('light', drawCanv.width, drawCanv.height);
		this.hudLayer = new Layer('hud', drawCanv.width, drawCanv.height);
		this.overlayLayer = new Layer('overlay', drawCanv.width, drawCanv.height);

		this.layers = [
			this.bgLayer,
			this.bgmodLayer,
			// this.bgmodLayer,
			this.tileLayer,
			this.entsLayer,
			this.fxLayer,
			this.lightLayer,
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
		this.bgbuffer = null;

		// @@TODO: fix this before shipping!!!
		this.loadAssets().then(() => { this.startLevel(TestLevel); });
	}

	loadAssets() {
		let items = [
			{path: 'res/player.png', name: 'player'},
			{path: 'res/sprites.png', name: 'tiles'}
		];
		let loaded = 0;
		return Promise.all(items.map(({path, name}) => {
			return util.loadImage(path).then(r => {
				this.loadProgress = ((++loaded)/items.length)*0.8;
				this.assets[name] = r;
				return r;
			});
		})).then(() => {
			this.assets.playerRotations = PixelBuffer.getRotatedTiles(this.assets.player, 16);
			this.loadProgress = 0.91;
		});
	}

	startLevel(level) {
		this.entities.length = 0;
		this.effects.length = 0;
		this.width = level.width*Consts.TileSize;
		this.height = level.height*Consts.TileSize;
		this.grid = new CollisionGrid(this.width, this.height, Consts.TileSize*2); // hm...
		// this.player.reset();
		this.addEntity(this.player, level.spawnX*Consts.TileSize, level.spawnY*Consts.TileSize)
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
		/*
		for (let y = 0; y < this.bgbuffer.height; ++y) {
			for (let x = 0; x < this.bgbuffer.width; ++x) {
				let bestV = 1.0;
				for (let iter = 0; iter < 3; ++iter) {
					let v0 = (octaveNoise(x/100, y/100, iter*5+10)+1)/2;
					let v1 = (octaveNoise(x/100, y/100, iter*5+20)+1)/2;
					let v = Math.abs(v0-v1);
					const steps = 15;
					v = Math.sqrt(v);
					v = Math.floor(v*steps);
					// if (v < 6) v = 0;
					v /= steps;
					if (v > 0.04) {
						v = 0.5;
					}
					if (v < bestV) bestV = v;
				}

				let color = (Math.floor(math.saturate(bestV) * 255) * 0x010101) | 0xff000000;
				this.bgbuffer.putPixel(x, y, color);
			}
		}
		for (let y = 0; y < this.bgbuffer.height-1; ++y) {
			for (let x = 0; x < this.bgbuffer.width; ++x) {
				if ((this.bgbuffer.getPixel(x, y) & 0xff) < 0x70) {
					if (y !== 0) {
						let pprev = this.bgbuffer.getPixel(x, y-1) & 0xff;
						if (pprev < 0x70) {
							this.bgbuffer.putPixel(x, y, 0xff000000|(UIRand.betweenI(pprev, 0x7f)*0x10101))
						}
					}
					continue;
				}
				let pix = this.bgbuffer.getPixel(x, y+1);
				if ((pix & 0xff) < 0x70) {
					this.bgbuffer.putPixel(x, y, 0xffcccccc);
				}
			}
		}

		this.bgbuffer.update();*/
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
		console.time('update');
		switch (this.state) {
		case STATES.Game:
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
		console.timeEnd('update');
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


		// console.time('update:entities');
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
		// console.timeEnd('update:entities');
		// console.time('update:effects');
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
		if (this.player.lastPos.distance(this.player.pos) >= 1) {
			this.visTracker.setCenter(this.player.pos);
			this.visTracker.sweep();
		}

		// this.visSegments = vishull2d(this.vishullInput, [this.player.x, this.player.y]);

		this.camera.update(dt);
		console.time('lighting');
		//this.computeLighting();
		let {minX, minY, maxX, maxY} = this.camera;
		let p0 = Vec2.temp(minX-1, minY-1);
		let p1 = Vec2.temp(minX-1, maxY+1);
		let p2 = Vec2.temp(maxX+1, maxY+1);
		let p3 = Vec2.temp(maxX+1, minY-1);

		// @TODO: avoid copying this so frequently
		this.visTracker.setSegments(this.edgeGeom.concat([
			new LineSegment(p0, p1, LineSegment.Flags.DoubleSided),
			new LineSegment(p1, p2, LineSegment.Flags.DoubleSided),
			new LineSegment(p2, p3, LineSegment.Flags.DoubleSided),
			new LineSegment(p3, p0, LineSegment.Flags.DoubleSided)
		]));

		this.visTracker.setCenter(this.player.pos);
		this.visTracker.sweep();
		console.timeEnd('lighting');

		// console.timeEnd('update:effects');
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
		console.time('render');
		switch (this.state) {
			case STATES.Game: this.gameStateRender(); break;
			case STATES.Loading: this.renderLoading(); break;
			case STATES.Menu: break; // NYI
		}
		console.timeEnd('render');
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

		this.hudLayer.context.fillStyle = 'white';

		this.hudLayer.context.fillRect(
			(this.hudLayer.width - progressBarWidth)/2,
			(this.hudLayer.height - progressBarHeight)/2,
			progressBarWidth*this.loadProgress,
			progressBarHeight
		);
	}

	gameStateRender() {

		for (let i = 0; i < this.layers.length; ++i) {
			this.layers[i].clear();
		}

		let {minX, minY, maxX, maxY} = this.camera;
		// minX = Math.floor(minX);
		// minY = Math.floor(minY);
		let iMinX = Math.round(minX);
		let iMinY = Math.round(minY);

		this.debugContext.save();
		this.debugContext.scale(Consts.Scale, Consts.Scale);
		this.debugContext.lineWidth = 1 / Consts.Scale;
		this.debugContext.strokeStyle = 'red';
		this.debugContext.translate(-minX, -minY);

		let minTileX = math.clamp(Math.floor(minX/Consts.TileSize), 0, this.tileWidth-1);
		let minTileY = math.clamp(Math.floor(minY/Consts.TileSize), 0, this.tileHeight-1);

		let maxTileX = math.clamp(Math.ceil(maxX/Consts.TileSize), 0, this.tileWidth-1);
		let maxTileY = math.clamp(Math.ceil(maxY/Consts.TileSize), 0, this.tileHeight-1);

		this.bgLayer.fill('rgb(55, 55, 55)');
		this.bgmodLayer.clear();
		this.bgmodLayer.context.drawImage(this.bgbuffer.canvas, -minX, -minY);
		this.bgmodLayer.blendMode = 'overlay';
		this.bgmodLayer.alpha = 0.2;
		{
			console.time('render tiles');
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
						Math.round(tx * Consts.TileSize - minX),
						Math.round(ty * Consts.TileSize - minY),
						Consts.TileSize, Consts.TileSize);
				}
			}
			console.timeEnd('render tiles');
		}

		// console.time('render entities');
		for (let ei = 0; ei < this.entities.length; ++ei) {
			let ent = this.entities[ei];
			if (ent.enabled) {
				ent.render(minX, minY, this.entsLayer);
			}
		}
		// console.timeEnd('render entities');

		// console.time('render effects');
		for (let ei = 0; ei < this.effects.length; ++ei) {
			let fx = this.effects[ei];
			if (fx.enabled) {
				fx.render(minX, minY, this.fxLayer);
			}
		}
		// console.timeEnd('render effects');


		if (this.visTracker.outXs.length)
		{
			console.time('render lighting');
			this.lightLayer.clear();
			this.lightLayer.fill('black');

			this.lightLayer.alpha = 1.0;
			this.lightLayer.blendMode = 'multiply';
			let lctx = this.lightLayer.context;
			lctx.save();
			lctx.translate(-iMinX, -iMinY);
			lctx.beginPath();
			/*
			let lightPolygon = this.lightPolygon;
			lctx.moveTo(lightPolygon[0].ex, lightPolygon[0].ey);
			for (let i = 1, l = lightPolygon.length; i < l; ++i) {
				lctx.lineTo(lightPolygon[i].ex, lightPolygon[i].ey);
			}
			lctx.lineTo(lightPolygon[0].ex, lightPolygon[0].ey);
			*/
			let {outXs, outYs} = this.visTracker;
			lctx.moveTo(outXs[0], outYs[0]);
			for (let i = 1, l = outXs.length; i < l; ++i) {
				lctx.lineTo(outXs[i], outYs[i]);
				drawing.drawArrow(this.debugContext, this.player.pos.x, this.player.pos.y, outXs[i], outYs[i]);
			}
			lctx.lineTo(outXs[0], outYs[0]);


			lctx.closePath();
			lctx.fillStyle = 'white';
			lctx.fill();
			lctx.restore();

			console.timeEnd('render lighting');
		}
		let DRAW_DEBUG_GEOM = false;

		if (DRAW_DEBUG_GEOM) {
			this.debugContext.strokeStyle = 'black';
			this.edgeGeom.forEach(seg =>
				seg.debugRender(this.debugContext));
			this.debugContext.strokeStyle = 'yellow';
			// this.lightPolygon.forEach(({sx, sy, ex, ey}) => {
			// 	drawing.drawArrow(this.debugContext, this.player.pos.x, this.player.pos.y, ex, ey)
			// })

		}


		this.debugContext.restore();
	}
}

module.exports = LD34;
