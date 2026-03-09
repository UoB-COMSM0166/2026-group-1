/*
========================================
VERSION: 1.0
SYSTEM: CAMERA SYSTEM
AUTHOR: jude
DESCRIPTION:
- Camera System: Manages viewport and visual focus
- Tracks entities (player or other targets) and adjusts view
- Handles camera smoothing, bounds, and potential effects (shake, zoom)

RULES:
- Must not modify entity or system state directly
- Must only affect what is drawn (render offset, scaling, etc.)
- Should remain independent of physics or input systems
========================================
DESIGN GOALS:
- Provide smooth camera following of player or targets
- Clamp camera to level or room boundaries
- Allow optional effects like screen shake or zoom
- Centralize camera logic for rendering consistency
========================================
RESPONSIBILITIES:
- Track target position(s) for camera focus
- Calculate camera offset (x, y) for render system
- Apply optional smoothing to movement
- Expose camera data to render system
- Handle room/level boundaries for camera position
- Provide API for temporary effects (shake, zoom)

DEPENDENCIES:
- Engine update loop for update()
- Target entity (usually the player)
- Room or level dimensions (to clamp camera)
- Render system to apply offset/transform

USAGE:
const cameraSystem = createCameraSystem({ target: player });
engine.register(cameraSystem);
========================================
NOTES:
- Camera transforms are applied in renderSystem
- All coordinates are relative to camera for rendering
========================================
TODO / LIMITATIONS:
- implement basic player tracking viewport
========================================
*/

//======================================
// CAMERA SYSTEM
//======================================

import { CANVAS } from "../config.js";

export function createCameraSystem(player, getRoomSize) {
  const camera = { x: 0, y: 0, w: CANVAS.WIDTH, h: CANVAS.HEIGHT };

  return {
    getCamera() {
      return camera;
    },

    update(deltaTime) {
      const { width: mapWidth, height: mapHeight } = getRoomSize();
      const mapCenterX = mapWidth / 2;
      const mapCenterY = mapHeight / 2;

      // Extract player coordinates safely
      const px = player.position ? player.position.x : player.x;
      const py = player.position ? player.position.y : player.y;

      const d = dist(px, py, mapCenterX, mapCenterY);
      const targetX = (d < 100 ? mapCenterX : px) - camera.w / 2;
      const targetY = (d < 100 ? mapCenterY : py) - camera.h / 2;

      camera.x = lerp(camera.x, targetX, 0.05);
      camera.y = lerp(camera.y, targetY, 0.05);

      camera.x = constrain(camera.x, 0, Math.max(0, mapWidth - camera.w));
      camera.y = constrain(camera.y, 0, Math.max(0, mapHeight - camera.h));
    },
  };
}

//======================================
// END
//======================================
