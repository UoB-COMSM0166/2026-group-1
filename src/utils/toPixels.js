//======================================
// Utility Functions - toPixels
//======================================

import { CANVAS } from '../config.js';

export function toPixels(tileCoord, tileSize = CANVAS.TILE_SIZE) {
  return tileCoord * tileSize;
}

export function pointToPixels(point, tileSize = CANVAS.TILE_SIZE) {
  return {
    x: toPixels(point.x, tileSize),
    y: toPixels(point.y, tileSize)
  };
}

export function rectToPixels(rect, tileSize = CANVAS.TILE_SIZE) {
  return {
    x: toPixels(rect.x, tileSize),
    y: toPixels(rect.y, tileSize),
    w: toPixels(rect.w, tileSize),
    h: toPixels(rect.h, tileSize)
  };
}
