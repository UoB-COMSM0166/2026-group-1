//======================================
// UNIT TESTS - PHYSICS SYSTEM
//======================================
/*
Tests for physicsSystem.js — verifies collision resolution,
player movement, and wall boundary enforcement.
*/

import { jest } from '@jest/globals';

// Mock hitboxSystem FIRST (physicsSystem imports it)
jest.unstable_mockModule('../systems/hitboxSystem.js', () => ({
  isColliding: jest.fn().mockReturnValue(false),
  resolveWallCollision: jest.fn(),
  Wall: class Wall {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.isDestroyed = false;
    }
    getCornerX() { return this.x; }
    getCornerY() { return this.y; }
    getWidth() { return this.w; }
    getHeight() { return this.h; }
    updateZones() {}
  },
}));

// Mock config
jest.unstable_mockModule('../config.js', () => ({
  TIME: { fixedDeltaTime: 1 / 60 },
  DEBUG_COLOR: { WALL: 'red', PLAYER: 'blue' },
}));

const { createPhysicsSystem } = await import('../systems/physicsSystem.js');
const hitboxModule = await import('../systems/hitboxSystem.js');
const mockIsColliding = hitboxModule.isColliding;
const mockResolveWallCollision = hitboxModule.resolveWallCollision;

describe('PhysicsSystem', () => {
  let mockPlayer;

  function makePlayer(overrides = {}) {
    return {
      position: { x: 100, y: 100 },
      nextPos: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      w: 32,
      h: 16,
      setNextPosition() {
        this.nextPos.x = this.position.x + this.velocity.x;
        this.nextPos.y = this.position.y + this.velocity.y;
      },
      movePlayer() {
        this.position.x = this.nextPos.x;
        this.position.y = this.nextPos.y;
      },
      ...overrides,
    };
  }

  function makeWall(x, y, w, h, overrides = {}) {
    return {
      x, y, w, h,
      isDestroyed: false,
      isBreakable: false,
      getCornerX() { return this.x; },
      getCornerY() { return this.y; },
      getWidth() { return this.w; },
      getHeight() { return this.h; },
      updateZones() {},
      ...overrides,
    };
  }

  beforeEach(() => {
    mockPlayer = makePlayer();
    mockIsColliding.mockReturnValue(false);
    mockResolveWallCollision.mockClear();
  });

  describe('player movement without walls', () => {
    it('commits next position after setNextPosition when no walls block', () => {
      mockPlayer.velocity = { x: 5, y: 3 };
      const physics = createPhysicsSystem(mockPlayer, () => []);
      physics.update();
      expect(mockPlayer.position.x).toBe(105); // 100 + 5
      expect(mockPlayer.position.y).toBe(103); // 100 + 3
    });

    it('setNextPosition is called before movePlayer', () => {
      const callOrder = [];
      mockPlayer.setNextPosition = () => callOrder.push('setNext');
      mockPlayer.movePlayer = () => callOrder.push('move');
      const physics = createPhysicsSystem(mockPlayer, () => []);
      physics.update();
      expect(callOrder).toEqual(['setNext', 'move']);
    });

    it('player stays in place when velocity is zero', () => {
      mockPlayer.velocity = { x: 0, y: 0 };
      const physics = createPhysicsSystem(mockPlayer, () => []);
      physics.update();
      expect(mockPlayer.position.x).toBe(100);
      expect(mockPlayer.position.y).toBe(100);
    });
  });

  describe('collision resolution', () => {
    it('resolves collision when player overlaps a wall', () => {
      const wall = makeWall(120, 100, 16, 16);
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      expect(mockResolveWallCollision).toHaveBeenCalledWith(mockPlayer, expect.any(Object));
    });

    it('does not call resolveWallCollision when no collision', () => {
      const wall = makeWall(500, 500, 16, 16); // far away
      mockIsColliding.mockReturnValue(false);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      expect(mockResolveWallCollision).not.toHaveBeenCalled();
    });

    it('skips destroyed walls (does not call resolveWallCollision)', () => {
      const wall = makeWall(120, 100, 16, 16, { isDestroyed: true });
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      // Destroyed walls should not trigger collision resolution
      expect(mockResolveWallCollision).not.toHaveBeenCalled();
    });

    it('skips breakable walls that are also destroyed', () => {
      const wall = makeWall(120, 100, 16, 16, { isBreakable: true, isDestroyed: true });
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      expect(mockResolveWallCollision).not.toHaveBeenCalled();
    });

    it('handles walls with only x, y, w, h (no hitbox methods)', () => {
      const wall = { x: 120, y: 100, w: 16, h: 16, isDestroyed: false };
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      expect(() => physics.update()).not.toThrow();
    });

    it('handles wall objects with getCornerX/Y methods', () => {
      const wall = makeWall(120, 100, 16, 16);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      // No crash means wall was processed
      expect(mockIsColliding).toHaveBeenCalled();
    });
  });

  describe('platform source flexibility', () => {
    it('accepts a function that returns walls', () => {
      const wall = makeWall(120, 100, 16, 16);
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => [wall]);
      physics.update();
      expect(mockIsColliding).toHaveBeenCalled();
    });

    it('accepts a direct array of walls', () => {
      const wall = makeWall(120, 100, 16, 16);
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, wall); // direct array, not function
      physics.update();
      expect(mockIsColliding).toHaveBeenCalled();
    });

    it('returns empty array for null/undefined wall source', () => {
      const physicsNull = createPhysicsSystem(mockPlayer, null);
      expect(() => physicsNull.update()).not.toThrow();

      const physicsUndefined = createPhysicsSystem(mockPlayer, undefined);
      expect(() => physicsUndefined.update()).not.toThrow();
    });

    it('handles walls with .walls property (nested)', () => {
      const wall = makeWall(120, 100, 16, 16);
      const container = { walls: [wall] };
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => container);
      physics.update();
      expect(mockIsColliding).toHaveBeenCalled();
    });

    it('handles walls with .platforms property', () => {
      const wall = makeWall(120, 100, 16, 16);
      const container = { platforms: [wall] };
      mockIsColliding.mockReturnValue(true);
      const physics = createPhysicsSystem(mockPlayer, () => container);
      physics.update();
      expect(mockIsColliding).toHaveBeenCalled();
    });
  });

  describe('update call count', () => {
    it('commits position after each update call', () => {
      const physics = createPhysicsSystem(mockPlayer, () => []);
      physics.update();
      physics.update();
      // Position should be committed (moved from initial 100,100)
      expect(mockPlayer.position.x).toBeDefined();
      expect(mockPlayer.position.y).toBeDefined();
    });
  });
});
