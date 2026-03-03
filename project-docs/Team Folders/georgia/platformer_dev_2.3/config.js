/*
========================================
CONFIGURATION FILE
========================================
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
  // WASD
  A_KEY: 65,
  D_KEY: 68,
  S_KEY: 83,
  // ARROWS
  LEFT_KEY:  37,
  RIGHT_KEY: 39,
  
  // ACTION KEYS - functions take strings
  JUMP_KEY: ['W', 'w'],
  TOGGLE_TORCH_KEY: ['L', 'l']
};

//======================
// MAIN CANVAS CONFIG
//======================
export const CANVAS = {
  WIDTH: 800,
  HEIGHT: 512
};

//======================
// PLAYER CONFIG
//======================
export const PLAYER = {
  WIDTH: 30,
  HEIGHT: 70,
  START_X: 400,
  START_Y: 10,
  JUMP_POWER: 25,
  MOVE_SPEED: 5,
  FALL_SPEED: 2
};

//======================
// POWER CONFIG
//======================
export const POWER = {
  MAX_POWER: 200,
  CURRENT_POWER: 1,
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
  GROUND_Y: 429
};
