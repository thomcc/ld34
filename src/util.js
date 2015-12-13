'use strict';
const Promise = require('bluebird');

exports.createCanvas = createCanvas;
function createCanvas(width, height) {
	let result = document.createElement('canvas');
	result.width = width;
	result.height = height;
	return result;
}

exports.createContext2D = createContext2D;
function createContext2D(width, height) {
	let c = createCanvas(width, height);
	return c.getContext('2d');
}

exports.loadImage = loadImage;
function loadImage(src) {
	return new Promise(function(resolve, reject) {
		var image = new Image();
		image.onload = function() { resolve(image); };
		image.onerror = function(e) {
			console.log(e);
			console.error("Failed to load: "+src)
			reject(e);
		};
		image.src = src;
	});
}



