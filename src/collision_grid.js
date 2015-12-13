'use strict';
const {ASSERT} = require('./debug');

let scratchArray = [];
class CollisionGrid {
	constructor(width, height, cellSize) {
		this.width = Math.ceil(width/cellSize);
		this.height = Math.ceil(height/cellSize);
		this.cellSize = cellSize;
		this.cells = new Array(this.width*this.height);
		for (let i = 0; i < this.width*this.height; ++i) {
			this.cells[i] = [];
		}
	}

	add(e) {
		ASSERT(e.pos.x >= 0 && e.pos.x < this.width*this.cellSize);
		ASSERT(e.pos.y >= 0 && e.pos.y < this.height*this.cellSize);
		ASSERT(e._cell === -1);
		const cellX = Math.floor(e.pos.x / this.cellSize);
		const cellY = Math.floor(e.pos.y / this.cellSize);

		const cellIndex = cellX + cellY*this.width;
		const newCell = this.cells[cellIndex];
		e._cell = cellIndex;
		e._indexInCell = newCell.length;
		newCell.push(e);
	}

	remove(e) {
		ASSERT(e._cell !== -1);
		ASSERT(e._indexInCell !== -1);
		const cell = this.cells[e._cell];
		ASSERT(cell[e._indexInCell] === e);
		const indexInCell = e._indexInCell;	

		cell[indexInCell] = cell[cell.length-1];
		cell[indexInCell]._indexInCell = indexInCell;
		cell.pop();
		e._cell = -1;
		e._indexInCell = -1;
	}

	update(e) {
		this.remove(e);
		this.add(e);
	}

	entitiesAround(e) {
		let result = scratchArray;

		const {cells, width, height} = this;

		const cellY = Math.floor(e._cell / width);
		const cellX = e._cell % width;

		const minX = Math.max(0, cellX-1);
		const maxX = Math.min(cellX+1, width-1);
		
		const minY = Math.max(0, cellY-1);
		const maxY = Math.min(cellY+1, height-1);

		for (let y = minY; y <= maxY; ++y) {
			for (let x = minX; x <= maxX; ++x) {
				const cellIndex = x + y * width;
				const cell = cells[cellIndex];
				for (let i = 0, l = cell.length; i < l; ++i) {
					result.push(cell[i]);
				}
			}
		}
		return result;
	}

	// getCollidablePairs(outP0, outP1, entities) {
	// 	let lookup = {};
	// 	outP1.length = 0;
	// 	outP0.length = 0;
	// 	let {cells, width, height} = this;
	// 	for (let y = 0; y < height; ++y) {
	// 		for (let x = 0; x < width; ++x) {
	// 			const minX = Math.max(0, x-1);
	// 			const maxX = Math.min(x+1, width-1);
	// 			const minY = Math.max(0, y-1);
	// 			const maxY = Math.min(y+1, height-1);

	// 			for (let yy = minY; yy <= maxY; ++yy) {
	// 				for (let xx = minX; xx <= maxX; ++xx) {
	// 					const cellIndex = xx + yy * width;
	// 					const cell = cells[cellIndex];
	// 					for (let i = 0, l = cell.length; i < l; ++i) {
	// 					}
	// 				}
	// 			}

	// 		}
	// 	}
	// }
}

module.exports = CollisionGrid;
