'use strict';
const {ASSERT} = require('./debug');
const Consts = require('./constants');
// mostly borrowed from my library, demon.js, with some modifications
const Mouse = {
	x: 0,
	y: 0,
	dx: 0,
	dy: 0,
	lastX: 0,
	lastY: 0,
	isDown: false,
	transitions: 0,
	wasPressed() { return this.isDown && this.transitions > 0; },
	wasReleased() { return !this.isDown && this.transitions > 0; },
};

let MouseScreen = null;
function updateMousePos(cx, cy) {
	let rect = MouseScreen.getBoundingClientRect();
	cx -= rect.left;
	cy -= rect.top;
	Mouse.x = cx / Consts.Scale;
	Mouse.y = cy / Consts.Scale;
	Mouse.dx = Mouse.x-Mouse.lastX;
	Mouse.dy = Mouse.y-Mouse.lastY;
}

function initMouse(screen) {
	MouseScreen = screen;
	window.addEventListener('blur', function() {
		Mouse.isDown = false;
		Mouse.lastX = Mouse.dx = Mouse.x = Mouse.lastY = Mouse.dy = Mouse.y = 0;
		Mouse.transitions = 0;
	});

	window.addEventListener('mousedown', function(e) {
		if (e.button === 0) { Mouse.isDown = true; ++Mouse.transitions; }
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});

	window.addEventListener('mouseup', function(e) {
		if (e.button === 0) { Mouse.isDown = false; ++Mouse.transitions; }
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});

	window.addEventListener('mousemove', function(e) {
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});
}

function updateMouse() {
	Mouse.transitions = 0;
	Mouse.lastX = Mouse.x;
	Mouse.lastY = Mouse.y;
}

const KEYMAX = 256;

const Keyboard = {
	KeyCodes: null,
	KeyCodeInverse: null,
	KC: {},
	KCI: {},
	keyTransitions: new Uint8Array(KEYMAX),
	keysDown: new Uint8Array(KEYMAX),
	defaultPrevented: new Array(KEYMAX),

	isDownC(kc) { return !!this.keysDown[kc >>> 0]; },
	transitionsC(kc) { return this.keyTransitions[kc >>> 0]; },
	wasPressedC(kc) { const code = kc >>> 0; return !!(this.keysDown[code] && this.keyTransitions[code]); },
	wasReleasedC(kc) { const code = kc >>> 0; return !!(!this.keysDown[code] && this.keyTransitions[code]); },

	isDown(key) { return this.isDownC(keyToCode(key)); },
	transitions(key) { return this.transitionsC(keyToCode(key)); },
	wasPressed(key) { return this.wasPressedC(keyToCode(key)); },
	wasReleased(key) { return this.wasReleasedC(keyToCode(key)); },
};

Keyboard.KeyCodes = Keyboard.KC;
Keyboard.KeyCodeInverse = Keyboard.KCI;
const KnownKeys = new Uint8Array(KEYMAX);

function keyToCode(key) {
	let code = 0;
	if (typeof key === 'number') {
		code = key >>> 0;
		if (KnownKeys[code] === 0) { console.error("Keycode "+key+" is not mapped to any known key"); return 0; }
	} else {
		const maybeCode = Keyboard.KC[key];
		if (maybeCode === 0) { console.error("Unknown key: "+key); return 0; }
		code = maybeCode >>> 0;
	}
	if (code >= KEYMAX || code === 0) { console.error("Keycode "+key+" is outside valid range: "+code); return 0; }
	return code;
}

(function() {
	const keysToCodes = {
		A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
		Left: 37, Up: 38, Right: 39, Down: 40,
		Escape: 27, Return: 13,
		Backspace: 8, Space: 32, Tab: 9,
		Num0: 48, Num1: 49, Num2: 50, Num3: 51, Num4: 52, Num5: 53, Num6: 54, Num7: 55, Num8: 56, Num9: 57,
		Numpad0: 96, Numpad1: 97, Numpad2: 98, Numpad3: 99, Numpad4: 100, Numpad5: 101, Numpad6: 102, Numpad7: 103, Numpad8: 104, Numpad9: 105,
		NumpadMinus: 109, NumpadPlus: 107, NumpadEqual: 12, NumpadSlash: 111,
		F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
		Tilde: 192, Shift: 16, Ctrl: 17, Alt: 18,
		Colon: 186, Equals: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191, OpenBracket: 219, CloseBracket: 221, Backslash: 220, Quote: 222
	};

	const kcAliases = {
		Tilde: ['Backtick'], Return: ['Enter'], Escape: ['Esc'], Ctrl: ['Control'], Alt: ['Meta'],
		Num0: ['Zero'], Num1: ['One'], Num2: ['Two'], Num3: ['Three'], Num4: ['Four'], Num5: ['Five'], Num6: ['Six'], Num7: ['Seven'], Num8: ['Eight'], Num9: ['Nine'],
	};

	Object.keys(keysToCodes).forEach(function(key) {
		var code = keysToCodes[key];
		ASSERT(code < KEYMAX, "[BUG] keycode for "+key+" is greater than KEYMAX");
		Keyboard.KCI[code] = key;
		KnownKeys[code] = 1;
		var keys = [key].concat(kcAliases[key] || []);
		keys.forEach(function(keyName) {
			Keyboard.KC[keyName] = code;
			Keyboard.KC[keyName.toLowerCase()] = code;
			var camelCase = keyName[0].toLowerCase()+keyName.slice(1);
			Keyboard.KC[camelCase] = code;
			var capCase = keyName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
			Keyboard.KC[capCase] = code;
		});
	});

	for (let i = 0; i < KEYMAX; ++i) {
		Keyboard.defaultPrevented[i] = true;
	}

	for (var i = 1; i <= 12; ++i) {
		Keyboard.defaultPrevented[Keyboard.KC["F"+i]] = false;
	}
}());

const keyTransitions32 = new Uint32Array(Keyboard.keyTransitions.buffer)
const keysDown32 = new Uint32Array(Keyboard.keysDown.buffer)


function initKeyboard() {
	window.addEventListener('keydown', function(e) {
		var kc = e.keyCode >>> 0;
		if (kc > KEYMAX || kc === 0) { console.warn("Unknown keycode value from DOM event.", e); return; }
		if (!Keyboard.keysDown[kc]) { Keyboard.keysDown[kc] = 1; ++Keyboard.keyTransitions[kc]; }
		if (Keyboard.defaultPrevented[kc]) { e.preventDefault(); }
	});

	window.addEventListener('keyup', function(e) {
		var kc = e.keyCode >>> 0;
		if (kc > KEYMAX || kc === 0) { console.warn("Unknown keycode value from DOM event.", e); return; }
		if (Keyboard.keysDown[kc]) { Keyboard.keysDown[kc] = false; ++Keyboard.keyTransitions[kc]; }
		if (Keyboard.defaultPrevented[kc]) { e.preventDefault(); }
	});

	window.addEventListener('blur', function() {
		for (let i = 0; i < keyTransitions32.length; ++i) keyTransitions32[i] = 0;
		for (let i = 0; i < keysDown32.length; ++i) keysDown32[i] = 0;
	});
}

function updateKeyboard() {
	for (let i = 0; i < keyTransitions32.length; ++i) keyTransitions32[i] = 0;
}

exports.mouse = exports.Mouse = Mouse;
exports.keyboard = exports.keys = exports.Keyboard = Keyboard;
exports.KeyCode = Keyboard.KeyCodes;

exports.initialize = function(screen) {
	initMouse(screen);
	initKeyboard(screen);
};

exports.update = function() {
	updateMouse();
	updateKeyboard();
};



