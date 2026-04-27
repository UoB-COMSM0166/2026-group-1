//======================================
// UNIT TESTS - HITBOX SYSTEM
//======================================
/*
Tests for hitboxSystem.js — verifies AABB collision detection,
wall zone updates, and collision resolution.
Note: Hitbox constructor takes TOP-LEFT corner (x, y) and stores
the CENTER position internally via createVector(x + w/2, y + h/2).
*/

import { jest } from '@jest/globals';

// Mock p5 globals BEFORE importing hitboxSystem
global.createVector = jest.fn((x, y) => ({ x, y }));

jest.unstable_mockModule('../config.js', () => ({
  DEBUG_COLOR: { WALL: 'red', PLAYER: 'blue', ENEMY: 'green' },
}));

const {
  isColliding,
  resolveWallCollision,
  Hitbox,
  Wall,
} = await import('../systems/hitboxSystem.js');

describe('Hitbox class', () => {
  describe('position and dimensions', () => {
    // Hitbox stores CENTER position: createVector(x + w/2, y + h/2)
    // new Hitbox(100, 50, 32, 16) → position = createVector(116, 58)
    it('stores center position from top-left input', () => {
      const hb = new Hitbox(100, 50, 32, 16);
      expect(hb.position.x).toBe(116); // 100 + 16
      expect(hb.position.y).toBe(58);  // 50 + 8
    });

    it('reports correct width and height', () => {
      const hb = new Hitbox(0, 0, 40, 20);
      expect(hb.getWidth()).toBe(40);
      expect(hb.getHeight()).toBe(20);
    });

    // getCornerX = center_x - w/2 = (x + w/2) - w/2 = x ✓
    it('getCornerX returns top-left x (input x)', () => {
      const hb = new Hitbox(100, 50, 32, 16);
      expect(hb.getCornerX()).toBe(100);
    });

    // getCornerY = center_y - h/2 = (y + h/2) - h/2 = y ✓
    it('getCornerY returns top-left y (input y)', () => {
      const hb = new Hitbox(100, 50, 32, 16);
      expect(hb.getCornerY()).toBe(50);
    });

    it('getX and getY return center position', () => {
      const hb = new Hitbox(100, 50, 32, 16);
      expect(hb.getX()).toBe(116);
      expect(hb.getY()).toBe(58);
    });
  });
});

describe('Wall class', () => {
  describe('zone tracking', () => {
    it('initialises all zones to false', () => {
      const wall = new Wall(100, 100, 64, 32);
      expect(wall.getZones()).toEqual([false, false, false, false]);
    });

    it('marks zone 0 (top) true when entity overlaps wall top edge', () => {
      const wall = new Wall(100, 100, 64, 32);
      const entity = {
        position: { x: 100, y: 50 }, // directly above wall
        getWidth: () => 32,
        getHeight: () => 16,
      };
      wall.updateZones(entity);
      expect(wall.getZones()[0]).toBe(true);
    });

    it('isBreakable is false by default', () => {
      const wall = new Wall(0, 0, 32, 32);
      expect(wall.isBreakable).toBe(false);
    });

    it('isDestroyed is false by default', () => {
      const wall = new Wall(0, 0, 32, 32);
      expect(wall.isDestroyed).toBe(false);
    });
  });
});

describe('isColliding', () => {
  function makeHitbox(cx, cy, w, h, nextPosCx = null) {
    const nx = nextPosCx !== null ? nextPosCx : cx;
    return {
      position: { x: cx, y: cy },
      w,
      h,
      nextPos: { x: nx, y: cy },
    };
  }

  it('returns true when two hitboxes overlap', () => {
    const a = makeHitbox(100, 100, 32, 32);
    const b = makeHitbox(110, 110, 32, 32);
    expect(isColliding(a, b)).toBe(true);
  });

  it('returns false when two hitboxes are clearly separated', () => {
    // A at cx=0, w=32 → edges [-16, 16]
    // B at cx=50, w=32 → edges [34, 66]
    // Gap between 16 and 34 → no overlap possible
    const a = makeHitbox(0, 0, 32, 32);
    const b = makeHitbox(50, 0, 32, 32);
    expect(isColliding(a, b)).toBe(false);
  });

  it('returns false when two hitboxes are far apart', () => {
    const a = makeHitbox(0, 0, 32, 32);
    const b = makeHitbox(200, 200, 32, 32);
    expect(isColliding(a, b)).toBe(false);
  });

  it('uses nextPos when available (moving entity)', () => {
    const a = makeHitbox(0, 0, 32, 32);
    const b = makeHitbox(20, 0, 32, 32);
    const aNext = makeHitbox(0, 0, 32, 32, 20); // a's next position overlaps b
    expect(isColliding(aNext, b)).toBe(true);
  });

  it('returns true for exact same position', () => {
    const a = makeHitbox(100, 100, 32, 32);
    const b = makeHitbox(100, 100, 32, 32);
    expect(isColliding(a, b)).toBe(true);
  });

  it('handles vertical overlap', () => {
    const a = makeHitbox(100, 100, 32, 32);
    const b = makeHitbox(100, 120, 32, 32);
    expect(isColliding(a, b)).toBe(true);
  });

  it('handles entity larger than wall', () => {
    const huge = makeHitbox(100, 100, 200, 200);
    const small = makeHitbox(100, 100, 10, 10);
    expect(isColliding(huge, small)).toBe(true);
  });

  it('handles wall without nextPos (uses position)', () => {
    const a = makeHitbox(50, 50, 32, 32);
    const b = { position: { x: 60, y: 60 }, w: 32, h: 32 }; // no nextPos
    expect(isColliding(a, b)).toBe(true);
  });
});

describe('resolveWallCollision', () => {
  function makeEntity(x, y, w, h) {
    return {
      position: { x, y },
      nextPos: { x, y },
      velocity: { x: 0, y: 0 },
      w,
      h,
    };
  }

  it('pushes entity up when zone 0 (top) is set', () => {
    const wall = new Wall(100, 100, 64, 32);
    wall.zones[0] = true;
    const entity = makeEntity(100, 140, 32, 32);
    resolveWallCollision(entity, wall);
    expect(entity.nextPos.y).toBeLessThan(140);
    expect(entity.velocity.y).toBe(0);
  });

  it('pushes entity right when zone 1 (right) is set', () => {
    const wall = new Wall(100, 100, 32, 64);
    wall.zones[1] = true;
    const entity = makeEntity(60, 100, 32, 32);
    resolveWallCollision(entity, wall);
    expect(entity.nextPos.x).toBeGreaterThan(60);
    expect(entity.velocity.x).toBe(0);
  });

  it('pushes entity down when zone 2 (bottom) is set', () => {
    const wall = new Wall(100, 100, 64, 32);
    wall.zones[2] = true;
    const entity = makeEntity(100, 60, 32, 32);
    resolveWallCollision(entity, wall);
    expect(entity.nextPos.y).toBeGreaterThan(60);
    expect(entity.velocity.y).toBe(0);
  });

  it('pushes entity left when zone 3 (left) is set', () => {
    const wall = new Wall(100, 100, 32, 64);
    wall.zones[3] = true;
    const entity = makeEntity(140, 100, 32, 32);
    resolveWallCollision(entity, wall);
    expect(entity.nextPos.x).toBeLessThan(140);
    expect(entity.velocity.x).toBe(0);
  });

  it('does nothing when no zones are set', () => {
    const wall = new Wall(100, 100, 64, 32);
    const entity = makeEntity(200, 200, 32, 32);
    const origX = entity.nextPos.x;
    const origY = entity.nextPos.y;
    resolveWallCollision(entity, wall);
    expect(entity.nextPos.x).toBe(origX);
    expect(entity.nextPos.y).toBe(origY);
  });
});
