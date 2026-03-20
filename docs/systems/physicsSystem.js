/*
========================================
VERSION: 3.1
SYSTEM: PHYSICS SYSTEM
AUTHORs: Nick 
DESCRIPTION:
- Physics System: Handles collision resolution for underwater movement
- Player velocity is set by playerSystem (acceleration + drag model)
- This system applies the velocity via setNextPosition(), resolves
  wall collisions, then commits the final position via movePlayer()

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
- Resolve collisions between player and walls

DEPENDENCIES:
- hitboxSystem: isColliding, resolveWallCollision

USAGE:
const physicsSystem = createPhysicsSystem(...)
engine.register(physicsSystem);
========================================
*/

//======================================
// PHYSICS SYSTEM - 
//======================================

import { isColliding, resolveWallCollision, Wall } from "./hitboxSystem.js";

export function createPhysicsSystem(player, platformsOrGetter) {
  const getRoomCollisionSource = typeof platformsOrGetter === 'function'
    ? platformsOrGetter
    : () => platformsOrGetter;

  //---INTERNAL FUNCTIONS---//

//======================================
// COLLISON SYSTEM - Author: Nick
//======================================

  function applyCollisions(){
    player.setNextPosition();
    const walls = resolveWalls(getRoomCollisionSource());
    for (const wall of walls) {
      const physicsWall = toPhysicsWall(wall);
      if (!physicsWall) continue;
      physicsWall.updateZones(player);
      if (isColliding(physicsWall, player)) {
        resolveWallCollision(player, physicsWall);
      }
    }
    player.movePlayer();
  }

  function resolveWalls(source){
    if (!source) return [];
    const walls = Array.isArray(source) ? source : (source.walls ?? source.platforms ?? []);
    return walls.filter(Boolean);
  }

  function toPhysicsWall(wall){
    if (!wall) return null;
    if (wall instanceof Wall) return wall;
  }
  
//======================================
// COLLISON SYSTEM - END
//======================================

//======================================
// PHYSICS - UPDATE PHASE
//======================================

  return {
    update() {
      applyCollisions();
    }
  };
}

//======================================
// END
//======================================