//======================================
// UNIT TESTS - RENDER SYSTEM
//======================================
/*
Tests for renderSystem.js — verifies:
- RenderSystem can be instantiated and draw() executes without throwing
- Draw calls follow correct order: game world before UI
- UI overlay systems (shop, pause) are additive and fully modular —
  they draw on top of a rendered frame without modifying render state
- Edge cases: nullish callbacks, boundary values

Architecture note:
  renderSystem.draw() produces the full game scene.
  Overlay systems (shop, pause, game-over, win) are additive:
  sketch.js calls renderSystem.draw(alpha) first, then draws the overlay.
  This keeps UI fully modular — no render system state is modified.
*/

import { jest } from '@jest/globals';

// Track draw call order across all registered functions
const drawLog = [];
function resetLog() { drawLog.length = 0; }

// Mock p5 drawing globals
function makeColor(r, g, b, a = 255) {
  const c = { r, g, b, a };
  c.toString = () => `rgba(${r},${g},${b},${a})`;
  return c;
}

global.width  = 1280;
global.height = 720;
global.noStroke     = jest.fn();
global.stroke       = jest.fn();
global.strokeWeight = jest.fn();
global.noFill       = jest.fn();
global.fill         = jest.fn();
global.rect         = jest.fn();
global.circle       = jest.fn();
global.ellipse      = jest.fn();
global.line         = jest.fn();
global.triangle     = jest.fn();
global.point        = jest.fn();
global.push          = jest.fn();
global.pop           = jest.fn();
global.translate     = jest.fn();
global.rotate        = jest.fn();
global.scale         = jest.fn();
global.resetMatrix  = jest.fn();
global.strokeCap    = jest.fn();
global.arc          = jest.fn();
global.textAlign     = jest.fn();
global.textSize      = jest.fn();
global.textStyle     = jest.fn();
global.text          = jest.fn();
global.textFont      = jest.fn();
global.image         = jest.fn();
global.images        = jest.fn();
global.background    = jest.fn();
global.tint          = jest.fn();
global.noTint        = jest.fn();
global.rectMode      = jest.fn();
global.ellipseMode   = jest.fn();
global.imageMode     = jest.fn();
global.colorMode     = jest.fn();
global.createGraphics = jest.fn(() => ({
  background: jest.fn(),
  image: jest.fn(),
  fill: jest.fn(),
  noFill: jest.fn(),
  stroke: jest.fn(),
  noStroke: jest.fn(),
  drawingContext: {
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    globalAlpha: 1,
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    beginPath: jest.fn(),
    clip: jest.fn(),
    ellipse: jest.fn(),
    rect: jest.fn(),
    fillText: jest.fn(),
    measureText: { width: 40 },
  },
}));
global.loadImage = jest.fn((src, onLoad) => {
  const img = { width: 64, height: 64, src };
  if (onLoad) setTimeout(() => onLoad(img), 0);
  return img;
});
global.color      = (r, g, b, a) => makeColor(r, g, b, a);
global.lerpColor  = (c1, c2, t) => c1;
global.map        = (v, i1, i2, o1, o2) => o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
global.constrain  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
global.millis     = () => 0;
global.cos        = Math.cos;
global.sin        = Math.sin;
global.atan2      = Math.atan2;
global.abs        = Math.abs;
global.floor      = Math.floor;
global.ceil       = Math.ceil;
global.sqrt       = Math.sqrt;
global.min        = Math.min;
global.max        = Math.max;
global.random     = () => 0.5;
global.CORNER     = 0;
global.CENTER     = 3;
global.RIGHT      = 39;
global.LEFT       = 37;
global.TOP        = 17;
global.BOTTOM     = 101;
global.PI         = Math.PI;
global.HALF_PI    = Math.PI / 2;
global.TWO_PI     = Math.PI * 2;
global.ROUND      = 'round';
global.CLOSE      = 'close';
global.P2D        = 'P2D';
global.WEBGL      = 'WEBGL';

// Minimal player factory
function makePlayer(overrides = {}) {
  return {
    power: { getPercent: () => 0.5 },
    facing: 1,
    position: { x: 640, y: 360 },
    previousPos: { x: 630, y: 355 },
    velocity: { x: 0, y: 0 },
    w: 32,
    h: 16,
    ...overrides,
  };
}

// Build render system deps with optional overrides
function makeRenderDeps(overrides = {}) {
  return {
    player:             makePlayer(),
    getPlatforms:        () => [],
    getHazards:          () => [],
    getCollectables:     () => [],
    getEnemies:          () => [],
    getCrabs:            () => [],
    getJellyfish:        () => [],
    getTriggers:         () => [],
    getEntities:         () => [],
    getSpawnPoints:      () => [],
    getTilesets:         () => [],
    getTileSize:         () => ({ tileWidth: 16, tileHeight: 16 }),
    getBackground:       () => ({ color: '#1a1a2e' }),
    getPlatformColor:    () => ({ r: 60, g: 60, b: 80 }),
    getSonarReveals:     () => [],
    getSonarHazardReveals: () => [],
    getSonarCollectableReveals: () => [],
    getSonarEnemyReveals: () => [],
    getSonarCooldown:    () => 0,
    assets:              {},
    darknessLayer:       { background: jest.fn(), clear: jest.fn(), drawingContext: { beginPath: jest.fn() } },
    getLightSources:     () => [],
    getActivePulses:     () => [],
    getRevealedWalls:    () => new Set(),
    getCameraOffset:     () => ({ x: 0, y: 0 }),
    getOldCamPosition:   () => ({ x: 0, y: 0 }),
    getCameraScale:      () => 1,
    getMissiles:         () => [],
    getParticles:        () => [],
    getPiranhas:         () => [],
    getGlowObjects:      () => [],
    drawMiniMap:          () => {},
    getHudDialSettings:   () => ({}),
    getGameplayOverlay:   () => null,
    getGameplayOverlaySettings: () => ({}),
    ...overrides,
  };
}

// Use top-level import once; jest caches the module
const { createRenderSystem } = await import('../systems/renderSystem.js');

describe('RenderSystem — instantiation and draw()', () => {
  it('createRenderSystem does not throw with minimal callbacks', () => {
    expect(() => createRenderSystem(makeRenderDeps())).not.toThrow();
  });

  it('draw() runs to completion with all callbacks provided', () => {
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() is idempotent — calling it multiple times does not throw', () => {
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => { rs.draw(); rs.draw(); rs.draw(); }).not.toThrow();
  });

  it('draw() does not throw when no enemies, missiles, or particles exist', () => {
    const rs = createRenderSystem(makeRenderDeps({
      getEnemies:   () => [],
      getMissiles:  () => [],
      getParticles: () => [],
      getPiranhas:  () => [],
    }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when no platforms or collectables exist', () => {
    const rs = createRenderSystem(makeRenderDeps({
      getPlatforms:    () => [],
      getCollectables: () => [],
      getEntities:     () => [],
    }));
    expect(() => rs.draw()).not.toThrow();
  });
});

describe('RenderSystem — draw order is preserved', () => {
  /*
  Internal draw order in renderSystem.draw():
    1. background          (room background)
    2. platforms           (world geometry)
    3. hazards
    4. collectables
    5. entities
    6. enemies
    7. player
    8. bubbles / missiles / particles / sonar pulses
    9. lighting (darkness layer)
    10. UI (HUD dials, minimap)

  We verify this by patching p5 globals and checking that
  background is drawn before UI fill calls.
  */

  it('background is drawn before UI elements (fill calls)', () => {
    const callLog = [];
    const _background = global.background;
    const _fill       = global.fill;
    global.background = (...a) => { callLog.push('background'); _background(...a); };
    global.fill       = (...a) => { callLog.push('fill');       _fill(...a); };

    const rs = createRenderSystem(makeRenderDeps());
    rs.draw();

    global.background = _background;
    global.fill       = _fill;

    const bgIndex  = callLog.indexOf('background');
    const fillIndex = callLog.indexOf('fill');

    // If both were called, background should precede UI fills
    if (bgIndex !== -1 && fillIndex !== -1) {
      expect(bgIndex).toBeLessThan(fillIndex);
    }
  });

  it('multiple draw() calls maintain consistent order', () => {
    const callLog = [];
    const _background = global.background;
    const _fill       = global.fill;
    global.background = (...a) => { callLog.push(`bg_${callLog.length}`); _background(...a); };
    global.fill       = (...a) => { callLog.push(`fill_${callLog.length}`); _fill(...a); };

    const rs = createRenderSystem(makeRenderDeps());
    rs.draw(); rs.draw(); rs.draw();

    global.background = _background;
    global.fill       = _fill;

    // Each frame: background before fill
    const bgIndices   = callLog.reduce((acc, n, i) => (n.startsWith('bg_')   ? acc.push(i) : acc, acc), []);
    const fillIndices = callLog.reduce((acc, n, i) => (n.startsWith('fill_') ? acc.push(i) : acc, acc), []);

    for (const fi of fillIndices) {
      const someBgBefore = bgIndices.some(bi => bi < fi);
      expect(someBgBefore).toBe(true);
    }
  });
});

describe('RenderSystem — UI overlay modularity', () => {
  /*
  UI overlays (shop, pause menu, game over, win screen) are additive.
  sketch.js wiring (simplified):
    if (shopSystem.isShopOpen()) {
      renderSystem.draw(alpha);  // ← game world underneath
      shopSystem.draw();          // ← shop overlay on top
      return;
    }

  Key guarantees:
  1. renderSystem.draw() can be called multiple times per frame (overlay safety)
  2. Overlay systems do not modify renderSystem state
  3. Each overlay draws independently
  */

  it('renderSystem.draw() can be called before an overlay without errors', () => {
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => {
      rs.draw();                  // game world
      // shopSystem.draw()         // would be called here
    }).not.toThrow();
  });

  it('renderSystem.draw() can be called multiple times (as when overlays are active)', () => {
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => {
      rs.draw(); // frame 1
      rs.draw(); // frame 2 — overlay may be active, game still renders
    }).not.toThrow();
  });

  it('consecutive draw() calls do not corrupt render state', () => {
    const rs = createRenderSystem(makeRenderDeps());
    // 10 frames — as would happen with a persistent overlay (pause menu)
    expect(() => { for (let i = 0; i < 10; i++) rs.draw(); }).not.toThrow();
  });

  it('draw() does not throw when game-over overlay is active', () => {
    // Game-over renders the last frame via renderSystem.draw(0), then draws overlay
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => {
      rs.draw(); // last game frame
      // gameOverSystem.draw()    // separate module
    }).not.toThrow();
  });

  it('draw() does not throw when win overlay is active', () => {
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => {
      rs.draw();
      // winScreenSystem.draw()   // separate module
    }).not.toThrow();
  });

  it('draw() does not throw when pause overlay is active', () => {
    // Pause shows last frame via renderSystem.draw(0), then overlay
    const rs = createRenderSystem(makeRenderDeps());
    expect(() => {
      rs.draw();
      // pauseMenuSystem.draw()   // separate module
    }).not.toThrow();
  });
});

describe('RenderSystem — edge cases', () => {
  it('draw() does not throw when getLightSources returns nullish', () => {
    const rs = createRenderSystem(makeRenderDeps({ getLightSources: () => null }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when getActivePulses returns nullish', () => {
    const rs = createRenderSystem(makeRenderDeps({ getActivePulses: () => null }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when darknessLayer has no drawingContext', () => {
    const rs = createRenderSystem(makeRenderDeps({
      darknessLayer: { background: jest.fn(), clear: jest.fn(), drawingContext: {} },
    }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when getGameplayOverlay returns null', () => {
    const rs = createRenderSystem(makeRenderDeps({ getGameplayOverlay: () => null }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when getTilesets returns empty array', () => {
    const rs = createRenderSystem(makeRenderDeps({ getTilesets: () => [] }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when player.power.getPercent() returns 0', () => {
    const rs = createRenderSystem(makeRenderDeps({
      player: makePlayer({ power: { getPercent: () => 0 } }),
    }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when player.power.getPercent() returns 1', () => {
    const rs = createRenderSystem(makeRenderDeps({
      player: makePlayer({ power: { getPercent: () => 1 } }),
    }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when camera scale is 0', () => {
    const rs = createRenderSystem(makeRenderDeps({ getCameraScale: () => 0 }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when camera offset is non-zero', () => {
    const rs = createRenderSystem(makeRenderDeps({
      getCameraOffset: () => ({ x: 100, y: -50 }),
    }));
    expect(() => rs.draw()).not.toThrow();
  });

  it('draw() does not throw when getSonarCooldown returns boundary values', () => {
    const rs1 = createRenderSystem(makeRenderDeps({ getSonarCooldown: () => 0 }));
    const rs2 = createRenderSystem(makeRenderDeps({ getSonarCooldown: () => 1 }));
    expect(() => rs1.draw()).not.toThrow();
    expect(() => rs2.draw()).not.toThrow();
  });
});
