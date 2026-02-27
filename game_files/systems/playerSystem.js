/*
========================================
VERSION: 2.4
SYSTEM: PLAYER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Player System: Manages player entity state and intent-based movement

RULES:
- Player system does not handle physics or collisions
- Player system does not perform rendering outside its draw hook
- Player system must not directly modify other systems
========================================
DESIGN GOALS:
- Keep player logic separate from physics resolution
- Treat input as intent, not direct movement
- Maintain clean boundaries between systems
========================================
RESPONSIBILITIES:
- Maintain player positional and state data
- Apply player-controlled movement intent (left / right)
- Trigger player actions (jump, torch toggle) via input

DEPENDENCIES:
- player object: {x, y, w, h, vy, onGround, power}
- Input state (keyIsDown / keyPressed handlers)
- Power system for action gating (e.g. torch usage)

USAGE:
const playerSystem = createPlayerSystem(player);
engine.register(playerSystem);
========================================
NOTES:
- Player movement intent is applied before physics resolution
- Jump logic depends on onGround state set by Physics System
- Player system does not resolve collisions
========================================
TODO / LIMITATIONS:
- Horizontal movement has no acceleration or friction
- No advanced movement states yet
========================================
*/

import { PLAYER } from '../config.js';

export function createPlayerSystem(player) {
  return {

    update(deltaTime) {
      const acceleration = PLAYER.ACCELERATION;

      // Horizontal/vertical movement 
      if (player.intent?.left) player.vx -= acceleration;
      if (player.intent?.right) player.vx += acceleration;
      if (player.intent?.up) player.vy -= acceleration;
      if (player.intent?.down) player.vy += acceleration;

      // Update facing direction based on horizontal velocity
      if (player.vx > 0) player.facing = 1;
      else if (player.vx < 0) player.facing = -1;

      // --- Bubble trail management ---
      // Spawn bubbles behind the submarine when moving
      const isMoving = Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1;
      if (isMoving && Math.random() < 0.4) {
        const backX = player.x - player.facing * player.size * 0.8;
        player.bubbles.push({
          x: backX,
          y: player.y + (Math.random() * 8 - 4),
          size: 2 + Math.random() * 4,
          life: 200,
          vx: (Math.random() * 0.04 - 0.02),
          vy: -(0.03 + Math.random() * 0.05),
        });
      }

      // Update existing bubbles (drift upward + fade)
      for (let i = player.bubbles.length - 1; i >= 0; i--) {
        const b = player.bubbles[i];
        b.x += b.vx * deltaTime;
        b.y += b.vy * deltaTime;
        b.life -= 0.15 * deltaTime;
        if (b.life <= 0) {
          player.bubbles.splice(i, 1);
        }
      }
    },
  };
}
