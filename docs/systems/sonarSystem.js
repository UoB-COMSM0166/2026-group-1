/*
========================================
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
========================================
DESIGN GOALS:
- Keep the original pulse visible while in darkness but not when torch is on.
- Work with both Hitbox walls and plain room objects
========================================
RESPONSIBILITIES:
- Spawn pulses when the player requests sonar.
- Fade pulses over time and stop when finished.
- Reveal walls near the pulse radius and fade them back out.
========================================
DEPENDENCIES:
- player: exposes intent.emitSonar and getX/getY.
- roomSystem: exposes getPlatforms() returning walls.
- config: SONAR.COOLDOWN_MS
========================================
USAGE:
import { createSonarSystem } from './sonarSystem.js';
const sonarSystem = createSonarSystem(player, () => roomSystem.getPlatforms());
engine.register(sonarSystem);
========================================
*/

import { SONAR } from '../config.js';

const RAY_COUNT = 360;
const RAY_SPEED = 0.22;
const RAY_DECAY = 0.22;
const RAY_LIFETIME = 255;

const REVEAL_BONUS = 70;
const REVEAL_FADE_PER_MS = 0.2;

function getNormalisedWalls(getWallsFinal) {
  const input = getWallsFinal?.() || [];
  return Array.isArray(input) ? input : (input?.platforms ?? []);
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

export function createSonarSystem(player, getWalls) {
  let pulses = [];
  const wallAlpha = new WeakMap();
  let cooldownTimer = 0;

  return {
    update(dt = 16) {
      if (cooldownTimer > 0) {
        cooldownTimer = Math.max(0, cooldownTimer - dt);
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
      const wallData = [];
      
      for (const wall of inputWalls) {
        const rect = readWallRect(wall);
        if (rect) {
          wallData.push({ wall, rect });  
        }
        
        const currentAlpha = wallAlpha.get(wall);
        if (currentAlpha != null) {
          const nextAlpha = Math.max(0, currentAlpha - (REVEAL_FADE_PER_MS * dt));
          if (nextAlpha <= 0) {
            wallAlpha.delete(wall);
          } else {
            wallAlpha.set(wall, nextAlpha);
          }
        }
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.update(dt, wallData, wallAlpha);

        if (p.isFinished()) {
          pulses.splice(i, 1);
        }
      }
    },

    draw() {
      if (!pulses.length) {
        return;
      }

      push();
      if (typeof blendMode === 'function' && typeof ADD !== 'undefined') {
        blendMode(ADD);
      }
      for (const p of pulses) {
        p.show();
      }
      pop();
    },

    getCooldownPercent() {
      if (cooldownTimer <= 0) {
        return 0;
      }
      return cooldownTimer / (SONAR.COOLDOWN_MS || 1);
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

  update(dt, wallData, wallAlpha) {
    for (const p of this.particles) {
      if (p.life <= 0) {
        continue;
      }

      p.life -= RAY_DECAY * dt;
      if (p.life <= 0) {
        continue;
      }

      const nextX = p.pos.x + p.vel.x * dt;
      const nextY = p.pos.y + p.vel.y * dt;
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