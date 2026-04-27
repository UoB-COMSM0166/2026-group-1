//======================================
// UNIT TESTS - GLOW SYSTEM
//======================================
/*
Tests for glowSystem.js — verifies glow object activation on player contact,
intensity pulsing, decay, and knockback handling.
*/

import { jest } from '@jest/globals';

// Mock p5 millis
let mockMillis = 1000;
global.millis = jest.fn(() => mockMillis);

// Mock config
jest.unstable_mockModule('../config.js', () => ({
  GLOW: {
    BASE_RADIUS: 30,
    ACTIVE_RADIUS: 72,
    BASE_INTENSITY: 0.3,
    DECAY_RATE: 1.8,
    PULSE_SPEED: 2.5,
    PULSE_AMPLITUDE: 0.12,
    KNOCKBACK_STRENGTH: 160,
    KNOCKBACK_LIFT: 50,
    IFRAME_DURATION_MS: 800,
    DAMAGE_FLASH_DURATION_MS: 300,
  },
  TIME: { fixedDeltaTime: 1 / 60 },
}));

// Mock playerHitResponse to avoid complex knockback logic
jest.unstable_mockModule('../utils/playerHitResponse.js', () => ({
  handlePlayerHit: jest.fn(),
}));

const { createGlowSystem } = await import('../systems/glowSystem.js');

describe('GlowSystem', () => {
  let mockPlayer;
  let mockHandlePlayerHit;

  beforeEach(async () => {
    mockMillis = 1000;
    mockPlayer = {
      position: { x: 100, y: 100 },
      w: 32,
      h: 16,
      damageFlashColor: null,
    };
    const phr = await import('../utils/playerHitResponse.js');
    mockHandlePlayerHit = phr.handlePlayerHit;
    mockHandlePlayerHit.mockClear();
  });

  function makeGlowObject(x, y, w = 16, h = 16, overrides = {}) {
    return {
      x,
      y,
      w,
      h,
      visible: true,
      _glow: null,
      ...overrides,
    };
  }

  describe('initialization and baseline state', () => {
    it('creates a glow system without throwing', () => {
      expect(() => createGlowSystem(mockPlayer, () => [])).not.toThrow();
    });

    it('system update does not throw with no glow objects', () => {
      const glow = createGlowSystem(mockPlayer, () => []);
      expect(() => glow.update()).not.toThrow();
    });
  });

  describe('glow object far from player (no overlap)', () => {
    it('does not increase intensity for far objects (stays at base)', () => {
      const farObject = makeGlowObject(1000, 1000); // far away — no overlap possible
      const glow = createGlowSystem(mockPlayer, () => [farObject]);
      glow.update();
      // _glow is initialized (initGlowState always sets it), but intensity stays at BASE
      expect(farObject._glow.intensity).toBe(0.3); // BASE_INTENSITY
    });
  });

  describe('glow object near player (overlap detected)', () => {
    it('initializes _glow state on first overlap', () => {
      // Object overlaps player: at (100, 100) with size 16, player at (100, 100) with size 32
      // Contact margin adds 2*2=4 to player size: player becomes 36x20
      // Object is 16x16 centered at (100, 100) → object range: x=[92,108], y=[92,108]
      // Player center at (100, 100) → player range: x=[82,118], y=[90,110]
      // They overlap!
      const overlappingObject = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [overlappingObject]);
      glow.update();
      expect(overlappingObject._glow).not.toBeNull();
      expect(overlappingObject._glow.intensity).toBeGreaterThan(0);
    });

    it('sets damageFlashColor on player when overlapping', () => {
      const overlappingObject = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [overlappingObject]);
      glow.update();
      expect(mockPlayer.damageFlashColor).toBe('white');
    });

    it('calls handlePlayerHit when overlapping', () => {
      const overlappingObject = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [overlappingObject]);
      glow.update();
      expect(mockHandlePlayerHit).toHaveBeenCalledWith(
        mockPlayer,
        overlappingObject,
        expect.objectContaining({ KNOCKBACK_STRENGTH: 160 })
      );
    });

    it('skips invisible objects (_glow is not initialized)', () => {
      const invisibleObject = makeGlowObject(100, 100, 16, 16, { visible: false });
      const glow = createGlowSystem(mockPlayer, () => [invisibleObject]);
      glow.update();
      expect(invisibleObject._glow).toBeNull();
    });
  });

  describe('intensity pulsing while touching', () => {
    it('intensity pulses while player is touching', () => {
      const obj = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [obj]);

      glow.update();
      const intensity1 = obj._glow.intensity;

      // Advance time and update again
      mockMillis += 200; // 200ms later
      glow.update();
      const intensity2 = obj._glow.intensity;

      // Intensity should have changed (pulsing)
      expect(intensity2).not.toBe(intensity1);
      // Both should be in valid range [0.75, 1.0] roughly
      expect(intensity1).toBeGreaterThan(0.7);
      expect(intensity2).toBeGreaterThan(0.7);
    });
  });

  describe('intensity decay when player moves away', () => {
    it('intensity decays when player is no longer overlapping', () => {
      // Start overlapping
      const obj = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [obj]);
      glow.update();
      const intensityWhileTouching = obj._glow.intensity;

      // Move player far away
      mockPlayer.position = { x: 9999, y: 9999 };
      mockMillis += 500; // advance time
      glow.update();
      const intensityAfter = obj._glow.intensity;

      // After moving away, intensity should decay toward BASE_INTENSITY (0.3)
      expect(intensityAfter).toBeLessThan(intensityWhileTouching);
    });

    it('intensity does not decay below BASE_INTENSITY', () => {
      const obj = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(mockPlayer, () => [obj]);

      // Touch then move away
      glow.update();
      mockPlayer.position = { x: 9999, y: 9999 };
      // Run many updates to let decay fully apply
      for (let i = 0; i < 100; i++) glow.update();

      expect(obj._glow.intensity).toBeGreaterThanOrEqual(0.28); // ~BASE_INTENSITY (0.3)
    });
  });

  describe('multiple glow objects', () => {
    it('handles multiple glow objects in the list', () => {
      const obj1 = makeGlowObject(100, 100, 16, 16);
      const obj2 = makeGlowObject(200, 200, 16, 16); // far from player
      const obj3 = makeGlowObject(110, 110, 16, 16); // slightly overlapping
      const glow = createGlowSystem(mockPlayer, () => [obj1, obj2, obj3]);
      expect(() => glow.update()).not.toThrow();
      // obj1 and obj3 should have _glow (nearby), obj2 should not
      expect(obj1._glow).not.toBeNull();
      expect(obj3._glow).not.toBeNull();
    });
  });

  describe('null/undefined getGlowObjects callback', () => {
    it('handles null getGlowObjects gracefully', () => {
      const glow = createGlowSystem(mockPlayer, null);
      expect(() => glow.update()).not.toThrow();
    });

    it('handles getGlowObjects returning null', () => {
      const glow = createGlowSystem(mockPlayer, () => null);
      expect(() => glow.update()).not.toThrow();
    });

    it('handles empty glow object list', () => {
      const glow = createGlowSystem(mockPlayer, () => []);
      expect(() => glow.update()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles object with no w/h properties', () => {
      const badObj = { x: 100, y: 100 }; // missing w, h
      const glow = createGlowSystem(mockPlayer, () => [badObj]);
      expect(() => glow.update()).not.toThrow();
    });

    it('handles player with unusual w/h', () => {
      const weirdPlayer = {
        position: { x: 100, y: 100 },
        w: 0, // zero dimensions
        h: 0,
        damageFlashColor: null,
      };
      const obj = makeGlowObject(100, 100, 16, 16);
      const glow = createGlowSystem(weirdPlayer, () => [obj]);
      expect(() => glow.update()).not.toThrow();
    });
  });
});
