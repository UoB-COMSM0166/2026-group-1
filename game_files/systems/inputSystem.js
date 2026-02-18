/*
========================================
VERSION: 2.4
SYSTEM: INPUT SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Captures player input and converts it into intent flags
- Input system separates user actions from game logic

RULES:
- Must not directly modify game state
- Must not contain gameplay logic
- Must not perform rendering
- Only updates intent for other systems to consume
========================================
DESIGN GOALS:
- Decouple input handling from player and game logic
- Provide a simple interface for reading input states
- Enable continuous and discrete actions via intent flags
========================================
RESPONSIBILITIES:
- Listen for keyboard events (keyPressed, keyIsDown)
- Update player intent object with left/right movement
- Update player intent for discrete actions (jump, toggle torch)

DEPENDENCIES:
- Browser keyboard events (p5.js keyIsDown / keyPressed)
- Player object with `intent` and `onGround` properties

USAGE:
import { createInputSystem } from './inputSystem.js';

const inputSystem = createInputSystem(player);
engine.register(inputSystem);
========================================
NOTES:
- Intent represents desired actions, not execution
- Continuous actions (movement) use keyIsDown
- Discrete actions (jump, toggleTorch) use keyPressed
- Other systems (playerSystem, torchSystem) act on intent flags
========================================
TODO / LIMITATIONS:
- No key remapping or gamepad support yet
- Only handles keyboard input
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
      const leftKey = INPUT.A_KEY;
      const rightKey = INPUT.D_KEY;
      player.intent.left = keyIsDown(leftKey) || keyIsDown(INPUT.LEFT_ARROW_KEY);
      player.intent.right = keyIsDown(rightKey) || keyIsDown(INPUT.RIGHT_ARROW_KEY);
    },

    onKeyPressed(key, keyCodeValue) {
      const keyLower = typeof key === 'string' ? key.toLowerCase() : '';
      const jumpPressed = INPUT.JUMP_KEY.includes(keyCodeValue) || keyLower === 'w';

      if (jumpPressed && player.onGround) {
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
