/*
=========================================
VERSION: 3.3
SYSTEM: RESOURCE MANAGEMENT SYSTEM
AUTHOR: Monal Gupta
DESCRIPTION:
- Handles player's resources and interactions with resource entities in the room.
- Collectables: one-shot collection with type-based handlers
- Hazards: continuous power drain + entry penalty while overlapping
- Difficulty-aware handlers — hard mode gives less reward
- Handlers defined internally — sketch.js just wires systems

HIERARCHY:
- type: "resource" (main category)
  - resourceType: "power" (specific resource)
  - resourceType: "health" (specific resource)

RULES:
- Runs in update()
- Only processes entities with type === "resource" or gid-resolved collectables
- Delegates to internal handlers based on resourceType
- Hazard drain is one shot (burst) + continuous if it stays

DESIGN GOALS:
- Decouple collision detection from item handling
- Keep all resource game logic inside this system
- sketch.js only wires — no game logic lives there
========================================
*/

//======================================
// RESOURCE MANAGEMENT SYSTEM
//======================================

import { isColliding } from "./hitboxSystem.js";
import { handlePlayerHit } from "../utils/playerHitResponse.js";
import { COMBAT } from "../config.js";

export function createResourceManagementSystem(
  player,
  roomSystem,
  getCollectables,
  getHazards,
  getDifficulty,
  getEnemies,
) {
  const collectedEntities = new Set();

  let wasOnHazard = false;
  const HAZARD_DRAIN_RATE = 1.5; // continuous drain
  const HAZARD_ENTRY_PENALTY = 10; // instant drain on first contact

  //=======================================
  // COLLECTABLE TYPE RESOLUTION
  // Mirrors renderSystem's getCollectableType logic
  //======================================
  function resolveCollectableType(item) {
    if (item.collectableType) return item.collectableType;

    const gid = Number(item?.gid);
    if (!gid) return null;

    const tilesets = roomSystem.getTilesets?.() ?? [];
    let best = null;
    for (const ts of tilesets) {
      const firstgid = Number(ts.firstgid ?? 0);
      if (gid >= firstgid && (!best || firstgid > best.firstgid)) {
        best = { ...ts, firstgid };
      }
    }
    if (!best) return null;

    const localTileId = gid - best.firstgid;
    if (localTileId === 20) return "power";
    if (localTileId === 41 || localTileId === 53) return "health";
    return null;
  }

  //=======================================
  // COLLISION CHECK
  //======================================
  function checkCollision(a, b) {
    b.position = { x: b.x, y: b.y };
    return isColliding(b, a);
  }
  //======================================
  // HANDLERS
  // Added easy - hard mode
  // Moved game logic from sketch.js to here
  //======================================
  const handlers = {
    power(player, item) {
      const difficulty = getDifficulty?.() ?? "normal";
      const amount = difficulty === "hard" ? 5 : 10;
      player.power.current = Math.max(
        0,
        Math.min(player.power.current + amount, player.power.maxPower),
      );
    },
    health(player, item) {
      const difficulty = getDifficulty?.() ?? "normal";
      const amount = difficulty === "hard" ? 2 : 5;
      player.power.current = Math.max(
        0,
        Math.min(player.power.current + amount, player.power.maxPower),
      );
    },
  };

  //======================================
  // HAZARD OVERLAP + DRAIN
  //  penalty on first contact, then continuous drain while on hazard
  //======================================
  function processHazards() {
    const hazards = getHazards ? getHazards() : [];

    for (const h of hazards) {
      if (checkCollision(player, h)) {
        if (!wasOnHazard) {
          player.power.current = Math.max(
            0,
            player.power.current - HAZARD_ENTRY_PENALTY,
          );
        }

        player.power.drain(HAZARD_DRAIN_RATE);

        /* Knockback + hit damage, gated by i-frames so it fires at most once
           per IFRAME_DURATION_MS window even during sustained hazard contact.
        */
        handlePlayerHit(player, h, COMBAT);

        wasOnHazard = true;
        player.isOnHazard = true;
        return;
      }
    }

    // Not on any hazard this frame
    wasOnHazard = false;
    player.isOnHazard = false;
  }

  //======================================
  // ENEMY CONTACT — knockback + hit damage
  // Detects player overlap with every enemy and calls the generic hit handler.
  // Power drain while touching is still handled by enemySystem independently.
  //======================================
  function processEnemyContacts() {
    const enemies = getEnemies ? getEnemies() : [];
    for (const enemy of enemies) {
      // isColliding expects hitbox1.position and hitbox2.nextPos.
      // Crabs (Hitbox subclass) have both; player.nextPos == player.position
      // after physicsSystem has committed the frame.
      if (isColliding(enemy, player)) {
        handlePlayerHit(player, enemy, COMBAT);
      }
    }
  }

  //======================================
  // COLLECTABLE
  //======================================
  function processCollectables() {
    const collectables = getCollectables ? getCollectables() : [];
    for (const e of collectables) {
      if (collectedEntities.has(e)) continue;
      const resourceType = resolveCollectableType(e);
      if (!resourceType) continue;
      if (checkCollision(player, e)) {
        e.resourceType = resourceType;
        if (handlers[resourceType]) {
          handlers[resourceType](player, e);
        }
        collectedEntities.add(e);
      }
    }
  }

  return {
    //======================================
    // UPDATE — called by engine each frame
    //======================================
    update() {
      processHazards();
      processCollectables();
      processEnemyContacts();
    },

    // Clears the collected items so they respawn on game reset
    reset() {
      collectedEntities.clear();
    },

    // filters collected items for renderSystem
    isCollected(entity) {
      return collectedEntities.has(entity);
    },

    collectEntity(entity) {
      collectedEntities.add(entity);
    },

    // optional filter by resourceType
    getUncollectedEntities(filterResourceType = null) {
      const collectables = getCollectables ? getCollectables() : [];
      return collectables.filter((e) => {
        if (collectedEntities.has(e)) return false;
        const resourceType = resolveCollectableType(e);
        if (!resourceType) return false;
        if (filterResourceType) return resourceType === filterResourceType;
        return true;
      });
    },
  };
}
