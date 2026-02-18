/*
========================================
VERSION: 2.2
SYSTEM: PHYSICS SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Physics System: Encapsulates logic and updates 
  player entity state
  
RULES:
- No drawing in update functions
- No state changes in draw functions
========================================
RESPONSIBILITIES:
- Apply gravity to the player
- Resolve vertical collisions with ground and platforms
- Update player.onGround state

DEPENDENCIES:
- player object: {x, y, w, h, vy, onGround}
- platforms array: [{x, y, w, h}]

CONFIG:
- fallSpeed (number): gravity applied each frame, default = 2
- groundY (number): Y coordinate of the floor, default = 429

USAGE:
const physicsSystem = createPhysicsSystem(player, platforms, { fallSpeed: 3 });
engine.register(physicsSystem);
========================================
NOTES:
  deltaTime = time since last frame (ms)
    - / 1000 converts it to seconds
    - deltaTime makes behavior independent of FPS
========================================
TODO / LIMITATIONS:
- Currently only handles vertical collisions (ground, top of platform)
  
- Horizontal collisions / movement handled elsewhere
- No friction or acceleration yet
========================================
*/

//======================================
// PHYSICS SYSTEM
//======================================
import { PLAYER, GAME } from '../config.js';

export function createPhysicsSystem(player, platforms, { fallSpeed = PLAYER.FALL_SPEED, groundY = GAME.GROUND_Y } = {}) {

  //---INTERNAL FUNCTIONS---//
  // Landing collision detection
  function isLandingOnPlatform(player, platform) {
    return (
      player.x + player.w / 2 > platform.x - platform.w / 2 &&
      player.x - player.w / 2 < platform.x + platform.w / 2 &&
      player.y + player.h / 2 >= platform.y - platform.h / 2 &&
      player.y + player.h / 2 <= platform.y - platform.h / 2 + player.vy &&
      player.vy > 0
    );
  }

   // Apply gravity and collisions
  function applyGravity() {
    player.onGround = false;
    player.vy += fallSpeed;
    player.y += player.vy;

    // Ground collision
    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }

    // Platform collisions
    for (let p of platforms) {
      if (isLandingOnPlatform(player, p)) {
        player.y = p.y - p.h / 2 - player.h / 2;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  return {
    update() {
      applyGravity();
    }
  };
}

//======================================
// END
//======================================