/*
========================================
VERSION: 2.4
ENTITY: PLAYER
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Player entity class: stores player state, movement intent, and components
- Manages internal resources like torch and power

RULES:
- Player class does not handle physics or collision resolution
- Player class does not render itself; rendering is handled by renderSystem
- Player class does not directly manipulate other systems
========================================
DESIGN GOALS:
- Keep player logic separate from physics and rendering
- Treat input as intent (left/right/jump/toggleTorch), not direct movement
- Encapsulate components like Torch and PowerSystem cleanly
========================================
RESPONSIBILITIES:
- Maintain player positional and state data (x, y, w, h, vy, onGround)
- Maintain runtime resources (power, torch, health, oxygen)
- Store and expose player intent for systems to consume

DEPENDENCIES:
- config object: defines START_X, START_Y, WIDTH, HEIGHT, JUMP_POWER, TORCH settings
- PowerSystem for tracking energy usage (e.g., torch drain)
- Torch class for player-held light source

USAGE:
import { Player } from './entities/player.js';
const player = new Player(PLAYER_CONFIG);
engine.register(playerSystem); // playerSystem consumes this class
========================================
*/


//======================
// PLAYER CLASS
//======================
import { PowerSystem } from '../systems/powerSystem.js';
import { Torch } from './components/torch.js';  // torch class in same folder
import { TORCH } from '../config.js';

export class Player {
   constructor(config) {
      // Config-driven defaults
      this.x = config.START_X;
      this.y = config.START_Y;
      this.w = config.WIDTH;
      this.h = config.HEIGHT;

      // Runtime state
      this.vy = 0;
      this.jumpPower = config.JUMP_POWER;
      this.onGround = false;

      this.intent = {
         left: false,
         right: false,
         jump: false,
         toggleTorch: false,
      };

      // component
      this.torch = new Torch(config.TORCH ?? TORCH);

      // Runtime resources
      this.power = new PowerSystem();
      this.health = null;
      this.oxygen = null;
   }
};
//======================================
// END
//======================================
