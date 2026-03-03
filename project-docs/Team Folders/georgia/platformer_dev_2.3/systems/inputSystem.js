/*
========================================
VERSION: 2.2
SYSTEM: INPUT SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Input System: Captures user input and translates it into
  player intent

RULES:
- Input system does not modify game state directly
- Input system does not contain game logic
- Input system does not perform rendering
========================================
DESIGN GOALS:
- Decouple input handling from gameplay logic
- Allow controls to be remapped easily
- Prevent input from directly mutating physics or resources
========================================
RESPONSIBILITIES:
- Listen for input events (keyboard)
- Track current input state (pressed / held)
- Expose player intent to other systems

DEPENDENCIES:
- Browser input events (keyPressed, keyIsDown)
- Player system or action handlers

USAGE:
const inputSystem = createInputSystem(player);
engine.register(inputSystem);
========================================
NOTES:
- Input represents intent, not behaviour
- Continuous actions (movement) use keyIsDown
- Discrete actions (jump, toggle) use keyPressed
- Actual effects are applied by other systems
========================================
TODO / LIMITATIONS:
- No key remapping support yet
- Keyboard-only input (no gamepad)
========================================
*/

//======================================
// INPUT SYSTEM
//======================================
/* Intent only, shouldn't directly manipulate anything */

import { INPUT } from '../config.js'

export function createInputSystem(player) {
  return {
    update() {
      const leftKey = INPUT.A_KEY ?? 65;
      const rightKey = INPUT.D_KEY ?? 68;
      player.intent.left = keyIsDown(leftKey) || keyIsDown(INPUT.LEFT_KEY);
      player.intent.right = keyIsDown(rightKey) || keyIsDown(INPUT.RIGHT_KEY);
    },

    onKeyPressed(key) {
      if (INPUT.JUMP_KEY.includes(key) && player.onGround) {
        player.intent.jump = true;
      }

      if (INPUT.TOGGLE_TORCH_KEY.includes(key)) {
        player.intent.toggleTorch = true;
      }
    }
  };
}
//======================================
// END
//======================================
