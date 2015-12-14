'use strict';

const FPS = exports.FPS = 60.0;
const Scale = exports.Scale = 3;

const ClientScreenWidth = exports.ClientScreenWidth = 960;
const ClientScreenHeight = exports.ClientScreenHeight = 540;

const ScreenHeight = exports.ScreenHeight = (ClientScreenHeight/Scale)>>>0;
const ScreenWidth = exports.ScreenWidth = (ClientScreenWidth/Scale)>>>0;

const DevicePixels = exports.DevicePixels = (window.devicePixelRatio || window.webkitDevicePixelRatio || 1.0);

const TileSize = exports.TileSize = 16;
