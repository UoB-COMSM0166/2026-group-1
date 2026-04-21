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
import { TIME } from '../config.js';

const CRAB_CONTACT_PENALTY = 4;  // burst drain on touch
const CRAB_DRAIN_RATE = 1.0;     // continuous drain while touching
const JELLYFISH_CONTACT_PENALTY = 9;
const JELLYFISH_DRAIN_RATE = 1.0;

export function createEnemySystem(player, getEnemies) {
  const contactSet = new Set();
  let crabs = [];
  let jellyfish = [];
  let sourceEnemiesRef = null;
  const fixedDtSeconds = TIME.fixedDeltaTime;

  // syncng crab instances with current room enemy objects.
  function syncEnemies() {
    const raw = (getEnemies ? getEnemies() : []) ?? [];
    if (raw === sourceEnemiesRef) return;
 
    sourceEnemiesRef = raw;
    crabs = [];
    jellyfish = [];
 
    for (const e of raw) {
      if (e.name === 'crab') {
        crabs.push(new Crab(e.x, e.y, e.w, e.h, e.patrolDistance, e.speed));
      } else if (e.name === 'jellyfish') {
        const variant = e.variant || 'default';
        const jelly = variant === 'default'
          ? new Jellyfish(e.x, e.y, e.w, e.h, e.amplitude, e.frequency, e.driftSpeed)
          : Jellyfish.createVariant(variant, e.x, e.y);
        jellyfish.push(jelly);
      }
    }
    
    contactSet.clear();
  }

  function updateCrab(crab) {
    const speed = Number(crab.speed) || 0;
    const patrolDistance = Math.max(0, Number(crab.patrolDistance) || 0);
    const step = speed * fixedDtSeconds;
    if (crab.pendingDestroy) return;

    crab.previousPos.x = crab.position.x;
    crab.previousPos.y = crab.position.y;

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

    crab.nextPos.x = crab.position.x;
    crab.nextPos.y = crab.position.y;
  }

  function updateJellyfish(jelly) {
    if (jelly.pendingDestroy) return;

    jelly.previousPos.x = jelly.position.x;
    jelly.previousPos.y = jelly.position.y;
 
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

    jelly.nextPos.x = jelly.position.x;
    jelly.nextPos.y = jelly.position.y;
  }

  function checkPlayerContact(enemy, contactPenalty, drainRate) {
    if (isColliding(enemy, player)) {
      if (!contactSet.has(enemy)) {
        player.power.current = Math.max(0, player.power.current - contactPenalty);
        contactSet.add(enemy);
      }
      player.power.drain(drainRate);
    } else {
      contactSet.delete(enemy);
    }
  }

  return {
    update() {
      syncEnemies();
      for (let i = crabs.length - 1; i >= 0; i--) {
        if (crabs[i].pendingDestroy) {
          crabs.splice(i, 1);
        }
      }

      // Clean up dead jellyfish
      for (let i = jellyfish.length - 1; i >= 0; i--) {
        if (jellyfish[i].pendingDestroy) {
          jellyfish.splice(i, 1);
        }
      }
      for (const crab of crabs) {
        updateCrab(crab);
        checkPlayerContact(crab, CRAB_CONTACT_PENALTY, CRAB_DRAIN_RATE);
      }

      for (let i = jellyfish.length - 1; i >= 0; i--) {
        if (jellyfish[i].pendingDestroy) jellyfish.splice(i, 1);
      }

      for (const jelly of jellyfish) {
        updateJellyfish(jelly);
        checkPlayerContact(jelly, JELLYFISH_CONTACT_PENALTY, JELLYFISH_DRAIN_RATE);
      }
    },
 
    getCrabs() {
      return crabs;
    },

    getJellyfish() {
      return jellyfish;
    },

    getEnemies() {
      return [...crabs, ...jellyfish];
    }
  };
}
