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
// TIME CONFIG
//======================
// 
export const TIME = {
  fixedDeltaTime : 1 / 60,
}

//======================
// GAME CONFIG
//======================
export const GAME = {
  FPS : 75,
};

//======================
// RENDER CONFIG
//======================
export const RENDER = {
  // Debug visuals from room object layers (does not affect gameplay logic/collisions).
  SHOW_TRIGGER_AND_ENTITY_VISUALS: false,
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
// CAMERA CONFIG
//======================
export const CAMERA = {
  // < 1.0 zooms out, > 1.0 zooms in
  DEFAULT_SCALE: 2.0,
  /*
   DEFAULT_SCALE: 3   (visible area: 640x360)   - very zoomed in
   DEFAULT_SCALE: 2.5 (visible area: 768x432)
   DEFAULT_SCALE: 2   (visible area: 960x540)   - balanced, world feels large, player not too small
   DEFAULT_SCALE: 1.5 (visible area: 1280x720)
   DEFAULT_SCALE: 1   (visible area: 1920x1080) - fully zoomed out, player feels small
*/                   
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
// GAMEPLAY OVERLAY CONFIG
//======================
export const GAMEPLAY_OVERLAY = {
  ENABLED: false,
  CENTER_ON_SCREEN: true, // When true, overlay is centered before offsets are applied
  OFFSET_X: 0,
  OFFSET_Y: 30,
  SCALE_X: 1.15,
  SCALE_Y: 1.19,
  OPACITY: 255,
};

//======================
// MINIMAP CONFIG
//======================
export const MINIMAP = {
  ZOOM: 2,
  PLAYER_MARKER_TILE_SCALE: 1.25,

  // Absolute minimap center in screen space. Set to null to use top-right fallback.
  CENTER_X: 960,
  CENTER_Y: 895,

  // Effective radius = DIAL_RADIUS - DIAL_INSET. Keeps minimap clear of bottom row.
  DIAL_RADIUS: 118,
  DIAL_INSET: 8,
};

//======================
// HUD DIALS CONFIG
//======================
export const HUD_DIALS = {
  POWER_X: 700,
  POWER_Y: 895,
  SONAR_X: 1220,
  SONAR_Y: 895,

  // Base dial diameter in pixels.
  BASE_SIZE: 92,

  // Per-dial scale multipliers.
  POWER_SCALE: 1.3,
  SONAR_SCALE: 1.3,

  // Bottom row: upgrade bars + missile dots
  // Left group (POWER, SONAR) centred at LEFT_GROUP_X, right group (TORCH, MISSILES) at RIGHT_GROUP_X.
  // GROUP_SPACING is the distance between the two items within each group.
  BOTTOM_ROW_Y: 1008,
  BOTTOM_ROW_LABEL_Y: 1031,
  BOTTOM_ROW_LEFT_GROUP_X: 700,
  BOTTOM_ROW_RIGHT_GROUP_X: 1220,
  BOTTOM_ROW_GROUP_SPACING: 180,
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
  STARTING_SCRAP: 0,
  MOVE_SPEED: 200,        // Pixels per second (scaled by TIME.fixedDeltaTime per frame)
  ACCELERATION: 4,        // Velocity increase per frame
  DRAG: 0.9  ,            // Higher = less friction (0.9-0.95 feels good)
  SNEAK_SPEED_MULT: 0.4,  // Movement speed multiplier when sneaking (hold Shift)
  BOUNCE_DAMPING: 0.5,    // Velocity kept after bounce (0.5 = half speed)
  MIN_VELOCITY: 0.1,      // Stop if slower than this
};

//======================
// POWER CONFIG
//======================
export const POWER = {
  MAX_POWER: 100,
  CURRENT_POWER: 60,   // starts at 60% of max — upgrades push this higher
  LOW_POWER_THRESHOLD: 0.15,
  DRAIN_RATE: 0.5,
  UPGRADE_MAX_POWER_BONUS: 20,  // extra capacity per upgrade level
  /*
   (Tested Options)
      DRAIN_RATE: 1             
      (100 power = 100s| 1 power = 1s) - very fast
      DRAIN_RATE: 0.6667 ~[2/3] 
      (100 power = 150s| 1 power = 1.5s) - fast
      DRAIN_RATE: 0.5           
      (100 power = 200s| 1 power = 2s) - feels balanced
      DRAIN_RATE: 0.333 ~[1/3] 
      (100 power = 300s| 1 power = 3s) - slow
      DRAIN_RATE: 0.25          
      (100 power = 400s| 1 power = 4s) - very slow
   
   (Total drain calculation: rate * TIME.fixedDeltaTime per frame)
      Torch OFF	DRAIN_RATE × TIME.fixedDeltaTime per frame
      Torch ON	DRAIN_RATE × TORCH.DRAIN_RATE × TIME.fixedDeltaTime per frame
*/
  
};

//======================
// TORCH CONFIG
//======================
export const TORCH = {
  RADIUS: 100,
  UPGRADE_RADIUS_BONUS: 22,
  MIN_RADIUS_WHEN_DRAINED: 50,
  FLICKER_SPEED: 0.5,
  FLICKER_POWER_THRESHOLD: 0.15,
  BLACKOUT_POWER_THRESHOLD: 0.10,
  GENTLE_INTENSITY_RANGE: 0.15,
  DYING_INTENSITY_RANGE: 0.65,
  SPUTTER_BASE_THRESHOLD: 0.12,
  SPUTTER_SCALING: 0.18,
  BURST_BASE_THRESHOLD: 0.18,
  BURST_SCALING: 0.42,
  DRAIN_RATE: 1
};

//======================
// MISSILE CONFIG
//======================
export const MISSILE = {
  WIDTH: 8,
  HEIGHT: 8,
  SPEED: 150, //pixels per second
  TURN_SPEED: 5,
  COOLDOWN: 2000, //milliseconds
  LIFETIME: 3000,
  SIZE: 6, //pixels
  MAX_DISTANCE: 2000,
  TARGET_RADIUS: 150,
  MAX_CONCURRENT: 5
};

//======================
// LIGHTING CONFIG
//======================
export const LIGHTING = {
  PLAYER_AMBIENT: {
    RADIUS: PLAYER.WIDTH * 2.5, // looks best, doesnt make easy
    BRIGHTNESS: 0.2
  }
};

//======================
// JELLYFISH BIOLUMINESCENT GLOW CONFIG
//======================
export const JELLYFISH_GLOW = {
  HEAD_RADIUS: 18,         // tight dome glow radius (world px)
  BODY_MIN_RADIUS: 25,     // contracted height radius (world px)
  BODY_HEIGHT_RANGE: 18,   // max additional height when tentacles are fully extended
  BODY_HALF_WIDTH: 17,     // horizontal half-extent — constant regardless of height
  BODY_LERP: 0.08,         // smoothing rate — low value = sluggish water-drag feel
  BASE_INTENSITY: 0.32,    // resting brightness
  PULSE_SPEED: 1.2,        // Hz — matches GLOW tile pulse style
  PULSE_VARIATION: 0.15,   // ± brightness swing
  HEAD_CYCLE_S: 12.0,       // seconds for head to complete one colour cycle
  BODY_CYCLE_S: 14.0,       // seconds for body (slower, feels heavier)
  BODY_PHASE_OFFSET: 0.35, // body lags head by this palette fraction
  FLICKER_SPEED: 13.7,     // fast, non-harmonic micro-shimmer on core
  FLICKER_STRENGTH: 0.025,
};

//======================
// GLOW INTERACTABLE CONFIG
//======================
export const GLOW = {
  BASE_RADIUS: 30,         // resting light radius (px)
  ACTIVE_RADIUS: 72,       // peak light radius when activated (px)
  BASE_INTENSITY: 0.3,     // resting brightness (always emitted)
  DECAY_RATE: 1.8,         // intensity lost per second after contact ends (back to base)
  PULSE_SPEED: 2.5,        // Hz of brightness pulse while active
  PULSE_AMPLITUDE: 0.12,   // ±intensity variation during pulse
  KNOCKBACK_STRENGTH: 160, // weaker than COMBAT (400)
  KNOCKBACK_LIFT: 50,
  IFRAME_DURATION_MS: 800,
  DAMAGE_FLASH_DURATION_MS: 300,
  CHARGE_RATE: 2,              // power units per second charged while on active glow object
};

//======================
// SONAR CONFIG
//======================
export const SONAR = {
  // Cooldown in seconds for readability; derived ms used by sonarSystem
  COOLDOWN: 4.5,       // seconds at level 1
  COOLDOWN_MS: 4500,  // milliseconds at level 1
  // Base pulse travel range in pixels (at level 1)
  BASE_RANGE: 250,
  // Additional range pixels added per upgrade level
  RANGE_BONUS_PER_LEVEL: 50,
};

//======================
// COMBAT CONFIG
//======================
export const COMBAT = {
  /*
   Knockback is applied as: normDir * KNOCKBACK_STRENGTH * TIME.fixedDeltaTime (px/frame).
   Must satisfy: KNOCKBACK_STRENGTH * TIME.fixedDeltaTime * DRAG > ACCELERATION so the hit
   pushes the player away even when pressing back toward the hazard.
   PLAYER.ACCELERATION = 4, PLAYER.DRAG = 0.9 → minimum threshold ≈ 267.
  */
  KNOCKBACK_STRENGTH: 400,
  KNOCKBACK_LIFT: 100,
  IFRAME_DURATION_MS: 800, // Minimum ms between consecutive hits; prevents rapid repeated damage

  // How long (ms) the red damage flash is visible — independent of i-frame duration
  DAMAGE_FLASH_DURATION_MS: 300,

  // (optional: default for centralised damage via PlayerHitResponse util)
  HIT_DAMAGE: 10, // (not in use!) all damage set to this default
};

//======================
// DIFFICULTY CONFIG
//======================
export const DIFFICULTY = {
  easy: {
    POWER_PICKUP:    10,
    SCRAP_PICKUP:  100,
    POWER_DRAIN:    0.5,  // 0.5/s torch off: ~200s (~3m 20s)
    TORCH_DRAIN:    1.75, // 0.5 × 1.75 = 0.875/s torch on: ~114s (~1m 54s)
  },
  hard: {
    POWER_PICKUP:    5,
    SCRAP_PICKUP:  50,
    POWER_DRAIN:    0.75, // 0.75/s torch off: ~133s (~2m 13s)
    TORCH_DRAIN:    2.0,  // 0.75 × 2.0 = 1.5/s torch on: ~67s (~1m 7s)
  },
};

//======================
// CONTROLS CONFIG
//======================
// KEY LABEL UTILITY
//======================
// Converts a raw binding value to a short human-readable label for UI display.
export function keyLabel(binding) {
  if (typeof binding === 'string') return binding.toUpperCase();
  const names = {
    16:  'Shift',
    27:  'ESC',
    32:  'Space',
    37:  '←',
    38:  '↑',
    39:  '→',
    40:  '↓',
    65:  'A',
    66:  'B',
    68:  'D',
    69:  'E',
    70:  'F',
    67:  'C',
    81:  'Q',
    83:  'S',
    87:  'W',
    72:  'H',
    192: '`',
  };
  return names[binding] ?? `#${binding}`;
}

//======================
// Each mode is a complete, independently customisable key map.
// Number values are matched against keyCode; string values against key.toLowerCase().
export const CONTROLS = {
  DEFAULT_MODE: 'wasd', // 'wasd' | 'arrows'

  MODES: {
   /* Ergnomic one handed set-up */
    wasd: {
      MOVE_UP:      87,    // W
      MOVE_DOWN:    83,    // S
      MOVE_LEFT:    65,    // A
      MOVE_RIGHT:   68,    // D
      TOGGLE_TORCH: 70,    // F
      SONAR:        69,    // E
      LAUNCH_MISSILE: 32,  // Space
      TOGGLE_PAUSE:      27,    // Escape
      TOGGLE_WORKSHOP:       81,    // Q
      TOGGLE_FULLSCREEN: 192,   // Backtick
      SNEAK:             16,    // Shift
      TOGGLE_CONTROLS:   67,    // C
    },
    /* Arrow-keys option for movement */
    arrows: {
      MOVE_UP:      38,    // Up arrow
      MOVE_DOWN:    40,    // Down arrow
      MOVE_LEFT:    37,    // Left arrow
      MOVE_RIGHT:   39,    // Right arrow
      TOGGLE_TORCH: 70,    // F
      SONAR:        69,    // E
      LAUNCH_MISSILE: 32,  // Space
      TOGGLE_PAUSE:      27,    // Escape
      TOGGLE_WORKSHOP:       81,    // Q
      TOGGLE_FULLSCREEN: 192,   // Backtick
      SNEAK:             16,    // Shift
      TOGGLE_CONTROLS:   67,    // C
    },
  },
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
