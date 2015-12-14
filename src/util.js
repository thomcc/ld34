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

exports.getRequest = getRequest;
function getRequest(src, preRequest=null) {
	return new Promise(function(resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', src, true);
		if (preRequest) preRequest(xhr);
		xhr.onload = function() {
			if (xhr.status >= 200 && xhr.status < 400) {
				resolve(xhr);
			}
			else {
				console.error("request failed");
				reject(xhr);
			}
		};
		xhr.onerror = function(e) {
			console.error(e, xhr);
			reject(xhr);
		};
		xhr.send();
	});
}

exports.loadXML = loadXML;
function loadXML(src) {
	return getRequest(src)
	.then(function(response) {
		return new DOMParser().parseFromString(response.responseText, "application/xml");
	});
}

exports.loadText = loadText;
function loadText(src) {
	return getRequest(src)
	.then(function(response) {
		return response.responseText;
	});
}

exports.loadJSON = loadJSON;
function loadJSON(src) {
	return getRequest(src)
	.then(function(response) {
		return JSON.parse(response.responseText)
	});
}
