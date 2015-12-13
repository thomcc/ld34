'use strict';

const DEBUG = false;


window.DEBUG = DEBUG;


function assert(cnd, msg) {
	if (cnd) return;
	console.error("Assertation failed: "+(msg||"no message"));
	throw new Error("Assertation failure");
}

if (window.DEBUG) {
	window.ASSERT = exports.ASSERT = assert;
}
else {
	window.ASSERT = exports.ASSERT = function() {};
}


exports.debug = DEBUG;

