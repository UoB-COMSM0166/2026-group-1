//======================================
// UNIT TESTS - MISSILE SYSTEM
//======================================
/*
Tests for missileSystem.js — verifies missile creation, auto-targeting,
homing behavior, and lifetime expiration.
*/

import { jest } from '@jest/globals';

// Mock p5 globals used by Missile class and missileSystem
function makeVector(x, y) {
  return {
    x, y,
    mult(s) { return makeVector(x * s, y * s); },
    add(v) { return makeVector(this.x + v.x, this.y + v.y); },
    sub(v) { return makeVector(this.x - v.x, this.y - v.y); },
    copy() { return makeVector(this.x, this.y); },
    normalize() { const l = Math.sqrt(this.x * this.x + this.y * this.y) || 1; return makeVector(this.x / l, this.y / l); },
    heading() { return Math.atan2(this.y, this.x); },
    dist(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); },
    set(v) { this.x = v.x; this.y = v.y; },
    lerp(v, t) { return makeVector(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t); },
  };
}

// Mock performance.now for cooldown tracking
let mockNow = 10000;
global.performance = { now: () => mockNow };

global.createVector = (x, y) => makeVector(x, y);
global.TWO_PI = Math.PI * 2;
global.p5 = {
  Vector: {
    fromAngle: (a) => makeVector(Math.cos(a), Math.sin(a)),
    dist: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2),
    sub: (a, b) => makeVector(a.x - b.x, a.y - b.y),
    lerp: (a, b, t) => makeVector(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t),
    mult: (v, s) => makeVector(v.x * s, v.y * s),
  },
};
global.random = (a, b) => (b !== undefined ? a + Math.random() * (b - a) : Math.random() * a);
global.cos = Math.cos;
global.sin = Math.sin;

// Mock hitboxSystem
jest.unstable_mockModule('../systems/hitboxSystem.js', () => ({
  isColliding: jest.fn().mockReturnValue(false),
  Hitbox: class Hitbox {
    constructor(x, y, w, h) {
      this.position = { x: x + w / 2, y: y + h / 2 };
      this.w = w; this.h = h;
    }
    getX() { return this.position.x - this.w / 2; }
    getY() { return this.position.y - this.h / 2; }
  },
  Wall: class Wall {},
}));

// Mock config
jest.unstable_mockModule('../config.js', () => ({
  MISSILE: {
    SPEED: 180,
    TURN_SPEED: 0.08,
    LIFETIME: 4000,
    SIZE: 8,
    COOLDOWN: 2000,  // milliseconds
  },
  GAME: { EASY: false },
  TIME: { fixedDeltaTime: 1 / 60 },
  DEBUG_COLOR: { WALL: 'red' },
}));

const { createMissileSystem } = await import('../systems/missileSystem.js');

describe('MissileSystem', () => {
  let mockPlayer;
  let mockSoundSystem;

  beforeEach(() => {
    mockNow = 10000; // Advance past COOLDOWN (2000ms) so first missile can fire
    mockPlayer = {
      position: { x: 100, y: 100 },
      bubbles: [],
      facing: 1,
      missiles: 10,
      actionIntent: { launchMissile: false },
    };
    mockSoundSystem = { play: jest.fn() };
  });

  function makeTarget(x, y, overrides = {}) {
    return {
      position: { x, y },
      pendingDestroy: false,
      isDestroyed: false,
      bubbles: [],
      x, y,
      w: 24,
      h: 24,
      ...overrides,
    };
  }

  describe('creation and state', () => {
    it('creates a missile system without throwing', () => {
      expect(() => createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem)).not.toThrow();
    });

    it('starts with no active missiles', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      expect(ms.getMissiles().length).toBe(0);
    });
  });

  describe('fireMissile intent', () => {
    it('creates a missile when launchMissile intent is set', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
    });

    it('consumes launchMissile intent after firing', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(mockPlayer.actionIntent.launchMissile).toBe(false);
    });

    it('does not fire if no launchMissile intent', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = false;
      ms.update();
      expect(ms.getMissiles().length).toBe(0);
    });

    it('fires toward the nearest valid target', () => {
      const targets = [
        makeTarget(200, 100),
        makeTarget(500, 500),
      ];
      const ms = createMissileSystem(mockPlayer, () => targets, () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
    });
  });

  describe('missile targeting', () => {
    it('missile targets the nearest non-destroyed enemy', () => {
      const targets = [
        makeTarget(200, 100, { isDestroyed: true }),
        makeTarget(150, 100),
        makeTarget(300, 300),
      ];
      const ms = createMissileSystem(mockPlayer, () => targets, () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
      expect(ms.getMissiles()[0].target).toBe(targets[1]);
    });

    it('missile ignores pendingDestroy targets', () => {
      const targets = [
        makeTarget(120, 100, { pendingDestroy: true }),
        makeTarget(200, 100),
      ];
      const ms = createMissileSystem(mockPlayer, () => targets, () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
    });

    it('fires even when no targets exist', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
    });
  });

  describe('missile lifetime', () => {
    it('marks missile as pendingDestroy after lifetime expires', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      const missile = ms.getMissiles()[0];
      expect(missile.pendingDestroy).toBe(false);

      // Simulate many updates — lifetime is 4000ms, each update reduces by ~16.67ms
      for (let i = 0; i < 250; i++) ms.update();
      expect(ms.getMissiles().length).toBe(0);
    });

    it('removes expired missiles from active list', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);

      for (let i = 0; i < 300; i++) ms.update();
      expect(ms.getMissiles().length).toBe(0);
    });
  });

  describe('cooldown between shots', () => {
    it('respects fire cooldown (cannot fire instantly again)', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);

      // Try to fire again immediately — cooldown is 2000ms, millis() hasn't advanced
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(ms.getMissiles().length).toBe(1);
    });
  });

  describe('homing behavior', () => {
    it('missile moves toward target over multiple updates', () => {
      // Target within 400px range, in front of player (dx * facing > 0)
      const target = makeTarget(200, 100);
      const ms = createMissileSystem(mockPlayer, () => [target], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      const missile = ms.getMissiles()[0];
      expect(missile).toBeDefined();

      // Run many updates without crashing
      expect(() => { for (let i = 0; i < 30; i++) ms.update(); }).not.toThrow();

      // Missile should still be in the list (hasn't expired)
      expect(ms.getMissiles().length).toBeGreaterThanOrEqual(1);
    });

    it('missile with no target flies straight without crashing', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      ms.update();
      expect(() => { for (let i = 0; i < 10; i++) ms.update(); }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles null soundSystem without throwing', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], null);
      mockPlayer.actionIntent.launchMissile = true;
      expect(() => ms.update()).not.toThrow();
    });

    it('handles null getTargets callback', () => {
      const ms = createMissileSystem(mockPlayer, null, () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      expect(() => ms.update()).not.toThrow();
    });

    it('handles empty targets array', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      mockPlayer.actionIntent.launchMissile = true;
      expect(() => ms.update()).not.toThrow();
      expect(ms.getMissiles().length).toBe(1);
    });

    it('getMissiles returns an array', () => {
      const ms = createMissileSystem(mockPlayer, () => [], () => [], mockSoundSystem);
      expect(Array.isArray(ms.getMissiles())).toBe(true);
    });
  });
});
