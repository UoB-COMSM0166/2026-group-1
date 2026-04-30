//======================================
// UNIT TESTS - ENEMY SYSTEM
//======================================
/*
Tests for enemySystem.js — verifies crab patrol, jellyfish movement,
piranha sonar-triggered chase, and player contact damage.
*/

import { jest } from '@jest/globals';

// p5 globals needed by entity constructors (Crab, Jellyfish, Piranha use createVector)
global.createVector = (x, y) => ({ x, y });

// Mock hitboxSystem FIRST (enemySystem imports it)
jest.unstable_mockModule('../systems/hitboxSystem.js', () => ({
  isColliding: jest.fn().mockReturnValue(false),
  Hitbox: class Hitbox {
    constructor(x, y, w, h) {
      // hitboxSystem stores CENTER position: createVector(x + w/2, y + h/2)
      this.position = { x: x + w / 2, y: y + h / 2 };
      this.w = w;
      this.h = h;
    }
    getX() { return this.position.x - this.w / 2; }
    getY() { return this.position.y - this.h / 2; }
  },
  Wall: class Wall {
    constructor(x, y, w, h) {
      this.position = { x, y };
      this.w = w;
      this.h = h;
      this.isDestroyed = false;
    }
  },
}));

// Mock config with all required exports (hitboxSystem imports DEBUG_COLOR)
jest.unstable_mockModule('../config.js', () => ({
  TIME: { fixedDeltaTime: 1 / 60 },
  DEBUG_COLOR: { WALL: 'red', PLAYER: 'blue', ENEMY: 'green' },
  CANVAS: { TILE_SIZE: 16 },
  PLAYER: { DRAG: 0.85, ACCELERATION: 0.8, MOVE_SPEED: 200 },
  CONTROLS: { DEFAULT_MODE: 'default', MODES: { default: {} } },
  SONAR: { COOLDOWN_MS: 500 },
  JELLYFISH_GLOW: {
    HEAD_RADIUS: 18,
    BODY_MIN_RADIUS: 25,
    BODY_HEIGHT_RANGE: 18,
    BODY_HALF_WIDTH: 17,
    BODY_LERP: 0.08,
    BASE_INTENSITY: 0.32,
    PULSE_SPEED: 1.2,
    PULSE_VARIATION: 0.15,
    HEAD_CYCLE_S: 12.0,
    BODY_CYCLE_S: 14.0,
    BODY_PHASE_OFFSET: 0.35,
    FLICKER_SPEED: 13.7,
  },
}));

const mockSoundSystem = { play: jest.fn() };

// Import after mocks are registered — do this at the top level
const { createEnemySystem } = await import('../systems/enemySystem.js');
const hitboxSystemModule = await import('../systems/hitboxSystem.js');
const mockIsColliding = hitboxSystemModule.isColliding;

describe('EnemySystem', () => {
  let player;

  beforeEach(() => {
    player = {
      position: { x: 100, y: 100 },
      x: 100,
      y: 100,
      w: 32,
      h: 16,
      power: { current: 100, drain: jest.fn() },
    };
    mockSoundSystem.play.mockReset();
    mockIsColliding.mockReturnValue(false);
  });

  //======================================
  // CRAB PATROL MOVEMENT
  //======================================

  describe('crab patrol', () => {
    it('moves crab right initially', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const crabs = es.getCrabs();
      expect(crabs.length).toBe(1);
      expect(crabs[0].position.x).toBeGreaterThan(100);
    });

    it('reverses direction at patrol boundary', () => {
      const enemies = [
        {
          name: 'crab', x: 100, y: 100, width: 24, height: 16,
          properties: [
            { name: 'patrolDistance', value: 10 },
            { name: 'speed', value: 10 },
          ],
        },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      // spawnX=100, maxX=110 — need >60 updates at step=10/60 to trigger reversal
      for (let i = 0; i < 150; i++) es.update();
      const crabs = es.getCrabs();
      expect(crabs[0].position.x).toBeLessThanOrEqual(110);
    });

    it('sets facing direction based on movement', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const crabs = es.getCrabs();
      expect(crabs[0].facing).toBeDefined();
      expect([1, -1]).toContain(crabs[0].facing);
    });

    it('does not resync enemies every frame unnecessarily', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      es.update();
      const crabs1 = es.getCrabs();
      const crabs2 = es.getCrabs();
      expect(crabs1[0]).toBe(crabs2[0]);
    });
  });

  //======================================
  // JELLYFISH MOVEMENT
  //======================================

  describe('jellyfish movement', () => {
    it('creates jellyfish instances from enemy data', () => {
      const enemies = [
        { name: 'jellyfish', x: 100, y: 100, w: 20, h: 20, amplitude: 10, frequency: 2, driftSpeed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const jellyfish = es.getJellyfish();
      expect(jellyfish.length).toBe(1);
    });

    it('oscillates vertically over time', () => {
      const enemies = [
        { name: 'jellyfish', x: 100, y: 100, w: 20, h: 20, amplitude: 10, frequency: 2, driftSpeed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const pos1 = es.getJellyfish()[0].position.y;
      for (let i = 0; i < 30; i++) es.update();
      const pos2 = es.getJellyfish()[0].position.y;
      expect(pos2).not.toBe(pos1);
    });

    it('handles drift movement', () => {
      const enemies = [
        { name: 'jellyfish', x: 100, y: 100, w: 20, h: 20, amplitude: 5, frequency: 1, driftSpeed: 1, maxDrift: 50 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const pos1 = es.getJellyfish()[0].position.x;
      for (let i = 0; i < 30; i++) es.update();
      const pos2 = es.getJellyfish()[0].position.x;
      expect(pos2).not.toBe(pos1);
    });
  });

  //======================================
  // PIRANHA — SONAR TRIGGER + CHASE
  //======================================

  describe('piranha sonar detection and chase', () => {
    it('piranha starts in idle state', () => {
      const enemies = [
        { name: 'piranha', x: 200, y: 200, w: 24, h: 24, detectionRadius: 120, chaseSpeed: 0.6 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const piranhas = es.getPiranhas();
      expect(piranhas[0].state).toBe('idle');
    });

    it('piranha chases player when sonar pulse is detected', () => {
      const enemies = [
        { name: 'piranha', x: 200, y: 200, w: 24, h: 24, detectionRadius: 120, chaseSpeed: 0.6 },
      ];
      const fakePulse = { particles: [{ pos: { x: 200, y: 200 }, life: 255 }] };
      const es = createEnemySystem(player, () => enemies, () => [fakePulse], mockSoundSystem);
      es.update();
      const piranhas = es.getPiranhas();
      expect(piranhas[0].state).toBe('chase');
    });

    it('piranha returns after chase timer expires', () => {
      const enemies = [
        { name: 'piranha', x: 200, y: 200, w: 24, h: 24, detectionRadius: 120, chaseSpeed: 0.6 },
      ];
      const fakePulse = { particles: [{ pos: { x: 200, y: 200 }, life: 255 }] };
      const es = createEnemySystem(player, () => enemies, () => [fakePulse], mockSoundSystem);
      es.update();
      for (let i = 0; i < 200; i++) es.update();
      const piranhas = es.getPiranhas();
      expect(piranhas[0].state).toBe('return');
    });
  });

  //======================================
  // PLAYER CONTACT DAMAGE
  //======================================

  describe('player contact damage', () => {
    it('calls power.drain when touching crab (isColliding true)', () => {
      mockIsColliding.mockReturnValue(true);
      const enemies = [
        { name: 'crab', x: 102, y: 102, w: 24, h: 16, patrolDistance: 50, speed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      expect(player.power.drain).toHaveBeenCalled();
    });

    it('does not drain power when not colliding', () => {
      mockIsColliding.mockReturnValue(false);
      const enemies = [
        { name: 'crab', x: 102, y: 102, w: 24, h: 16, patrolDistance: 50, speed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      expect(player.power.drain).not.toHaveBeenCalled();
    });

    it('plays playerHit sound on enemy contact', () => {
      mockIsColliding.mockReturnValue(true);
      const enemies = [
        { name: 'crab', x: 102, y: 102, w: 24, h: 16, patrolDistance: 0, speed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      expect(mockSoundSystem.play).toHaveBeenCalledWith('playerHit', 0.2);
    });
  });

  //======================================
  // PENDING DESTROY
  //======================================

  describe('pending destroy', () => {
    it('removes crab marked pendingDestroy from list', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      es.getCrabs()[0].pendingDestroy = true;
      es.update();
      expect(es.getCrabs().length).toBe(0);
    });

    it('removes jellyfish marked pendingDestroy from list', () => {
      const enemies = [
        { name: 'jellyfish', x: 100, y: 100, w: 20, h: 20, amplitude: 5, frequency: 1, driftSpeed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      es.getJellyfish()[0].pendingDestroy = true;
      es.update();
      expect(es.getJellyfish().length).toBe(0);
    });
  });

  //======================================
  // GETTERS
  //======================================

  describe('getter methods', () => {
    it('getEnemies returns all enemy types combined', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
        { name: 'jellyfish', x: 150, y: 100, w: 20, h: 20, amplitude: 5, frequency: 1, driftSpeed: 0 },
        { name: 'piranha', x: 200, y: 100, w: 24, h: 24, detectionRadius: 120, chaseSpeed: 0.6 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      const all = es.getEnemies();
      expect(all.length).toBe(3);
    });

    it('getCrabs returns only crabs', () => {
      const enemies = [
        { name: 'crab', x: 100, y: 100, w: 24, h: 16, patrolDistance: 50, speed: 1 },
        { name: 'jellyfish', x: 150, y: 100, w: 20, h: 20, amplitude: 5, frequency: 1, driftSpeed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      es.update();
      expect(es.getCrabs().length).toBe(1);
      expect(es.getJellyfish().length).toBe(1);
    });
  });

  //======================================
  // EDGE CASES
  //======================================

  describe('edge cases', () => {
    it('handles empty enemy list', () => {
      const es = createEnemySystem(player, () => [], () => [], mockSoundSystem);
      expect(() => es.update()).not.toThrow();
      expect(es.getEnemies().length).toBe(0);
    });

    it('handles null getEnemies callback', () => {
      const es = createEnemySystem(player, null, () => [], mockSoundSystem);
      expect(() => es.update()).not.toThrow();
    });

    it('handles unknown enemy name gracefully', () => {
      const enemies = [{ name: 'unknown', x: 100, y: 100, w: 24, h: 24 }];
      const es = createEnemySystem(player, () => enemies, () => [], mockSoundSystem);
      expect(() => es.update()).not.toThrow();
      expect(es.getEnemies().length).toBe(0);
    });

    it('handles null soundSystem', () => {
      mockIsColliding.mockReturnValue(true);
      const enemies = [
        { name: 'crab', x: 102, y: 102, w: 24, h: 16, patrolDistance: 0, speed: 0 },
      ];
      const es = createEnemySystem(player, () => enemies, () => [], null);
      expect(() => es.update()).not.toThrow();
    });
  });
});
