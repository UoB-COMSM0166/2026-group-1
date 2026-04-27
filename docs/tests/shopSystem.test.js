//======================================
// UNIT TESTS - SHOP SYSTEM
//======================================
/*
Tests for shopSystem.js — verifies:
- Shop open/close/toggle state
- Upgrade purchase: credit deduction, level increment, cost scaling
- Item purchase: credit deduction, quantity increment
- Purchase rejection when insufficient credits
- Reset behaviour
- Data queries
- Control mode switching

Note: attemptUpgradePurchase / attemptItemPurchase are internal functions.
They are tested indirectly by simulating mouse clicks on cards.
*/

import { jest } from '@jest/globals';

// Mock p5 drawing globals
function makeColor(r, g, b, a) {
  const c = { r, g, b, a: a ?? 255 };
  c.toString = () => `rgba(${r},${g},${b},${a ?? 255})`;
  return c;
}

global.mouseX = 0;
global.mouseY = 0;
global.width = 1280;
global.height = 720;
global.noStroke = jest.fn();
global.stroke = jest.fn();
global.strokeWeight = jest.fn();
global.noFill = jest.fn();
global.fill = jest.fn();
global.rect = jest.fn();
global.text = jest.fn();
global.textAlign = jest.fn();
global.textSize = jest.fn();
global.textStyle = jest.fn();
global.color = (r, g, b, a) => makeColor(r, g, b, a);
global.lerpColor = (c1, c2, t) => c1;
global.circle = jest.fn();

// Mock config
jest.unstable_mockModule('../config.js', () => ({
  CONTROLS: {
    DEFAULT_MODE: 'wasd',
    MODES: {
      wasd: { ACCEPT: 'w' },
      arrows: { ACCEPT: 'ArrowUp' },
    },
  },
  keyLabel: (key) => key,
}));

const { createShopSystem } = await import('../systems/shopSystem.js');

const PANEL_W = 900;
const PANEL_H = 520;
const CARD_W = 190;
const CARD_H = 118;
const BUTTON_W = 150;
const BUTTON_H = 38;

function getLayout() {
  const panelX = width / 2 - PANEL_W / 2; // 190
  const panelY = height / 2 - PANEL_H / 2; // 100
  const upgradesStartX = panelX + 32; // 222
  const upgradesStartY = panelY + 86;   // 186
  const cardGap = 18;
  const sectionGapY = 150;

  const upgradeCards = [];
  const upgradeKeys = ['power', 'torch', 'sonar'];
  for (let i = 0; i < upgradeKeys.length; i++) {
    upgradeCards.push({
      key: upgradeKeys[i],
      x: upgradesStartX + i * (CARD_W + cardGap),
      y: upgradesStartY,
      w: CARD_W,
      h: CARD_H,
    });
  }

  const itemCards = [];
  const itemKeys = ['missiles'];
  for (let j = 0; j < itemKeys.length; j++) {
    itemCards.push({
      key: itemKeys[j],
      x: upgradesStartX + j * (CARD_W + cardGap),
      y: upgradesStartY + sectionGapY,
      w: CARD_W,
      h: CARD_H,
    });
  }

  const closeButton = {
    x: panelX + PANEL_W - BUTTON_W - 30,
    y: panelY + PANEL_H - BUTTON_H - 18,
    w: BUTTON_W,
    h: BUTTON_H,
  };

  return { panelX, panelY, upgradeCards, itemCards, closeButton };
}

function clickAt(shop, x, y) {
  global.mouseX = x;
  global.mouseY = y;
  shop.onMousePressed();
}

describe('ShopSystem — state management', () => {
  function makePlayer(overrides = {}) {
    return {
      credits: 500,
      missiles: 0,
      upgrades: { power: 1, torch: 1, sonar: 1 },
      ...overrides,
    };
  }

  it('starts closed', () => {
    const shop = createShopSystem(makePlayer());
    expect(shop.isShopOpen()).toBe(false);
  });

  it('openShop() opens the shop', () => {
    const shop = createShopSystem(makePlayer());
    shop.openShop();
    expect(shop.isShopOpen()).toBe(true);
  });

  it('closeShop() closes the shop', () => {
    const shop = createShopSystem(makePlayer());
    shop.openShop();
    shop.closeShop();
    expect(shop.isShopOpen()).toBe(false);
  });

  it('toggleShop() flips open → closed', () => {
    const shop = createShopSystem(makePlayer());
    expect(shop.isShopOpen()).toBe(false);
    shop.toggleShop();
    expect(shop.isShopOpen()).toBe(true);
    shop.toggleShop();
    expect(shop.isShopOpen()).toBe(false);
  });

  it('reset() closes the shop', () => {
    const shop = createShopSystem(makePlayer({ upgrades: { power: 3, torch: 2, sonar: 4 } }));
    shop.openShop();
    shop.reset();
    expect(shop.isShopOpen()).toBe(false);
    // getUpgradeLevel reads from player.upgrades which reset() does not modify
    // (this is a design choice — reset only resets internal display state)
  });
});

describe('ShopSystem — upgrade purchases via click', () => {
  function makePlayer(overrides = {}) {
    return {
      credits: 500,
      missiles: 0,
      upgrades: { power: 1, torch: 1, sonar: 1 },
      ...overrides,
    };
  }

  it('clicking power upgrade card deducts 50 credits and increments level', () => {
    const player = makePlayer({ credits: 200 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const powerCard = layout.upgradeCards[0]; // 'power'
    clickAt(shop, powerCard.x + 10, powerCard.y + 10);

    expect(player.credits).toBe(150);    // 200 - 50
    expect(player.upgrades.power).toBe(2);
  });

  it('clicking torch upgrade card deducts 40 credits and increments level', () => {
    const player = makePlayer({ credits: 200 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const torchCard = layout.upgradeCards[1]; // 'torch'
    clickAt(shop, torchCard.x + 10, torchCard.y + 10);

    expect(player.credits).toBe(160);    // 200 - 40
    expect(player.upgrades.torch).toBe(2);
  });

  it('clicking sonar upgrade card deducts 60 credits and increments level', () => {
    const player = makePlayer({ credits: 300 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const sonarCard = layout.upgradeCards[2]; // 'sonar'
    clickAt(shop, sonarCard.x + 10, sonarCard.y + 10);

    expect(player.credits).toBe(240);    // 300 - 60
    expect(player.upgrades.sonar).toBe(2);
  });

  it('upgrade cost scales by 1.5× after first purchase', () => {
    const player = makePlayer({ credits: 500 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const powerCard = layout.upgradeCards[0];

    // First purchase: cost = 50
    clickAt(shop, powerCard.x + 10, powerCard.y + 10);
    expect(player.credits).toBe(450);
    expect(player.upgrades.power).toBe(2);

    // Second purchase: cost = ceil(50 * 1.5) = 75
    clickAt(shop, powerCard.x + 10, powerCard.y + 10);
    expect(player.credits).toBe(375);  // 450 - 75
    expect(player.upgrades.power).toBe(3);

    // Third purchase: cost = ceil(75 * 1.5) = 113
    clickAt(shop, powerCard.x + 10, powerCard.y + 10);
    expect(player.credits).toBe(262);  // 375 - 113
    expect(player.upgrades.power).toBe(4);
  });

  it('rejects purchase when credits are insufficient', () => {
    const player = makePlayer({ credits: 10 }); // can't afford any upgrade
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const powerCard = layout.upgradeCards[0];

    clickAt(shop, powerCard.x + 10, powerCard.y + 10);

    // Credits unchanged — purchase was rejected
    expect(player.credits).toBe(10);
    expect(player.upgrades.power).toBe(1); // unchanged
  });

  it('rejects purchase at exact cost boundary', () => {
    const player = makePlayer({ credits: 49 }); // one short of power cost (50)
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    clickAt(shop, layout.upgradeCards[0].x + 10, layout.upgradeCards[0].y + 10);

    expect(player.credits).toBe(49); // no change
    expect(player.upgrades.power).toBe(1);
  });

  it('close button click closes the shop', () => {
    const player = makePlayer();
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    clickAt(shop, layout.closeButton.x + 10, layout.closeButton.y + 10);

    expect(shop.isShopOpen()).toBe(false);
  });
});

describe('ShopSystem — item purchases via click', () => {
  function makePlayer(overrides = {}) {
    return {
      credits: 500,
      missiles: 0,
      upgrades: { power: 1, torch: 1, sonar: 1 },
      ...overrides,
    };
  }

  it('clicking missiles card deducts 20 credits and adds 1 missile', () => {
    const player = makePlayer({ credits: 100 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const missileCard = layout.itemCards[0];
    clickAt(shop, missileCard.x + 10, missileCard.y + 10);

    expect(player.credits).toBe(80);   // 100 - 20
    expect(player.missiles).toBe(1);
  });

  it('multiple missile purchases accumulate correctly', () => {
    const player = makePlayer({ credits: 200 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    const missileCard = layout.itemCards[0];

    for (let i = 0; i < 5; i++) {
      clickAt(shop, missileCard.x + 10, missileCard.y + 10);
    }

    expect(player.missiles).toBe(5);
    expect(player.credits).toBe(100); // 200 - 5*20
  });

  it('rejects missile purchase when credits are insufficient', () => {
    const player = makePlayer({ credits: 5 }); // can't afford missile (20)
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();
    clickAt(shop, layout.itemCards[0].x + 10, layout.itemCards[0].y + 10);

    expect(player.credits).toBe(5);
    expect(player.missiles).toBe(0);
  });
});

describe('ShopSystem — data queries', () => {
  function makePlayer(overrides = {}) {
    return {
      credits: 500,
      missiles: 5,
      upgrades: { power: 3, torch: 2, sonar: 1 },
      ...overrides,
    };
  }

  it('getUpgradeLevel returns player upgrade level', () => {
    const shop = createShopSystem(makePlayer());
    expect(shop.getUpgradeLevel('power')).toBe(3);
    expect(shop.getUpgradeLevel('torch')).toBe(2);
    expect(shop.getUpgradeLevel('sonar')).toBe(1);
  });

  it('getUpgradeLevel returns 0 for unknown upgrade', () => {
    const shop = createShopSystem(makePlayer());
    expect(shop.getUpgradeLevel('shield')).toBe(0);
  });

  it('getItemQuantity returns missile count', () => {
    const shop = createShopSystem(makePlayer({ missiles: 7 }));
    expect(shop.getItemQuantity('missiles')).toBe(7);
  });

  it('getItemQuantity returns 0 for unknown item', () => {
    const shop = createShopSystem(makePlayer());
    expect(shop.getItemQuantity('health')).toBe(0);
  });
});

describe('ShopSystem — control mode', () => {
  function makePlayer() {
    return { credits: 500, missiles: 0, upgrades: { power: 1, torch: 1, sonar: 1 } };
  }

  it('setControlMode accepts valid mode without throwing', () => {
    const shop = createShopSystem(makePlayer());
    expect(() => shop.setControlMode('arrows')).not.toThrow();
  });

  it('setControlMode ignores invalid mode', () => {
    const shop = createShopSystem(makePlayer());
    shop.setControlMode('arrows');
    shop.setControlMode('invalid');
    // No error thrown — invalid mode is silently ignored
  });
});

describe('ShopSystem — integration scenarios', () => {
  function makePlayer(overrides = {}) {
    return {
      credits: 500,
      missiles: 0,
      upgrades: { power: 1, torch: 1, sonar: 1 },
      ...overrides,
    };
  }

  it('can buy one upgrade and multiple missiles in sequence', () => {
    const player = makePlayer({ credits: 300 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();

    // Buy power upgrade (50 credits)
    clickAt(shop, layout.upgradeCards[0].x + 10, layout.upgradeCards[0].y + 10);
    // Buy 5 missiles (100 credits)
    for (let i = 0; i < 5; i++) {
      clickAt(shop, layout.itemCards[0].x + 10, layout.itemCards[0].y + 10);
    }

    expect(player.upgrades.power).toBe(2);
    expect(player.missiles).toBe(5);
    expect(player.credits).toBe(150); // 300 - 50 - 100
  });

  it('cannot purchase when completely broke', () => {
    const player = makePlayer({ credits: 0 });
    const shop = createShopSystem(player);
    shop.openShop();

    const layout = getLayout();

    clickAt(shop, layout.upgradeCards[0].x + 10, layout.upgradeCards[0].y + 10);
    clickAt(shop, layout.itemCards[0].x + 10, layout.itemCards[0].y + 10);

    expect(player.credits).toBe(0);
    expect(player.upgrades.power).toBe(1);
    expect(player.missiles).toBe(0);
  });

  it('handles player with undefined upgrades — falls back to defaults', () => {
    const player = { credits: 100 }; // no upgrades property
    const shop = createShopSystem(player);

    // Shop initialises missing upgrade levels to 1 (default)
    expect(shop.getUpgradeLevel('power')).toBe(1);
    expect(shop.getUpgradeLevel('torch')).toBe(1);
    // missiles defaults to 0
    expect(shop.getItemQuantity('missiles')).toBe(0);
  });

  it('onMousePressed does nothing when shop is closed', () => {
    const player = makePlayer({ credits: 500 });
    const shop = createShopSystem(player);
    // shop is closed
    shop.onMousePressed();
    expect(player.credits).toBe(500); // no change
  });
});
