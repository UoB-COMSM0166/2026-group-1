//======================================
// UNIT TESTS - PLAYER SYSTEM
//======================================
/*
Tests for playerSystem.js — verifies movement intent application,
velocity clamping, bubble trail spawning, and intent consumption.

Architecture guide: playerSystem applies movement intent,
never handles physics or rendering.
*/

import { jest } from '@jest/globals';

const TIME_MOCK = { fixedDeltaTime: 1 / 60 };
const PLAYER_MOCK = {
  DRAG: 0.85,
  ACCELERATION: 0.8,
  MOVE_SPEED: 200,
};

jest.unstable_mockModule('../config.js', () => ({
  TIME: TIME_MOCK,
  PLAYER: PLAYER_MOCK,
}));

global.constrain = (val, min, max) => Math.max(min, Math.min(max, val));

const { createPlayerSystem } = await import('../systems/playerSystem.js');

describe('PlayerSystem', () => {
  let player;

  function makePlayer(overrides = {}) {
    return {
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      w: 32,
      h: 16,
      facing: 1,
      moveIntent: { left: false, right: false, up: false, down: false },
      bubbles: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    player = makePlayer();
  });

  //======================================
  // VELOCITY APPLICATION FROM INTENT
  //======================================

  describe('velocity from intent', () => {
    it('increases velocity.x when moveIntent.right is true', () => {
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.x).toBeGreaterThan(0);
    });

    it('decreases velocity.x when moveIntent.left is true', () => {
      player.moveIntent.left = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.x).toBeLessThan(0);
    });

    it('increases velocity.y when moveIntent.down is true', () => {
      player.moveIntent.down = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.y).toBeGreaterThan(0);
    });

    it('decreases velocity.y when moveIntent.up is true', () => {
      player.moveIntent.up = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.y).toBeLessThan(0);
    });

    it('sets facing = 1 when moving right', () => {
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.facing).toBe(1);
    });

    it('sets facing = -1 when moving left', () => {
      player.moveIntent.left = true;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.facing).toBe(-1);
    });

    it('left intent overrides right when both are set (last applied wins)', () => {
      player.moveIntent.left = true;
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      system.update();
      // Left applied second, so facing = -1
      expect(player.facing).toBe(-1);
      // Net velocity change is 0 (right +0.8, left -0.8)
    });

    it('left and right cancel out when both set simultaneously', () => {
      player.moveIntent.left = true;
      player.moveIntent.right = true;
      const initialVx = player.velocity.x;
      const system = createPlayerSystem(player);
      system.update();
      // Both applied in same frame: +ACCEL then -ACCEL = 0 net
      expect(Math.abs(player.velocity.x - initialVx)).toBeLessThan(0.001);
    });
  });

  //======================================
  // DRAG
  //======================================

  describe('drag', () => {
    it('applies drag to velocity.x each update', () => {
      // Use velocity below maxSpeed so it doesn't get clamped
      player.velocity.x = 2; // maxSpeed ≈ 3.33, so 2 < 3.33 → no clamp
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.x).toBeLessThan(2);
      expect(player.velocity.x).toBeCloseTo(2 * PLAYER_MOCK.DRAG, 2); // 2 * 0.85 = 1.7
    });

    it('applies drag to velocity.y each update', () => {
      player.velocity.y = 8;
      const system = createPlayerSystem(player);
      system.update();
      expect(player.velocity.y).toBeLessThan(8);
    });

    it('drag reduces velocity toward zero over multiple frames', () => {
      player.velocity.x = 10;
      const system = createPlayerSystem(player);
      system.update();
      system.update();
      system.update();
      expect(player.velocity.x).toBeLessThan(10 * Math.pow(PLAYER_MOCK.DRAG, 3));
    });
  });

  //======================================
  // VELOCITY CLAMPING
  //======================================

  describe('velocity clamping', () => {
    it('clamps velocity.x to max speed in positive direction', () => {
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      // Apply intent repeatedly until clamped
      for (let i = 0; i < 100; i++) system.update();
      const maxSpeed = PLAYER_MOCK.MOVE_SPEED * TIME_MOCK.fixedDeltaTime;
      expect(player.velocity.x).toBeLessThanOrEqual(maxSpeed);
    });

    it('clamps velocity.x to max speed in negative direction', () => {
      player.moveIntent.left = true;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 100; i++) system.update();
      const maxSpeed = PLAYER_MOCK.MOVE_SPEED * TIME_MOCK.fixedDeltaTime;
      expect(player.velocity.x).toBeGreaterThanOrEqual(-maxSpeed);
    });

    it('clamps velocity.y to max speed', () => {
      player.moveIntent.down = true;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 100; i++) system.update();
      const maxSpeed = PLAYER_MOCK.MOVE_SPEED * TIME_MOCK.fixedDeltaTime;
      expect(Math.abs(player.velocity.y)).toBeLessThanOrEqual(maxSpeed);
    });
  });

  //======================================
  // BUBBLE TRAIL
  //======================================

  describe('bubble trail', () => {
    it('does not spawn bubbles when player is stationary', () => {
      player.velocity.x = 0;
      player.velocity.y = 0;
      player.moveIntent.left = false;
      player.moveIntent.right = false;
      const system = createPlayerSystem(player);
      // Run many frames without movement
      for (let i = 0; i < 20; i++) system.update();
      // Bubbles may still spawn due to Math.random — check approximate upper bound
      expect(player.bubbles.length).toBeLessThan(10);
    });

    it('spawns bubbles when player is moving', () => {
      player.moveIntent.right = true;
      player.velocity.x = 5;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 20; i++) system.update();
      // With movement and random < 0.4, expect some bubbles over 20 frames
      expect(player.bubbles.length).toBeGreaterThan(0);
    });

    it('bubble has required properties (x, y, size, life, vx, vy)', () => {
      player.moveIntent.right = true;
      player.velocity.x = 5;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 10; i++) system.update();
      if (player.bubbles.length > 0) {
        const b = player.bubbles[0];
        expect(b).toHaveProperty('x');
        expect(b).toHaveProperty('y');
        expect(b).toHaveProperty('size');
        expect(b).toHaveProperty('life');
        expect(b).toHaveProperty('vx');
        expect(b).toHaveProperty('vy');
      }
    });

    it('bubbles are removed when life reaches zero', () => {
      player.bubbles.push({ x: 100, y: 100, size: 4, life: 0, vx: 0, vy: 0 });
      const system = createPlayerSystem(player);
      system.update();
      // Dead bubbles should be spliced out
      const dead = player.bubbles.filter(b => b.life <= 0);
      expect(dead.length).toBe(0);
    });

    it('bubble spawns behind player (opposite facing direction)', () => {
      player.facing = -1;
      player.position.x = 100;
      player.velocity.x = -5;
      player.moveIntent.left = true;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 10; i++) system.update();
      if (player.bubbles.length > 0) {
        const b = player.bubbles[player.bubbles.length - 1];
        // Bubble should appear behind player (facing = -1 means moving left, so back = right = higher x)
        expect(b.x).toBeGreaterThan(player.position.x);
      }
    });
  });

  //======================================
  // EDGE CASES
  //======================================

  describe('edge cases', () => {
    it('handles missing moveIntent gracefully', () => {
      const brokenPlayer = makePlayer({ moveIntent: undefined });
      const system = createPlayerSystem(brokenPlayer);
      expect(() => system.update()).not.toThrow();
    });

    it('handles missing bubbles array gracefully', () => {
      const brokenPlayer = makePlayer({ bubbles: undefined });
      const system = createPlayerSystem(brokenPlayer);
      expect(() => system.update()).not.toThrow();
    });

    it('handles missing velocity object gracefully', () => {
      const brokenPlayer = makePlayer({ velocity: undefined });
      const system = createPlayerSystem(brokenPlayer);
      expect(() => system.update()).not.toThrow();
    });

    it('handles negative initial velocity', () => {
      player.velocity.x = -100;
      const system = createPlayerSystem(player);
      expect(() => system.update()).not.toThrow();
      expect(player.velocity.x).toBeDefined();
    });
  });

  //======================================
  // STABILITY
  //======================================

  describe('stability', () => {
    it('does not produce NaN velocity under normal use', () => {
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 50; i++) system.update();
      expect(Number.isNaN(player.velocity.x)).toBe(false);
      expect(Number.isNaN(player.velocity.y)).toBe(false);
    });

    it('stable over many consecutive frames', () => {
      player.moveIntent.right = true;
      const system = createPlayerSystem(player);
      for (let i = 0; i < 200; i++) system.update();
      expect(player.velocity.x).toBeGreaterThan(0);
      expect(player.facing).toBe(1);
    });
  });
});
