/*
========================================
VERSION: 3.0
SYSTEM: PHYSICS SYSTEM (SUBMARINE MODE)
AUTHORS: Georgia Sweeny, Refactored for submarine physics
DESCRIPTION:
- Physics System: Handles submarine-style movement with momentum and drag
- Implements friction, velocity damping, and wall collision with bounce
- No gravity - free 360° movement in underwater environment

RULES:
- No rendering or drawing in update functions
- Does not modify other systems directly
- Purely updates entity state based on physics

DESIGN GOALS:
- Submarine feels "floaty" with momentum
- Smooth deceleration when no input
- Wall collisions cause bounce based on velocity
- Simple, readable implementation

RESPONSIBILITIES:
- Apply drag/friction to velocity
- Resolve collisions with room boundaries (walls)
- Bounce player off walls based on velocity
- Update player position based on velocity

DEPENDENCIES:
- player object: {x, y, w, h, vx, vy}
- room dimensions: {width, height}
- Configuration: drag, bounceDamping

CONFIG:
- drag (0-1): velocity damping per frame (default 0.92)
- bounceDamping (0-1): velocity reduction on wall hit (default 0.5)
- minVelocity: threshold below which velocity becomes 0

USAGE:
const physicsSystem = createPhysicsSystem(player, () => currentRoom);
engine.register(physicsSystem);
========================================
NOTES:
- Player.vx and player.vy represent velocity (momentum)
- PlayerSystem adds to velocity, PhysicsSystem applies it to position
- Wall collision uses AABB (axis-aligned bounding box) detection
- Bounce direction reverses velocity component perpendicular to wall
========================================
*/

//======================================
// SUBMARINE PHYSICS SYSTEM
//======================================
import { GAME } from '../config.js';

export function createPhysicsSystem(
  player, 
  roomGetter,
  { 
    drag = 0.92,           // Higher = less friction (0.9-0.95 feels good)
    bounceDamping = 0.5,   // Velocity kept after bounce (0.5 = half speed)
    minVelocity = 0.1      // Stop if slower than this
  } = {}
) {
  const getRoom = typeof roomGetter === 'function' ? roomGetter : () => roomGetter;

  //---INTERNAL FUNCTIONS---//

  //======================================
  // MOMENTUM & DRAG
  //======================================
  function applyDrag() {
    // Apply friction/water resistance
    player.vx *= drag;
    player.vy *= drag;

    // Stop tiny movements (prevents endless drift)
    if (Math.abs(player.vx) < minVelocity) player.vx = 0;
    if (Math.abs(player.vy) < minVelocity) player.vy = 0;
  }

  function applyVelocity() {
    // Update position based on velocity
    player.x += player.vx;
    player.y += player.vy;
  }

  //======================================
  // WALL COLLISION & BOUNCE
  //======================================
  function checkWallCollisions() {
    const room = getRoom();
    if (!room) return;

    const roomWidth = room.width * room.tilewidth;
    const roomHeight = room.height * room.tileheight;

    const halfW = player.w / 2;
    const halfH = player.h / 2;

    // Left wall
    if (player.x - halfW < 0) {
      player.x = halfW;
      player.vx = Math.abs(player.vx) * bounceDamping; // Bounce right
    }

    // Right wall
    if (player.x + halfW > roomWidth) {
      player.x = roomWidth - halfW;
      player.vx = -Math.abs(player.vx) * bounceDamping; // Bounce left
    }

    // Top wall
    if (player.y - halfH < 0) {
      player.y = halfH;
      player.vy = Math.abs(player.vy) * bounceDamping; // Bounce down
    }

    // Bottom wall
    if (player.y + halfH > roomHeight) {
      player.y = roomHeight - halfH;
      player.vy = -Math.abs(player.vy) * bounceDamping; // Bounce up
    }
  }

  //======================================
  // OBSTACLE COLLISION (PLATFORMS)
  //======================================
  function checkObstacleCollisions(obstacles) {
    if (!obstacles || obstacles.length === 0) return;

    for (const obs of obstacles) {
      // AABB collision detection
      const playerLeft = player.x - player.w / 2;
      const playerRight = player.x + player.w / 2;
      const playerTop = player.y - player.h / 2;
      const playerBottom = player.y + player.h / 2;

      const obsLeft = obs.x - obs.width / 2;
      const obsRight = obs.x + obs.width / 2;
      const obsTop = obs.y - obs.height / 2;
      const obsBottom = obs.y + obs.height / 2;

      const isColliding = 
        playerRight > obsLeft &&
        playerLeft < obsRight &&
        playerBottom > obsTop &&
        playerTop < obsBottom;

      if (isColliding) {
        // Calculate overlap on each axis
        const overlapLeft = playerRight - obsLeft;
        const overlapRight = obsRight - playerLeft;
        const overlapTop = playerBottom - obsTop;
        const overlapBottom = obsBottom - playerTop;

        // Find smallest overlap (penetration depth)
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        // Push player out and bounce
        if (minOverlap === overlapLeft) {
          player.x -= overlapLeft;
          player.vx = -Math.abs(player.vx) * bounceDamping;
        } else if (minOverlap === overlapRight) {
          player.x += overlapRight;
          player.vx = Math.abs(player.vx) * bounceDamping;
        } else if (minOverlap === overlapTop) {
          player.y -= overlapTop;
          player.vy = -Math.abs(player.vy) * bounceDamping;
        } else if (minOverlap === overlapBottom) {
          player.y += overlapBottom;
          player.vy = Math.abs(player.vy) * bounceDamping;
        }
      }
    }
  }

  //======================================
  // PHYSICS - UPDATE PHASE
  //======================================
  return {
    update() {

      applyDrag();           // Apply water resistance
      applyVelocity();       // Move player based on velocity
      checkWallCollisions(); // Bounce off room boundaries
      
      // // DEBUG: Check after physics
      // console.log("After physics:", {
      //   x: player.x, 
      //   y: player.y, 
      //   vx: player.vx, 
      //   vy: player.vy
      // });

      // Get obstacles from current room (platforms become obstacles)
      const room = getRoom();
      if (room && room.layers) {
        const platformLayer = room.layers.find(l => l.name === 'platforms');
        if (platformLayer && platformLayer.objects) {
          checkObstacleCollisions(platformLayer.objects);
        }
      }
    }
  };
}

//======================================
// END
//======================================
