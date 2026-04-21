/*
========================================
DESIGN GOALS:
- Port Sonar 5.0 prototype logic into modular architecture
- Separate pulse data (state) from rendering (renderSystem draws)
- Integrate with lightingSystem for darkness layer punch-through
RESPONSIBILITIES:
- Create sonar pulses when player triggers sonar intent
- Update pulse particle positions each frame (velocity * TIME.fixedDeltaTime)
- Detect particle collisions with room platforms/walls
- Illuminate walls on contact, fade wall alpha over time
- Expose active pulses for renderSystem to draw
- Expose revealed walls for renderSystem to draw
- Expose sonar light sources for lightingSystem

DEPENDENCIES:
- Player entity with sonarIntent, sonarPulses[], power
- Room platforms (getPlatforms callback) — Wall objects with getCornerX/Y(), getWidth/Height()
- Config: SONAR constants (speed, rays, fade, cost, cooldown)

USAGE:
import { createSonarSystem } from './sonarSystem.js';
const sonarSystem = createSonarSystem(player, getPlatforms);
VERSION: 4.0
SYSTEM: SONAR SYSTEM
AUTHOR: Ben Mounce
DESCRIPTION:
- Emits expanding sonar rings from the player to temporarily reveal walls.
- Integrates with roomSystem platforms and hitbox walls.

RULES:
- No direct mutation of shared game state outside this system.
- Uses player intent (emitSonar) set by inputSystem.
- Draws additive glow without altering the main render layers.
DESIGN GOALS:
- Keep the original pulse visible while in darkness but not when torch is on.
- Work with both Hitbox walls and plain room objects
RESPONSIBILITIES:
- Spawn pulses when the player requests sonar.
- Fade pulses over time and stop when finished.
- Reveal walls near the pulse radius and fade them back out.
DEPENDENCIES:
- player: exposes intent.emitSonar and getX/getY.
- roomSystem: exposes getPlatforms() returning walls.
- config: SONAR.COOLDOWN_MS
USAGE:
import { createSonarSystem } from './sonarSystem.js';
const sonarSystem = createSonarSystem(player, () => roomSystem.getPlatforms());
engine.register(sonarSystem);
========================================
*/

import { SONAR } from '../config.js';

const RAY_COUNT = 360;
const RAY_SPEED = 2;
const RAY_DECAY = 2;
const RAY_LIFETIME = 255;

const REVEAL_BONUS = 70;
const REVEAL_FADE_PER_MS = 2;

function getNormalisedWalls(getWallsFinal) {
  const input = getWallsFinal?.() || [];
  const list = Array.isArray(input) ? input : (input?.platforms ?? []);
  // sonar doesnt reveal destroyed blocks
  return list.filter(wall => !wall.isDestroyed);
}

function getNormalisedObjects(getObjectsFinal) {
  const input = getObjectsFinal?.() || [];
  return Array.isArray(input) ? input : [];
}

function readWallRect(wall) {
  if (!wall || typeof wall !== 'object') return null;
  
  const usesHitbox = typeof wall?.getCornerX === 'function';
  const w = usesHitbox ? wall.getWidth() : wall?.w ?? 0;
  const h = usesHitbox ? wall.getHeight() : wall?.h ?? 0;
  
  if (!w || !h) return null;
  
  const x = usesHitbox ? wall.getCornerX() : (wall.x ?? 0) - w / 2;
  const y = usesHitbox ? wall.getCornerY() : (wall.y ?? 0) - h / 2;
  
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  
  return { x, y, w, h };
}

function readCenterRect(objectLike) {
  if (!objectLike || typeof objectLike !== 'object') return null;
  const w = objectLike?.w ?? objectLike?.width ?? 0;
  const h = objectLike?.h ?? objectLike?.height ?? 0;
  const x = objectLike?.x ?? null;
  const y = objectLike?.y ?? null;
  if (!w || !h || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

export function createSonarSystem(player, getWalls, getHazards = () => [], getCollectables = () => []) {
  let pulses = [];
  const wallAlpha = new WeakMap();
  const hazardAlpha = new WeakMap();
  const collectableAlpha = new WeakMap();
  let cooldownTimer = 0;

  return {
    update() {
      if (cooldownTimer > 0) {
        cooldownTimer = Math.max(0, cooldownTimer - 0.01);
      }
  
      if (player?.actionIntent?.emitSonar) {
        if (cooldownTimer <= 0) {
          const px = typeof player.getX === 'function' ? player.getX() : player.x;
          const py = typeof player.getY === 'function' ? player.getY() : player.y;
          
          if (Number.isFinite(px) && Number.isFinite(py)) {
            pulses.push(new Pulse(px, py));
            cooldownTimer = SONAR.COOLDOWN_MS ?? 0;
          }
        }
        player.actionIntent.emitSonar = false;

      }

      const inputWalls = getNormalisedWalls(getWalls);
      const inputHazards = getNormalisedObjects(getHazards);
      const inputCollectables = getNormalisedObjects(getCollectables);
      const wallData = [];
      const hazardData = [];
      const collectableData = [];
      
      for (const wall of inputWalls) {
        const rect = readWallRect(wall);
        if (rect) {
          wallData.push({ wall, rect });  
        }
        
        const currentAlpha = wallAlpha.get(wall);
        if (currentAlpha != null) {
          const nextAlpha = Math.max(0, currentAlpha - (REVEAL_FADE_PER_MS));
          if (nextAlpha <= 0) {
            wallAlpha.delete(wall);
          } else {
            wallAlpha.set(wall, nextAlpha);
          }
        }
      }

      for (const hazard of inputHazards) {
        const rect = readCenterRect(hazard);
        if (rect) {
          hazardData.push({ hazard, rect });
        }

        const currentAlpha = hazardAlpha.get(hazard);
        if (currentAlpha != null) {
          const nextAlpha = Math.max(0, currentAlpha - (REVEAL_FADE_PER_MS));
          if (nextAlpha <= 0) {
            hazardAlpha.delete(hazard);
          } else {
            hazardAlpha.set(hazard, nextAlpha);
          }
        }
      }

      for (const collectable of inputCollectables) {
        const rect = readCenterRect(collectable);
        if (rect) {
          collectableData.push({ collectable, rect });
        }

        const currentAlpha = collectableAlpha.get(collectable);
        if (currentAlpha != null) {
          const nextAlpha = Math.max(0, currentAlpha - (REVEAL_FADE_PER_MS));
          if (nextAlpha <= 0) {
            collectableAlpha.delete(collectable);
          } else {
            collectableAlpha.set(collectable, nextAlpha);
          }
        }
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.update(wallData, wallAlpha, hazardData, hazardAlpha, collectableData, collectableAlpha);

        if (p.isFinished()) {
          pulses.splice(i, 1);
        }
      }
    },

    draw() {
      // Pulses are drawn by renderSystem inside camera transform
    },

    getCooldownPercent() {
      if (cooldownTimer <= 0) {
        return 0;
      }
      print(cooldownTimer);
      return cooldownTimer / (SONAR.COOLDOWN_MS);
    },

    getRevealedWalls() {
      const inputWalls = getNormalisedWalls(getWalls);
      const reveals = [];
      
      for (const wall of inputWalls) {
        const alpha = wallAlpha.get(wall);
        if (!alpha) {
          continue;
        }
        const rectInfo = readWallRect(wall);
        if (rectInfo) {
          reveals.push({ ...rectInfo, alpha: Math.max(0, Math.min(255, alpha)) });
        }
      }
      return reveals;
    },

    getRevealedHazards() {
      const inputHazards = getNormalisedObjects(getHazards);
      const reveals = [];
      for (const hazard of inputHazards) {
        const alpha = hazardAlpha.get(hazard);
        if (!alpha) continue;
        const rect = readCenterRect(hazard);
        if (rect) {
          reveals.push({ ...rect, alpha: Math.max(0, Math.min(255, alpha)) });
        }
      }
      return reveals;
    },

    getRevealedCollectables() {
      const inputCollectables = getNormalisedObjects(getCollectables);
      const reveals = [];
      for (const item of inputCollectables) {
        const alpha = collectableAlpha.get(item);
        if (!alpha) continue;
        const rect = readCenterRect(item);
        if (rect) {
          reveals.push({
            ...rect,
            alpha: Math.max(0, Math.min(255, alpha)),
            gid: item?.gid ?? null,
            collectableType: item?.collectableType ?? '',
            type: item?.type ?? '',
            resourceType: item?.resourceType ?? item?.properties?.resourceType ?? item?.properties?.type ?? ''
          });
        }
      }
      return reveals;
    },

    getActivePulses() {
      return pulses;
    }
  };
}

class Pulse {
  constructor(x, y) {
    this.particles = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * TWO_PI;
      const vel = p5.Vector.fromAngle(angle).mult(RAY_SPEED);
      this.particles.push({
        pos: createVector(x, y),
        vel,
        life: RAY_LIFETIME,
      });
    }
  }

  update(wallData, wallAlpha, hazardData, hazardAlpha, collectableData, collectableAlpha) {
    for (const p of this.particles) {
      if (p.life <= 0) {
        continue;
      }

      p.life -= RAY_DECAY;
      if (p.life <= 0) {
        continue;
      }

      const nextX = p.pos.x + p.vel.x;
      const nextY = p.pos.y + p.vel.y;
      let collided = false;

      for (const { wall, rect } of wallData) {
        if (
          nextX >= rect.x && nextX <= rect.x + rect.w &&
          nextY >= rect.y && nextY <= rect.y + rect.h
        ) {
          const current = wallAlpha.get(wall) ?? 0;
          wallAlpha.set(wall, Math.min(255, current + REVEAL_BONUS));
          collided = true;
          break;
        }
      }

      if (!collided) {
        for (const { hazard, rect } of hazardData) {
          if (
            nextX >= rect.x && nextX <= rect.x + rect.w &&
            nextY >= rect.y && nextY <= rect.y + rect.h
          ) {
            const current = hazardAlpha.get(hazard) ?? 0;
            hazardAlpha.set(hazard, Math.min(255, current + REVEAL_BONUS));
            collided = true;
            break;
          }
        }
      }

      if (!collided) {
        for (const { collectable, rect } of collectableData) {
          if (
            nextX >= rect.x && nextX <= rect.x + rect.w &&
            nextY >= rect.y && nextY <= rect.y + rect.h
          ) {
            const current = collectableAlpha.get(collectable) ?? 0;
            collectableAlpha.set(collectable, Math.min(255, current + REVEAL_BONUS));
            collided = true;
            break;
          }
        }
      }

      if (collided) {
        p.life = 0; 
      } else {
        p.pos.x = nextX;
        p.pos.y = nextY;
      }
    }
  }

  show() {
    strokeWeight(2);
    for (const p of this.particles) {
      if (p.life > 0) {
        stroke(100, 200, 255, p.life);
        point(p.pos.x, p.pos.y);
      }
    }
  }

  isFinished() {
    return this.particles.every((p) => p.life <= 0);
  }
}
//======================================
// END
//======================================
