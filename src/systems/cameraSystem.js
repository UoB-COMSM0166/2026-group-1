/*
========================================
VERSION: 1.0
SYSTEM: CAMERA SYSTEM
AUTHOR: Jude
DESCRIPTION:
- Smooth lerp camera that follows the player
- Viewport is fixed at base resolution (640x360)
- Provides offset for renderSystem to translate world drawing

RULES:
- Must not modify entity or system state directly
- Must only affect what is drawn (render offset)
========================================
*/

//======================================
// CAMERA SYSTEM
//======================================
import { CAMERA } from '../config.js';

export function createCameraSystem(player, viewportWidth, viewportHeight) {
  // Effective viewport size is viewportWidth/SCALE × viewportHeight/SCALE
  // Higher SCALE = more zoomed in, lower = more zoomed out
  // 1.0 = 640×360 visible area, 2.0 = 320×180 visible area
  let SCALE = CAMERA.DEFAULT_SCALE;

  let camX = player.position.x - (viewportWidth / SCALE) / 2;
  let camY = player.position.y - (viewportHeight / SCALE) / 2;
  let oldCamX = camX;
  let oldCamY = camY;

  const LERP_SPEED = 0.08;

  return {
    update() {
      const vw = viewportWidth / SCALE;
      const vh = viewportHeight / SCALE;
      const targetX = player.position.x - vw / 2;
      const targetY = player.position.y - vh / 2;
      oldCamX = camX;
      oldCamY = camY;
      camX += (targetX - camX) * LERP_SPEED;
      camY += (targetY - camY) * LERP_SPEED;
    },

    getOldCamPosition(){
      return {x : oldCamX, y : oldCamY};
    },

    getOffset() {
      return { x: camX, y: camY };
    },

    getScale() {
      return SCALE;
    },

    setScale(s) {
      SCALE = Math.max(0.25, Math.min(s, 4.0));
    },

    /** Snap camera instantly (e.g. on room change) */
    snapTo(x, y) {
      const vw = viewportWidth / SCALE;
      const vh = viewportHeight / SCALE;
      camX = x - vw / 2;
      camY = y - vh / 2;
    },
  };
}

//======================================
// END
//======================================
