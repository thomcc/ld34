'use strict';


exports.blitFullCanvas = blitFullCanvas;
function blitFullCanvas(context, canvas) {
	context.drawImage(canvas,
		0, 0, canvas.width, canvas.height,
		0, 0, context.canvas.width, context.canvas.height);
}

// these are mostly for the debug canvas
exports.drawLine = drawLine;
function drawLine(ctx, x0, y0, x1, y1, {endpoints=false, color=''}={}) {
	let oldStrokeStyle = ctx.strokeStyle;
	if (color) ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	if (endpoints) {
		drawBox(ctx, x0, y0);
		drawBox(ctx, x1, y1);
	}
	if (color) ctx.strokeStyle = oldStrokeStyle;
}

exports.drawBox = drawBox;
function drawBox(ctx, x, y, sz=2) {
	let hs = sz/2
	ctx.strokeRect(x-hs, y-hs, sz, sz);
}

exports.drawArrow = drawArrow;
function drawArrow(ctx, x0, y0, x1, y1, n) {
	drawLine(ctx, x0, y0, x1, y1);
	let dx = x0-x1, dy = y0-y1;
	let l = Math.sqrt(dx*dx+dy*dy);
	if (l !== 0.0) {
		dx /= l;
		dy /= l;
		drawLine(ctx, x1, y1, x1+n*dx+n*dy, y1+n*dy-n*dx);
	}
}

exports.drawCircle = drawCircle;
function drawCircle(ctx, x0, y0, r) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.arc(x0, y0, r, 0, Math.PI*2);
	ctx.stroke();
}
