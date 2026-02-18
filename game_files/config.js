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
  JUMP_KEY: [87, 38],
  TOGGLE_TORCH_KEY: ['L', 'l']
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
  WIDTH: 640,
  HEIGHT: 360,

  TILE_SIZE: 16
};

//======================
// PLAYER CONFIG
//======================
export const PLAYER = {
  WIDTH: CANVAS.TILE_SIZE,
  HEIGHT: CANVAS.TILE_SIZE,
  START_X: CANVAS.TILE_SIZE * 2,
  START_Y: CANVAS.TILE_SIZE,
  JUMP_POWER: 25,
  MOVE_SPEED: 5,
  FALL_SPEED: 2
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
  RADIUS: 200,
  FLICKER_POWER_THRESHOLD: 0.15,
  DRAIN_RATE: 1
};

//======================
// GAME CONFIG
//======================
export const GAME = {
  GROUND_Y: CANVAS.HEIGHT - CANVAS.TILE_SIZE * 1.25
};

//======================
// TILE TYPE CONFIG
//======================
export const TILE_TYPE = {
  0: 'empty', // water
  1: 'rock'
};
