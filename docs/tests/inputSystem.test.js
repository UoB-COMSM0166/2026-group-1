//======================================
// UNIT TESTS - INPUT SYSTEM
//======================================
/*
Tests for inputSystem.js — verifies intent flag setting,
key binding matching, and control mode switching.
*/

import { jest } from '@jest/globals';

// MUST mock before importing the system (ESM evaluation order)
jest.unstable_mockModule('../config.js', () => ({
  CONTROLS: {
    DEFAULT_MODE: 'default',
    MODES: {
      default: {
        MOVE_LEFT: 65,          // 'a'
        MOVE_RIGHT: 68,         // 'd'
        MOVE_UP: 87,            // 'w'
        MOVE_DOWN: 83,          // 's'
        TOGGLE_PAUSE: 27,       // Escape
        TOGGLE_WORKSHOP: 81,    // 'q'
        TOGGLE_TORCH: 32,       // Space
        SONAR: 70,              // 'f'
        LAUNCH_MISSILE: 82,     // 'r'
      },
      alternative: {
        MOVE_LEFT: 37,
        MOVE_RIGHT: 39,
        MOVE_UP: 38,
        MOVE_DOWN: 40,
        TOGGLE_PAUSE: 27,
        TOGGLE_WORKSHOP: 81,
        TOGGLE_TORCH: 32,
        SONAR: 70,
        LAUNCH_MISSILE: 82,
      },
    },
  },
}));

// Now import the system (mock is already registered)
const { createInputSystem } = await import('../systems/inputSystem.js');

//======================================
// HELPERS
//======================================

function makePlayer(overrides = {}) {
  return {
    moveIntent: { left: false, right: false, up: false, down: false },
    actionIntent: {
      togglePause: false,
      toggleWorkshop: false,
      toggleTorch: false,
      emitSonar: false,
      launchMissile: false,
    },
    ...overrides,
  };
}

describe('InputSystem', () => {
  let player;

  beforeEach(() => {
    player = makePlayer();
  });

  //======================================
  // CONTINUOUS MOVEMENT — keyIsDown
  //======================================

  describe('continuous movement intent', () => {
    it('sets moveIntent.left = true when left key code is held', () => {
      // keyIsDown(65) = true → left
      global.keyIsDown = (code) => code === 65;
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.left).toBe(true);
    });

    it('sets moveIntent.right = true when right key code is held', () => {
      global.keyIsDown = (code) => code === 68;
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.right).toBe(true);
    });

    it('sets moveIntent.up = true when up key code is held', () => {
      global.keyIsDown = (code) => code === 87;
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.up).toBe(true);
    });

    it('sets moveIntent.down = true when down key code is held', () => {
      global.keyIsDown = (code) => code === 83;
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.down).toBe(true);
    });

    it('all intent flags are false when no relevant keys are held', () => {
      global.keyIsDown = () => false;
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.left).toBe(false);
      expect(player.moveIntent.right).toBe(false);
      expect(player.moveIntent.up).toBe(false);
      expect(player.moveIntent.down).toBe(false);
    });

    it('multiple directions can be true simultaneously', () => {
      global.keyIsDown = (code) => [65, 68].includes(code);
      const input = createInputSystem(player);
      input.update();
      expect(player.moveIntent.left).toBe(true);
      expect(player.moveIntent.right).toBe(true);
    });

    it('intent persists across multiple update() calls while key is held', () => {
      global.keyIsDown = (code) => code === 65;
      const input = createInputSystem(player);
      input.update();
      input.update();
      input.update();
      expect(player.moveIntent.left).toBe(true);
    });

    it('intent clears on update() when key is released', () => {
      global.keyIsDown = (code) => code === 65;
      const input = createInputSystem(player);
      input.update();
      global.keyIsDown = () => false;
      input.update();
      expect(player.moveIntent.left).toBe(false);
    });
  });

  //======================================
  // DISCRETE ACTIONS — onKeyPressed
  //======================================

  describe('discrete action intent', () => {
    it('sets togglePause = true when Escape (27) is pressed', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('Escape', 27);
      expect(player.actionIntent.togglePause).toBe(true);
    });

    it('sets toggleWorkshop = true when Q (81) is pressed', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('q', 81);
      expect(player.actionIntent.toggleWorkshop).toBe(true);
    });

    it('sets toggleTorch = true when Space (32) is pressed', () => {
      const input = createInputSystem(player);
      input.onKeyPressed(' ', 32);
      expect(player.actionIntent.toggleTorch).toBe(true);
    });

    it('sets emitSonar = true when F (70) is pressed', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('f', 70);
      expect(player.actionIntent.emitSonar).toBe(true);
    });

    it('sets launchMissile = true when R (82) is pressed', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('r', 82);
      expect(player.actionIntent.launchMissile).toBe(true);
    });

    it('only sets the intent for the pressed key, not others', () => {
      const input = createInputSystem(player);
      input.onKeyPressed(' ', 32); // Space = toggleTorch
      expect(player.actionIntent.toggleTorch).toBe(true);
      expect(player.actionIntent.emitSonar).toBe(false);
      expect(player.actionIntent.togglePause).toBe(false);
    });

    it('is case-insensitive for letter keys', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('F', 70);
      expect(player.actionIntent.emitSonar).toBe(true);
    });

    it('unknown key does not set any action intent', () => {
      const input = createInputSystem(player);
      input.onKeyPressed('z', 90);
      expect(player.actionIntent.toggleTorch).toBe(false);
      expect(player.actionIntent.emitSonar).toBe(false);
      expect(player.actionIntent.togglePause).toBe(false);
    });
  });

  //======================================
  // CONTROL MODE SWITCHING
  //======================================

  describe('control mode switching', () => {
    it('defaults to DEFAULT_MODE on creation', () => {
      const input = createInputSystem(player);
      expect(input.getControlMode()).toBe('default');
    });

    it('changes to alternative mode via setControlMode', () => {
      const input = createInputSystem(player);
      input.setControlMode('alternative');
      expect(input.getControlMode()).toBe('alternative');
    });

    it('setControlMode ignores unknown mode names', () => {
      const input = createInputSystem(player);
      input.setControlMode('nonexistent');
      expect(input.getControlMode()).toBe('default');
    });

    it('returns to default mode when set to null', () => {
      const input = createInputSystem(player);
      input.setControlMode('alternative');
      input.setControlMode(null);
      expect(input.getControlMode()).toBe('default');
    });

    it('setControlMode(null) resets to DEFAULT_MODE even from any mode', () => {
      const input = createInputSystem(player);
      input.setControlMode('alternative');
      input.setControlMode(null);
      expect(input.getControlMode()).toBe('default');
    });
  });

  //======================================
  // EDGE CASES
  //======================================

  describe('edge cases', () => {
    it('handles missing moveIntent gracefully — update returns early', () => {
      const brokenPlayer = { actionIntent: { toggleTorch: false } };
      global.keyIsDown = () => false;
      const input = createInputSystem(brokenPlayer);
      expect(() => input.update()).not.toThrow();
      // moveIntent is missing, so nothing should change
    });

    it('handles missing actionIntent gracefully — onKeyPressed returns early', () => {
      const brokenPlayer = { moveIntent: { left: false, right: false, up: false, down: false } };
      const input = createInputSystem(brokenPlayer);
      expect(() => input.onKeyPressed(' ', 32)).not.toThrow();
      // actionIntent is missing, so nothing should change
    });

    it('multiple key presses set multiple intents', () => {
      const input = createInputSystem(player);
      input.onKeyPressed(' ', 32);
      input.onKeyPressed('f', 70);
      expect(player.actionIntent.toggleTorch).toBe(true);
      expect(player.actionIntent.emitSonar).toBe(true);
    });
  });

  //======================================
  // ARCHITECTURE BOUNDARY
  //======================================

  describe('architecture boundary compliance', () => {
    it('update() does not throw with any key state', () => {
      global.keyIsDown = () => true;
      const input = createInputSystem(player);
      expect(() => input.update()).not.toThrow();
    });

    it('onKeyPressed does not modify player.position or player.velocity', () => {
      const richPlayer = makePlayer({
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
      });
      const input = createInputSystem(richPlayer);
      input.onKeyPressed(' ', 32);
      expect(richPlayer.position.x).toBe(100);
      expect(richPlayer.velocity.x).toBe(0);
    });
  });
});
