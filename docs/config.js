/*
========================================
CONFIGURATION FILE
========================================
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Central place for constants and tuning values
- Define MAGIC NUMBERS here
- Easy to adjust gameplay parameters

RULES:
- Only designer-tunable constants.
- Nothing mutable, no runtime state.
- If a value changes during play, it does NOT belong in config.
- If it is initial runtime state, it belongs in the class constructor.
========================================
*/

export const TIME = {
  fixedDeltaTime : 1 / 60,
}

//======================
// KEY CODES CONFIG
//======================
export const INPUT = {
  // MOVEMENT KEYS - function takes ascii
  // WASD ASCII
  W_KEY: 87,
  A_KEY: 65,
  S_KEY: 83,
  D_KEY: 68,
  // ARROW ASCII - can also use special keyCodes
  UP_ARROW_KEY: 38,
  DOWN_ARROW_KEY: 40,
  LEFT_ARROW_KEY:  37,
  RIGHT_ARROW_KEY: 39,
  
  // ACTION KEYS - functions take strings
  TOGGLE_TORCH_KEY: ['L', 'l'],
  SONAR_KEY: ['E', 'e']
};

//======================
// MAIN CANVAS CONFIG
//======================
/* For a 2D pixel art platformer, a pixel grid is the standard for tilesets
and level design. 32x32 or 16x16 tiles. These sizes work best with 16:9 aspect ratios, supporting
clean scaling for modern resolutions like 640x360 or 1920x1080
Base Resolution: Use 640x360 as a base resolution for 16:9
then scale up, rather than designing in native 1080p*/
export const CANVAS = {
  WIDTH: 1920,
  HEIGHT: 1080,

  TILE_SIZE: 16
};

//======================
// DISPLAY CONFIG
//======================
/* The game canvas is displayed at DISPLAY resolution by default (1920x1080).
   Dev resolution matches the internal game resolution for side-by-side use. */
export const DISPLAY = {
  WIDTH: 1920,
  HEIGHT: 1080,
  DEV_WIDTH: 640,
  DEV_HEIGHT: 360,
};

//======================
// PLAYER CONFIG
//======================
export const PLAYER = {
  WIDTH: CANVAS.TILE_SIZE,
  HEIGHT: CANVAS.TILE_SIZE,
  SIZE: CANVAS.TILE_SIZE,
  START_X: CANVAS.TILE_SIZE,
  START_Y: CANVAS.TILE_SIZE,
  MAX_SPEED : 200,
  ACCELERATION: 10,
  FRICTION : 0.1
};

//======================
// POWER CONFIG
//======================
export const POWER = {
  MAX_POWER: 100,
  CURRENT_POWER: 100,
  LOW_POWER_THRESHOLD: 0.15
  
};

//======================
// TORCH CONFIG
//======================
export const TORCH = {
  RADIUS: 100,
  FLICKER_POWER_THRESHOLD: 0.15,
  DRAIN_RATE: 1
};

//======================
// LIGHTING CONFIG
//======================
export const LIGHTING = {
  PLAYER_AMBIENT: {
    radius: 30,
    brightness: 0.2
  }
};

//======================
// SONAR CONFIG
//======================
export const SONAR = {
  // Normalized cooldown units consumed by sonarSystem.
  COOLDOWN: 1,
  COOLDOWN_MS: 1
};

//======================
// GAME CONFIG
//======================
export const GAME = {
  FPS : 75,
};


//======================
// HITBOX DEBUG
//======================
export const DEBUG_COLOR = {
  DRAW : false,
  WALL : "wall",
  PLAYER : "player",
  ENEMY : "enemy",
}
