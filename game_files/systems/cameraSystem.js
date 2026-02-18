/*
========================================
VERSION: 1.0
SYSTEM: CAMERA SYSTEM
AUTHOR: 
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

//======================================
// END
//======================================
