/*
=======================================
VERSION: 3.0
SYSTEM: ENEMY SYSTEM
AUTHOR: Monal Gupta
DESCRIPTION:
- Updates crab patrol movement and jelly fish sin-wave motion
- Drains power on touch
========================================
*/

import { isColliding } from './hitboxSystem.js';
import { Crab } from '../entities/crab.js';
import { Jellyfish } from '../entities/jellyfish.js';
import { TIME, JELLYFISH_GLOW } from '../config.js';
import { Piranha } from '../entities/piranha.js';

const CRAB_CONTACT_PENALTY = 4;  // burst drain on touch
const CRAB_DRAIN_RATE = 1.0;     // continuous drain while touching
const JELLYFISH_CONTACT_PENALTY = 9;
const JELLYFISH_DRAIN_RATE = 1.0;

const RETURN_THRESHOLD = 6;
const RETURN_SPEED_MULT = 0.6;
const CHASE_DURATION_FRAMES = 180;

export function createEnemySystem(player, getEnemies, getActivePulses, soundSystem = null, particleSystem = null) {
  const contactSet = new Set();
  let crabs = [];
  let jellyfish = [];
  let piranhas = [];
  let sourceEnemiesRef = null;
  const fixedDtSeconds = TIME.fixedDeltaTime;

  // syncng crab instances with current room enemy objects.
  function syncEnemies() {
    const raw = (getEnemies ? getEnemies() : []) ?? [];
    if (raw === sourceEnemiesRef) return;

    sourceEnemiesRef = raw;
    crabs = [];
    jellyfish = [];
    piranhas = [];

    for (const e of raw) {
      if (e.name === 'crab') {
        const p = getProps(e);

        const patrolDistance = p.patrolDistance ?? 64;
        const speed = p.speed ?? 100;
        const patrolAxis = p.patrolAxis ?? 'horizontal';
        const spriteDirection = p.spriteDirection ?? 'down';

        crabs.push(new Crab(
          e.x,
          e.y,
          e.width,
          e.height,
          patrolDistance,
          speed,
          patrolAxis,
          spriteDirection
        ));
      } else if (e.name === 'jellyfish') {
        const variant = e.variant || 'default';
        const jelly = variant === 'default'
          ? new Jellyfish(
            e.x,
            e.y,
            e.w,
            e.h,
            e.amplitude,
            e.frequency,
            e.driftSpeed)
          : Jellyfish.createVariant(variant, e.x, e.y);
        jellyfish.push(jelly);
      } else if (e.name === 'piranha') {
        const detectionRadius = e.detectionRadius ?? 120;
        const chaseSpeed = e.chaseSpeed ?? 0.6;
        piranhas.push(new Piranha(e.x,
          e.y,
          e.w, 
          e.h,
          detectionRadius, 
          chaseSpeed));
      }
    }

    contactSet.clear();
  }


  function getProps(e) {
    const result = {};

    const props = e.properties;

    if (!props) return result;
    //redering tiles was having error so i added two cases
    //case 1: array format - how tiled is as of now in json
    if (Array.isArray(props)) {
      for (const p of props) {
        result[p.name] = p.value;
      }
      return result;
    }

    //case 2: already object format
    if (typeof props === 'object') {
      for (const key in props) {
        result[key] = props[key];
      }
    }

    return result;
  }

  function updateCrab(crab) {

    const speed = Number(crab.speed) || 0;
    const patrolDistance = Math.max(0, Number(crab.patrolDistance) || 0);
    const step = speed * fixedDtSeconds;
    if (crab.pendingDestroy) return;

    crab.previousPos.x = crab.position.x;
    crab.previousPos.y = crab.position.y;

    if (crab.patrolAxis === 'vertical') {
      let nextY = crab.position.y + crab.direction * step;
      const minY = crab.spawnY - patrolDistance;
      const maxY = crab.spawnY + patrolDistance;

      if (nextY > maxY) {
        nextY = maxY;
        crab.direction = -1;
      }
      if (nextY < minY) {
        nextY = minY;
        crab.direction = 1;
      }

      crab.position.y = nextY;
    } else {
      let nextX = crab.position.x + crab.direction * step;
      const minX = crab.spawnX - patrolDistance;
      const maxX = crab.spawnX + patrolDistance;

      if (nextX > maxX) {
        nextX = maxX;
        crab.direction = -1;
        crab.facing = -1;

      }
      if (nextX < minX) {
        nextX = minX;
        crab.direction = 1;
        crab.facing = 1;
      }

      crab.position.x = nextX;
    }

    crab.nextPos.x = crab.position.x;
    crab.nextPos.y = crab.position.y;
  }


  function updateJellyfish(jelly) {
    if (jelly.pendingDestroy) return;
    jelly.previousPos.x = jelly.position.x;
    jelly.previousPos.y = jelly.position.y;

    if (!jelly.trail) jelly.trail = [];
    jelly.trail.unshift({ x: jelly.position.x, y: jelly.position.y });
    if (jelly.trail.length > 4) jelly.trail.length = 4;

    jelly.time += fixedDtSeconds * jelly.frequency;
    jelly.pulsePhase = jelly.time;

    const yOffset = Math.sin(jelly.time) * jelly.amplitude;
    jelly.position.y = jelly.spawnY + yOffset;

    if (jelly.driftSpeed > 0) {
      jelly.driftDistance += jelly.driftDirection * jelly.driftSpeed * fixedDtSeconds * 60;

      // Reverse drift at boundaries
      if (Math.abs(jelly.driftDistance) > jelly.maxDrift) {
        jelly.driftDirection *= -1;
        jelly.driftDistance = Math.sign(jelly.driftDistance) * jelly.maxDrift;
      }

      jelly.position.x = jelly.spawnX + jelly.driftDistance;
    }

    // Body glow height — driven by the same signal that animates tentacle stretch
    const tentacleSignal = Math.abs(Math.sin(jelly.time));
    const targetGlowH = JELLYFISH_GLOW.BODY_MIN_RADIUS + tentacleSignal * JELLYFISH_GLOW.BODY_HEIGHT_RANGE;
    if (jelly.glowHeight === null || jelly.glowHeight === undefined) {
      jelly.glowHeight = targetGlowH;
    } else {
      jelly.glowHeight += (targetGlowH - jelly.glowHeight) * JELLYFISH_GLOW.BODY_LERP;
    }

    jelly.nextPos.x = jelly.position.x;
    jelly.nextPos.y = jelly.position.y;
  }

  function checkSonarTrigger(piranha, cx, cy, activePulses) {
    const r = piranha.detectionRadius;

    for (const pulse of activePulses) {
      for (const particle of pulse.particles) {
        if (particle.life <= 0) continue;

        const dx = particle.pos.x - cx;
        const dy = particle.pos.y - cy;

        if (dx * dx + dy * dy <= r * r) {
          return true;
        }
      }
    }

    return false;
  }

  function updatePiranha(piranha, player, activePulses) {
    piranha.previousPos.x = piranha.position.x;
    piranha.previousPos.y = piranha.position.y;

    const px = piranha.position.x;
    const py = piranha.position.y;

    if (piranha.state === 'idle') {
      piranha.bobTime += 0.05 * piranha.bobFrequency;
      const bobOffset = Math.sin(piranha.bobTime) * piranha.bobAmplitude;

      piranha.position.x = piranha.spawnX;
      piranha.position.y = piranha.spawnY + bobOffset;

      const triggered = checkSonarTrigger(piranha, px, py, activePulses);
      if (triggered) {
        piranha.state = 'chase';
        piranha.chaseTimer = CHASE_DURATION_FRAMES;
      }

    } else if (piranha.state === 'chase') {
      // chasing player
      const playerCX = player.x;
      const playerCY = player.y;

      const dx = playerCX - px;
      const dy = playerCY - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        const nx = dx / dist;
        const ny = dy / dist;
        piranha.position.x += nx * piranha.chaseSpeed;
        piranha.position.y += ny * piranha.chaseSpeed;

        piranha.facing = nx >= 0 ? 1 : -1;
      }

      piranha.chaseTimer--;
      if (piranha.chaseTimer <= 0) {
        piranha.state = 'return';
        piranha.chaseEndTime = performance.now();
      }

    } else if (piranha.state === 'return') {
      const dx = piranha.spawnX - piranha.position.x;
      const dy = piranha.spawnY - piranha.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RETURN_THRESHOLD) {
        piranha.position.x = piranha.spawnX;
        piranha.position.y = piranha.spawnY;
        piranha.bobTime = Math.random() * Math.PI * 2;
        piranha.state = 'idle';
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        const returnSpeed = piranha.chaseSpeed * RETURN_SPEED_MULT;
        piranha.position.x += nx * returnSpeed;
        piranha.position.y += ny * returnSpeed;

        piranha.facing = nx >= 0 ? 1 : -1;
      }
    }

    piranha.nextPos.x = piranha.position.x;
    piranha.nextPos.y = piranha.position.y;
  }

  function checkPlayerContact(enemy, contactPenalty, drainRate) {
    if (isColliding(enemy, player)) {
      if (!contactSet.has(enemy)) {
        player.power.current = Math.max(0, player.power.current - contactPenalty);
        contactSet.add(enemy);
        soundSystem?.play('playerHit', 0.2);
      }
      player.power.drain(drainRate);
    } else {
      contactSet.delete(enemy);
    }
  }

  function checkPiranhaContact(piranha) {
    if (isColliding(piranha, player)) {
      if (!contactSet.has(piranha)) {
        player.power.current = Math.max(0, player.power.current - CRAB_CONTACT_PENALTY);
        piranha.hitGlowTime = performance.now();
        contactSet.add(piranha);
        soundSystem?.play('playerHit', 0.2);
      }
      player.power.drain(CRAB_DRAIN_RATE);
    } else {
      contactSet.delete(piranha);
    }
  }

  function checkJellyfishContact(jelly) {
    if (isColliding(jelly, player)) {
      if (!contactSet.has(jelly)) {
        if (Math.random() < 0.5) {
          player.power.current = Math.max(0, player.power.current - JELLYFISH_CONTACT_PENALTY);
          jelly.hitFlashType = 'drain';
        } else {
          player.power.current = Math.min(player.power.maxPower, player.power.current + JELLYFISH_CONTACT_PENALTY);
          jelly.hitFlashType = 'gain';
        }
        jelly.hitFlashTime = performance.now();
        contactSet.add(jelly);
        soundSystem?.play('playerHit', 0.2);
      }
      player.power.drain(JELLYFISH_DRAIN_RATE);
    } else {
      contactSet.delete(jelly);
    }
  }

  return {
    update() {
      syncEnemies();
      for (let i = crabs.length - 1; i >= 0; i--) {
        if (crabs[i].pendingDestroy) {
          particleSystem?.emitBurst(crabs[i].x, crabs[i].y, 'enemy');
          crabs.splice(i, 1);
        }
      }


      for (const crab of crabs) {
        updateCrab(crab);
        checkPlayerContact(crab, CRAB_CONTACT_PENALTY, CRAB_DRAIN_RATE);
      }

      for (let i = jellyfish.length - 1; i >= 0; i--) {
        if (jellyfish[i].pendingDestroy) {
          particleSystem?.emitBurst(jellyfish[i].x, jellyfish[i].y, 'enemy');
          jellyfish.splice(i, 1);
        }
      }

      for (const jelly of jellyfish) {
        updateJellyfish(jelly);
        checkJellyfishContact(jelly);
      }

      for (let i = piranhas.length - 1; i >= 0; i--) {
        if (piranhas[i].pendingDestroy) {
          particleSystem?.emitBurst(piranhas[i].x, piranhas[i].y, 'enemy');
          piranhas.splice(i, 1);
        }
      }

      for (const piranha of piranhas) {
        updatePiranha(piranha, player, getActivePulses ? getActivePulses() : []);
        checkPiranhaContact(piranha);
      }
    },

    getCrabs() {
      return crabs;
    },

    getJellyfish() {
      return jellyfish;
    },

    getPiranhas() {
      return piranhas;
    },

    getEnemies() {
      return [...crabs, ...jellyfish, ...piranhas];
    },

    getPiranhaLights() {
      const lights = [];
      const now = performance.now();
      for (const p of piranhas) {
        if (p.pendingDestroy) continue;

        if (p.state === 'chase') {
          const pulse = 0.32 + 0.12 * Math.abs(Math.sin(now / 350));
          lights.push({ kind: 'piranhaChase', x: p.position.x, y: p.position.y, radius: 22, intensity: pulse, piranhaColor: 'red' });
        } else {
          const chaseStrength = Math.max(0, 1 - (now - (p.chaseEndTime ?? -Infinity)) / 1500);
          const hitStrength   = Math.max(0, 1 - (now - (p.hitGlowTime   ?? -Infinity)) / 800);
          const blueStrength  = Math.max(chaseStrength, hitStrength);
          if (blueStrength > 0) {
            const pulse = 0.28 + 0.10 * Math.abs(Math.sin(now / 400));
            lights.push({ kind: 'piranhaChase', x: p.position.x, y: p.position.y, radius: 22, intensity: blueStrength * pulse, piranhaColor: 'blue' });
          }
        }
      }
      return lights;
    },

    getJellyfishLights() {
      const lights = [];
      for (const j of jellyfish) {
        if (j.pendingDestroy) continue;
        const t = j.time || 0;
        const offset = j.cycleOffset ?? 0;

        // Bidirectional pulse matching GLOW tile style (2.5 Hz)
        const pulseSin = Math.sin(t * Math.PI * 2 * JELLYFISH_GLOW.PULSE_SPEED);
        const flicker  = Math.sin(t * JELLYFISH_GLOW.FLICKER_SPEED) * JELLYFISH_GLOW.FLICKER_STRENGTH;
        const glowPulse = 0.5 + 0.5 * pulseSin;  // 0–1 for gradient use
        const intensity = Math.max(0, JELLYFISH_GLOW.BASE_INTENSITY + pulseSin * JELLYFISH_GLOW.PULSE_VARIATION + flicker);

        // Head and body cycle through the palette independently
        const headT = ((t / JELLYFISH_GLOW.HEAD_CYCLE_S) + offset) % 1;
        const bodyT = ((t / JELLYFISH_GLOW.BODY_CYCLE_S) + offset + JELLYFISH_GLOW.BODY_PHASE_OFFSET) % 1;

        const hitAge = performance.now() - (j.hitFlashTime ?? -Infinity);
        const hitFlash = Math.max(0, 1 - hitAge / 600);
        const hitPulse = hitFlash > 0 ? hitFlash * Math.abs(Math.sin(hitAge / 80 * Math.PI)) : 0;
        const boostedIntensity = Math.min(2.0, intensity + hitPulse * 1.5);

        lights.push({
          kind: 'jellyfishHead',
          x: j.position.x,
          y: j.position.y - (j.h ?? 22) * 0.375,
          radius: JELLYFISH_GLOW.HEAD_RADIUS,
          intensity: boostedIntensity,
          glowPulse: Math.min(1, glowPulse + hitPulse),
          cycleT: headT,
          hitFlash,
          hitFlashType: j.hitFlashType ?? 'drain',
        });
        const bodyH = j.glowHeight ?? JELLYFISH_GLOW.BODY_MIN_RADIUS;
        lights.push({
          kind: 'jellyfishBody',
          x: j.position.x,
          y: j.position.y + (j.h ?? 22) * 0.15,
          radius: bodyH,
          aspect: JELLYFISH_GLOW.BODY_HALF_WIDTH / bodyH,
          intensity: Math.min(2.0, intensity * 0.65 + hitPulse * 0.8),
          glowPulse: Math.min(1, glowPulse * 0.7 + hitPulse * 0.5),
          cycleT: bodyT,
          hitFlash,
        });
      }
      return lights;
    },
  };
}
