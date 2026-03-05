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

import { isColliding, resolveWallCollision } from "./hitboxSystem.js";

export function createPhysicsSystem(player, platformsOrGetter) {
  const getRoomCollisionSource = typeof platformsOrGetter === 'function'
    ? platformsOrGetter
    : () => platformsOrGetter;

  function resolveWalls(source) {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (Array.isArray(source.platforms)) return source.platforms;
    return [];
  }

  function getEntityWidth(entity) {
    if (typeof entity?.getWidth === 'function') return entity.getWidth();
    return entity?.w ?? entity?.width ?? 0;
  }

  function getEntityHeight(entity) {
    if (typeof entity?.getHeight === 'function') return entity.getHeight();
    return entity?.h ?? entity?.height ?? 0;
  }

  function getWallCenter(wall) {
    if (Number.isFinite(wall?.position?.x) && Number.isFinite(wall?.position?.y)) {
      return { x: wall.position.x, y: wall.position.y };
    }
    if (Number.isFinite(wall?.x) && Number.isFinite(wall?.y)) {
      return { x: wall.x, y: wall.y };
    }
    return null;
  }

  function toPhysicsWall(wall) {
    if (!wall) return null;
    if (
      typeof wall.updateZones === 'function' &&
      wall.position &&
      Array.isArray(wall.zones)
    ) {
      return wall;
    }

    const center = getWallCenter(wall);
    const wallW = wall?.w ?? wall?.width ?? 0;
    const wallH = wall?.h ?? wall?.height ?? 0;
    if (!center || !Number.isFinite(wallW) || !Number.isFinite(wallH) || wallW <= 0 || wallH <= 0) {
      return null;
    }

    const adapted = {
      position: center,
      w: wallW,
      h: wallH,
      zones: [false, false, false, false],
      updateZones(entity) {
        const vec = entity?.position;
        const entityW = getEntityWidth(entity);
        const entityH = getEntityHeight(entity);
        if (!vec || !entityW || !entityH) return;

        this.zones[0] = (((vec.x + (entityW / 2)) >= this.position.x - (this.w / 2)) &&
                         ((vec.x - (entityW / 2)) <= this.position.x + (this.w / 2)) &&
                         ((vec.y + (entityH / 2)) <= this.position.y - (this.h / 2)));
        this.zones[1] = ((vec.x - (entityW / 2)) >= this.position.x + (this.w / 2));
        this.zones[2] = (((vec.x + (entityW / 2)) >= this.position.x - (this.w / 2)) &&
                         ((vec.x - (entityW / 2)) <= this.position.x + (this.w / 2)) &&
                         ((vec.y - (entityH / 2)) >= this.position.y - (this.h / 2)));
        this.zones[3] = ((vec.x + (entityW / 2)) <= this.position.x - (this.w / 2));
      }
    };
    return adapted;
  }

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

//======================================
// PHYSICS - UPDATE PHASE
//======================================

  return {
    update() {
      // applyUnderWaterPhysics(); <-- georgia will add this
      applyCollisions(); // <-- suggested wrapper name for collsions to live in
    }
  };
}

//======================================
// END
//======================================