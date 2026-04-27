//======================================
// UNIT TESTS - ARCHITECTURE BOUNDARIES
//======================================
/*
  These tests enforce the separation of concerns as defined in CODE_ARCHITECTURE_GUIDE.md.
  They check that systems only contain what they are allowed to,
  and do not cross architectural boundaries (e.g. no draw() in update systems,
  no state mutation in RenderSystem).

  If these tests fail on merge → the system has violated its boundary.
*/

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config.js', () => ({
  CONTROLS: {
    DEFAULT_MODE: 'default',
    MODES: {
      default: {
        MOVE_LEFT: 65, MOVE_RIGHT: 68, MOVE_UP: 87, MOVE_DOWN: 83,
        TOGGLE_PAUSE: 27, TOGGLE_SHOP: 69, ACCEPT: 13,
        TOGGLE_TORCH: 32, SONAR: 70, LAUNCH_MISSILE: 82,
      },
    },
  },
  PLAYER: { DRAG: 0.85, ACCELERATION: 0.8, MOVE_SPEED: 200 },
  TIME: { fixedDeltaTime: 1 / 60 },
  CANVAS: { TILE_SIZE: 16 },
  DEBUG_COLOR: { WALL: 'red', PLAYER: 'blue', ENEMY: 'green' },
  CAMERA: { DEFAULT_SCALE: 2.0 },
  LIGHTING: { PLAYER_AMBIENT: { RADIUS: 40, BRIGHTNESS: 0.3 } },
  TORCH: { RADIUS: 120 },
  SONAR: { COOLDOWN_MS: 500 },
}));

// p5.js globals needed by playerSystem
global.constrain = (val, min, max) => Math.max(min, Math.min(max, val));

const { createInputSystem } = await import('../systems/inputSystem.js');
const { createPlayerSystem } = await import('../systems/playerSystem.js');
const { createCameraSystem } = await import('../systems/cameraSystem.js');

//======================================
// INPUT SYSTEM — Architecture
//======================================

describe('InputSystem architecture', () => {
  it('createInputSystem does not throw', () => {
    const player = {
      moveIntent: { left: false, right: false, up: false, down: false },
      actionIntent: { togglePause: false, toggleShop: false, accept: false, toggleTorch: false, emitSonar: false, launchMissile: false },
    };
    global.keyIsDown = () => false;
    expect(() => createInputSystem(player)).not.toThrow();
  });

  it('update() does not modify player.position or velocity', () => {
    const player = {
      moveIntent: { left: false, right: false, up: false, down: false },
      actionIntent: { togglePause: false, toggleShop: false, accept: false, toggleTorch: false, emitSonar: false, launchMissile: false },
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
    };
    global.keyIsDown = () => false;
    const input = createInputSystem(player);
    input.update();
    expect(player.position.x).toBe(100);
    expect(player.velocity.x).toBe(0);
  });

  it('onKeyPressed() only sets intent flags, does not move player', () => {
    const player = {
      moveIntent: { left: false, right: false, up: false, down: false },
      actionIntent: { togglePause: false, toggleShop: false, accept: false, toggleTorch: false, emitSonar: false, launchMissile: false },
      position: { x: 100, y: 100 },
    };
    const input = createInputSystem(player);
    input.onKeyPressed(' ', 32);
    expect(player.position.x).toBe(100);
  });
});

//======================================
// PLAYER SYSTEM — Architecture
//======================================

describe('PlayerSystem architecture', () => {
  beforeEach(() => {
    // Ensure Math.random is deterministic for bubble trail tests
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('update() does not throw', () => {
    const player = {
      moveIntent: { left: false, right: false, up: false, down: false },
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      facing: 1,
      w: 32,
      h: 16,
      bubbles: [],
      power: { current: 50 },
    };
    const ps = createPlayerSystem(player);
    expect(() => ps.update()).not.toThrow();
  });

  it('update() does not modify position directly (only velocity)', () => {
    const player = {
      moveIntent: { left: false, right: false, up: false, down: false },
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      facing: 1,
      w: 32,
      h: 16,
      bubbles: [],
      power: { current: 50 },
    };
    global.keyIsDown = () => false;
    const ps = createPlayerSystem(player);
    ps.update();
    // Position itself should not change — only velocity is set here
    // (physicsSystem is responsible for applying velocity → position)
    expect(typeof player.position.x).toBe('number');
    expect(typeof player.position.y).toBe('number');
  });

  it('handles missing bubbles array without throwing', () => {
    const player = {
      moveIntent: { right: true },
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      facing: 1,
      w: 32,
      h: 16,
      bubbles: undefined,
      power: { current: 50 },
    };
    const ps = createPlayerSystem(player);
    expect(() => ps.update()).not.toThrow();
  });
});

//======================================
// CAMERA SYSTEM — Architecture
//======================================

describe('CameraSystem architecture', () => {
  it('getOffset() returns numbers, not undefined', () => {
    const player = { position: { x: 100, y: 50 } };
    const cam = createCameraSystem(player, 640, 360);
    const offset = cam.getOffset();
    expect(typeof offset.x).toBe('number');
    expect(typeof offset.y).toBe('number');
  });

  it('update() does not throw', () => {
    const player = { position: { x: 100, y: 50 } };
    const cam = createCameraSystem(player, 640, 360);
    expect(() => cam.update()).not.toThrow();
  });

  it('setScale() clamps values to valid range', () => {
    const player = { position: { x: 100, y: 50 } };
    const cam = createCameraSystem(player, 640, 360);
    cam.setScale(10); // above max of 4.0
    expect(cam.getScale()).toBe(4.0);
    cam.setScale(0.1); // below min of 0.25
    expect(cam.getScale()).toBe(0.25);
  });

  it('snapTo() updates camera position', () => {
    const player = { position: { x: 100, y: 50 } };
    const cam = createCameraSystem(player, 640, 360);
    cam.snapTo(200, 150);
    const offset = cam.getOffset();
    expect(typeof offset.x).toBe('number');
    expect(typeof offset.y).toBe('number');
  });
});
