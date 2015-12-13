'use strict';
const Clock = {};

Clock.now = window.performance ? function() { return performance.now(); } : Date.now;

Clock.ticks = 0;
Clock.fps = 60.0;
Clock.time = 0.0;
Clock.realTime = 0.0;
Clock.accumTime = 0.0;
Clock.deltaTime = 1.0 / Clock.fps;
Clock.realDeltaTime = Clock.deltaTime;

Clock.timeScale = 1.0;

// debugging
window.CLOCK = Clock;

module.exports = Clock;
