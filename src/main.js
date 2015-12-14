'use strict';


window.TIME_FUNCTIONS = false;

window.onload = function() {
	const GameRunner = require('./game_runner');
	window.gameRunner = new GameRunner(document.getElementById('screen'));
	window.gameRunner.start();
};
