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
- Apply player-controlled movement intent (left / right / up / down)
- Trigger player actions (torch toggle) via input

DEPENDENCIES:
- player object: {x, y, w, h, vy, power}
- Input state (keyIsDown / keyPressed handlers)
- Power system for action gating (e.g. torch usage)

USAGE:
const playerSystem = createPlayerSystem(player);
engine.register(playerSystem);
========================================
NOTES:
- Player movement intent is applied before physics resolution
- Player system does not resolve collisions
========================================
TODO / LIMITATIONS:
- Horizontal movement has no acceleration or friction
- No advanced movement states yet
========================================
*/

//======================================
// PLAYER SYSTEM
//======================================

import { PLAYER, TIME } from '../config.js';

export function createPlayerSystem(player) {
  return {
    update() {
      // Apply drag each frame
      player.velocity.x *= PLAYER.DRAG;
      player.velocity.y *= PLAYER.DRAG;

      // Apply acceleration based on movement intent
      if (player.moveIntent.right) {
        player.velocity.x += PLAYER.ACCELERATION;
        player.facing = 1;
      }
      if (player.moveIntent.left) {
        player.velocity.x -= PLAYER.ACCELERATION;
        player.facing = -1;
      }
      if (player.moveIntent.up) {
        player.velocity.y -= PLAYER.ACCELERATION;
      }
      if (player.moveIntent.down) {
        player.velocity.y += PLAYER.ACCELERATION;
      }

      // Clamp velocity to max speed (MOVE_SPEED is px/sec, clamped per frame)
      const maxSpeed = PLAYER.MOVE_SPEED * TIME.fixedDeltaTime;
      player.velocity.x = constrain(player.velocity.x, -maxSpeed, maxSpeed);
      player.velocity.y = constrain(player.velocity.y, -maxSpeed, maxSpeed);

      // Bubble trail — spawn behind submarine when moving
      const isMoving = Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1;
      if (isMoving && Math.random() < 0.4) {
        const backX = player.position.x - player.facing * player.w * 0.8;
        player.bubbles.push({
          x: backX,
          y: player.position.y + (Math.random() * 8 - 4),
          size: 2 + Math.random() * 4,
          life: 200,
          vx: (Math.random() * 40 - 20),   // px/sec
          vy: -(30 + Math.random() * 50),   // px/sec upward
        });
      }

      // Update existing bubbles (drift upward + fade)
      for (let i = player.bubbles.length - 1; i >= 0; i--) {
        const b = player.bubbles[i];
        b.x += b.vx * TIME.fixedDeltaTime;
        b.y += b.vy * TIME.fixedDeltaTime;
        b.life -= 150 * TIME.fixedDeltaTime;
        if (b.life <= 0) {
          player.bubbles.splice(i, 1);
        }
      }
    },
  };
}

//======================================
// END
//======================================