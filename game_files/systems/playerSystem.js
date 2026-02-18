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

//======================
// PLAYER SYSTEM
//======================
import { PLAYER } from '../config.js';

export function createPlayerSystem(player) {
  // returning object literals → commas between entries
  return {
    update(deltaTime) {
      const speed = PLAYER.MOVE_SPEED;
      if (player.intent?.left) player.x -= speed;
      if (player.intent?.right) player.x += speed;

      if (player.intent?.jump && player.onGround) {
        player.vy = -player.jumpPower;
        player.onGround = false;
      }
      if (player.intent) player.intent.jump = false;
    },
  };
}
//======================================
// END
//======================================
