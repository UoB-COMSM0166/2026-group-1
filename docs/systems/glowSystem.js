/*
========================================
VERSION: 1.1
SYSTEM: GLOW SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Detects player overlap with glow objects from the room's
  glow layer and manages per-object glow state.
- Activates a pulsing light and applies reduced knockback on contact.
- Glow state is stored directly on each object so the lighting and
  render systems can read it without coupling to this system.
- Uses the same AABB overlap logic and handlePlayerHit utility as
  resourceManagementSystem — no new collision system introduced.

NOTE: All objects in the 'glow' layer are treated as glow type.
The TSX tile property (type=glow) is a tileset annotation only
and is not exported onto object instances in the Tiled JSON.
========================================
*/

//======================================
// GLOW SYSTEM
//======================================
import { GLOW, TIME } from '../config.js';
import { handlePlayerHit } from '../utils/playerHitResponse.js';

const CONTACT_MARGIN = 2; // px — physics resolves 1px outside, so 2px catches flush contact

function overlapsPlayer(player, obj) {
  if (!player?.position || !obj) return false;
  const pw = (player.w ?? 16) + CONTACT_MARGIN * 2;
  const ph = (player.h ?? 16) + CONTACT_MARGIN * 2;
  const ow = obj.w ?? 0;
  const oh = obj.h ?? 0;
  if (!ow || !oh) return false;
  return (
    player.position.x + pw / 2 > obj.x - ow / 2 &&
    player.position.x - pw / 2 < obj.x + ow / 2 &&
    player.position.y + ph / 2 > obj.y - oh / 2 &&
    player.position.y - ph / 2 < obj.y + oh / 2
  );
}

function initGlowState(obj) {
  if (!obj._glow) {
    obj._glow = { intensity: GLOW.BASE_INTENSITY, lastKnockbackTime: null };
  }
}

function updateGlow(player, obj, soundSystem) {
  initGlowState(obj);
  const now = millis();
  const touching = overlapsPlayer(player, obj);

  if (touching) {
    const timeSinceLast = obj._glow.lastKnockbackTime != null
      ? now - obj._glow.lastKnockbackTime
      : Infinity;
    if (timeSinceLast >= GLOW.IFRAME_DURATION_MS) {
      handlePlayerHit(player, obj, GLOW);
      player.damageFlashColor = 'white';
      obj._glow.lastKnockbackTime = now;
      if (obj.gid === 33) {
        soundSystem?.play('bounce', 0.6);
      }
    }
    const pulse = GLOW.PULSE_AMPLITUDE * Math.sin((now / 1000) * GLOW.PULSE_SPEED * Math.PI * 2);
    obj._glow.intensity = Math.min(1, Math.max(0.75, 1 + pulse));

    // Charge player power while on active glow object (pulse state, not resting)
    if (obj._glow.intensity > GLOW.BASE_INTENSITY && player.power) {
      player.power.charge(GLOW.CHARGE_RATE);
    }
  } else {
    obj._glow.intensity = Math.max(GLOW.BASE_INTENSITY, obj._glow.intensity - GLOW.DECAY_RATE * TIME.fixedDeltaTime);
  }
}

export function createGlowSystem(player, getGlowObjects, soundSystem = null) {
  return {
    update() {
      const glowObjects = getGlowObjects?.() ?? [];
      for (const obj of glowObjects) {
        if (obj.visible === false) continue;
        updateGlow(player, obj, soundSystem);
      }
    },

    getGlowLights() {
      const glowObjects = getGlowObjects?.() ?? [];
      const lights = [];
      for (const obj of glowObjects) {
        if (!obj._glow) continue;
        const { intensity } = obj._glow;
        lights.push({
          kind: 'glow',
          x: obj.x,
          y: obj.y,
          radius: GLOW.BASE_RADIUS + intensity * (GLOW.ACTIVE_RADIUS - GLOW.BASE_RADIUS),
          intensity,
        });
      }
      return lights;
    },
  };
}
//======================================
// END
//======================================
