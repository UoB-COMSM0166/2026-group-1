/*
========================================
VERSION: 2.4
SYSTEM: PHYSICS SYSTEM
AUTHORs: Georgia Sweeny, 
DESCRIPTION:
- Physics System: Handles vertical motion, gravity, and collision resolution
- Updates player state such as position, velocity, and onGround status

RULES:
- No rendering or drawing in update functions
- Does not modify other systems directly
- Purely updates entity state based on physics
========================================
DESIGN GOALS:
- Separate physics logic from input and rendering
- Frame-rate independent movement using deltaTime if needed
- Maintain clean boundaries between systems
========================================
RESPONSIBILITIES:
- Apply gravity to the player
- Resolve collisions with ground and platforms
- Update player.onGround flag
- Maintain consistent vertical motion behavior

DEPENDENCIES:
- player object: {x, y, w, h, vy, onGround}
- platforms array: [{x, y, w, h}]
- Configuration: fallSpeed, groundY

CONFIG:
- fallSpeed (number): gravity applied each frame (default from PLAYER.FALL_SPEED)
- groundY (number): y-coordinate of the floor (default from GAME.GROUND_Y)

USAGE:
const physicsSystem = createPhysicsSystem(player, platforms, { fallSpeed: 3 });
engine.register(physicsSystem);
========================================
NOTES:
- Currently only vertical collisions handled (ground, top of platform)
- Horizontal movement / collisions handled elsewhere
- No friction, acceleration, or drag applied yet
- Can be extended to use deltaTime for true frame-rate independence
========================================
*/

//======================================
// PHYSICS SYSTEM - 
//======================================
import { PLAYER, GAME } from '../config.js';

export function createPhysicsSystem(player, platformsOrGetter, { fallSpeed = PLAYER.FALL_SPEED, groundY = GAME.GROUND_Y } = {}) {
  const getPlatforms = typeof platformsOrGetter === 'function'
    ? platformsOrGetter
    : () => platformsOrGetter;

  //---INTERNAL FUNCTIONS---//

//======================================
// COLLISON SYSTEM - Author:
//======================================
/* Note from Georgia: (to be removed)

 Add your name to Author/s in header file and this section.
 Update header details with new collsion logic.
 I will add underwater physics here but it wont effect collision
 logic.

 This currently the platformer physics and collsion logic.
 It is not AABB collsion and currently uses gravity.
You should be able to remove gravity and the game should behave 
as "top-down" style as youve been working with.
I will implement the underwater physics as soon as possible though.

A good name for the collision wrapper would be --> applyCollisions();
Call all your functions in there so update(); is kept clean.

Map will be a JSON grid made of "tiles" - proably going to make
the maps with TILED https://www.mapeditor.org/. There should be documention
and online info for how people have used it in other projects which might be useful.

Write your behavior tests first, it should help when writing the functions 
- maybe we will start loving tests? xD
Add error messages if you think it would be helpful
*/

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
    for (const p of getPlatforms()) {
      if (isLandingOnPlatform(player, p)) {
        player.y = p.y - p.h / 2 - player.h / 2;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }
//======================================
// COLLISON SYSTEM - END
//======================================

//======================================
// UNDERWATER PHYSICS - Author: Georgia
//======================================
// ........
// underwater movement logic
//======================================
// UNDERWATER SYSTEM - END
//======================================

//======================================
// PHYSICS - UPDATE PHASE
//======================================

  return {
    update() {
      // applyUnderWaterPhysics(); <-- georgia will add this
      // applyCollisions(); <-- suggested wrapper name for collsions to live in
      applyGravity();// can safely remove current wrapper and code above
    }
  };
}

//======================================
// END
//======================================
