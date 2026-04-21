/*
========================================
VERSION: 1.0
SYSTEM: SHOP SYSTEM
AUTHOR/s: Archie
DESCRIPTION:
- Manages shop UI overlay
- Displays upgradeable abilities: power, torch, sonar
- Displays purchasable items: missiles
- Frontend-only: reads player coins, no mutations

RULES:
- No drawing inside update() function
- No state changes inside draw() function
- Mutations handled by other systems later
- Only reads player.coins, does not modify player state directly

DESIGN GOALS:
- Decouple shop UI from gameplay systems
- Provide clear purchase feedback without action
- Enable future integration with upgrade/purchase handlers

RESPONSIBILITIES:
- Shop open/close state management
- UI rendering and hit detection
- Log purchase attempts to console
- Display current upgrade levels and item quantities
- Handle mouse clicks on upgrade/item cards

DEPENDENCIES:
- Player object (read-only: coins property)
- p5.js drawing functions (fill, rect, text, etc.)
- Mouse events (mouseX, mouseY from p5.js)

USAGE:
import { createShopSystem } from './systems/shopSystem.js';

const shopSystem = createShopSystem(player);
engine.register(shopSystem);

// In draw():
if (shopSystem.isShopOpen()) {
  shopSystem.draw();
}

// In keyPressed():
shopSystem.onKeyPressed?.(key, keyCode);
========================================
NOTES:
- Purchase attempts logged to console (no coins deducted yet)
- Upgrades have levels and costs
- Items have quantity tracking and per-unit costs
- UI uses semi-transparent overlay like pauseMenuSystem
========================================
TODO / LIMITATIONS:
- Purchase requests not wired to other systems yet
- No coin deduction on purchases
- No upgrade level changes
- No item quantity changes
- No sound effects yet
- No keyboard navigation (arrow keys)
========================================
*/


//======================================
// SHOP SYSTEM
//======================================

export function createShopSystem(player) {
  let shopOpen = false;

  const INITIAL_UPGRADE_COSTS = { power: 50, torch: 40, sonar: 60 };

  // Upgrade levels (now synced with player)
  const upgrades = {
    power: {
      level: player?.upgrades?.power ?? 1,
      cost: INITIAL_UPGRADE_COSTS.power,
      description: "Increase max power capacity",
    },
    torch: {
      level: player?.upgrades?.torch ?? 1,
      cost: INITIAL_UPGRADE_COSTS.torch,
      description: "Expand torch radius"
    },
    sonar: {
      level: player?.upgrades?.sonar ?? 1,
      cost: INITIAL_UPGRADE_COSTS.sonar,
      description: "Increase sonar range"
    },
  };

  // Purchasable items
  const items = {
    missiles: { 
      quantity: player?.missiles ?? 0, 
      costPerUnit: 20, 
      description: "Missiles" 
    },
  };

  // Layout constants
  const PANEL_W = 900;
  const PANEL_H = 520;
  const CARD_W = 190;
  const CARD_H = 118;
  const BUTTON_W = 150;
  const BUTTON_H = 38;

  //--------------------------------------
  // HIT TESTING
  //--------------------------------------
  function isOver(bx, by, bw, bh) {
    return (
      mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh
    );
  }

  //--------------------------------------
  // DRAWING HELPERS
  //--------------------------------------
  function drawButton(label, x, y, w, h, hovered, canAfford = true) {
    noStroke();
    const bgColor = !canAfford
      ? color(74, 74, 74)
      : hovered
        ? color(92, 170, 212)
        : color(49, 78, 97);
    fill(bgColor);
    rect(x, y, w, h, 4);
    stroke(194, 240, 255, 170);
    strokeWeight(1.5);
    noFill();
    rect(x, y, w, h, 4);
    noStroke();
    fill(canAfford ? 240 : 150);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(label, x + w / 2, y + h / 2);
  }

  function drawTechFrame(x, y, w, h, title) {
    noStroke();
    fill(12, 23, 31, 240);
    rect(x, y, w, h, 10);

    stroke(126, 220, 224, 200);
    strokeWeight(2);
    noFill();
    rect(x, y, w, h, 10);

    noStroke();
    fill(33, 56, 70, 240);
    rect(x + 14, y + 12, w - 28, 28, 5);

    fill(227, 244, 248);
    textAlign(LEFT, CENTER);
    textSize(14);
    text(title, x + 24, y + 26);
  }

  function drawLevelTicks(x, y, level, maxTicks = 8) {
    const safeLevel = Math.max(0, Math.min(maxTicks, level ?? 0));
    for (let i = 0; i < maxTicks; i++) {
      const tx = x + i * 9;
      noStroke();
      fill(i < safeLevel ? color(117, 250, 126) : color(53, 83, 65));
      rect(tx, y, 6, 10, 1);
    }
  }

  function getLayout() {
    const panelX = width / 2 - PANEL_W / 2;
    const panelY = height / 2 - PANEL_H / 2;
    const upgradesStartX = panelX + 32;
    const upgradesStartY = panelY + 86;
    const cardGap = 18;
    const sectionGapY = 150;

    const upgradeCards = [];
    let i = 0;
    for (const key of Object.keys(upgrades)) {
      upgradeCards.push({
        key,
        x: upgradesStartX + i * (CARD_W + cardGap),
        y: upgradesStartY,
        w: CARD_W,
        h: CARD_H,
      });
      i += 1;
    }

    const itemCards = [];
    let j = 0;
    for (const key of Object.keys(items)) {
      itemCards.push({
        key,
        x: upgradesStartX + j * (CARD_W + cardGap),
        y: upgradesStartY + sectionGapY,
        w: CARD_W,
        h: CARD_H,
      });
      j += 1;
    }

    const rightPanel = {
      x: panelX + PANEL_W - 250,
      y: panelY + 86,
      w: 220,
      h: 306,
    };

    const closeButton = {
      x: panelX + PANEL_W - BUTTON_W - 30,
      y: panelY + PANEL_H - BUTTON_H - 18,
      w: BUTTON_W,
      h: BUTTON_H,
    };

    return { panelX, panelY, upgradeCards, itemCards, rightPanel, closeButton };
  }

  function drawUpgradeCard(name, upgrade, x, y) {
    const playerCoins = player?.coins ?? 0;
    const canAfford = playerCoins >= upgrade.cost;
    const currentLevel = player?.upgrades?.[name] ?? upgrade.level;

    noStroke();
    fill(26, 31, 40, 240);
    rect(x, y, CARD_W, CARD_H, 7);

    stroke(canAfford ? color(143, 234, 255) : color(109, 109, 109));
    strokeWeight(1.8);
    noFill();
    rect(x, y, CARD_W, CARD_H, 7);

    textAlign(LEFT, TOP);
    textSize(15);
    fill(234, 246, 248);
    noStroke();
    text(name.toUpperCase(), x + 10, y + 8);

    fill(149, 177, 182);
    textSize(11);
    text(upgrade.description, x + 10, y + 29);

    fill(174, 205, 211);
    text(`LEVEL ${currentLevel}`, x + 10, y + 50);
    drawLevelTicks(x + 10, y + 68, currentLevel, 8);

    fill(canAfford ? color(255, 223, 136) : color(132, 132, 132));
    textSize(12);
    text(`COST ${upgrade.cost}`, x + 10, y + 98);

    textAlign(RIGHT, TOP);
    textSize(10);
    fill(canAfford ? color(148, 252, 165) : color(129, 129, 129));
    text(canAfford ? "CLICK TO UPGRADE" : "INSUFFICIENT COINS", x + CARD_W - 10, y + 100);
  }

  function drawItemCard(itemName, item, x, y) {
    const playerCoins = player?.coins ?? 0;
    const canAfford = playerCoins >= item.costPerUnit;
    const currentQuantity = itemName === 'missiles' ? (player?.missiles ?? 0) : (item.quantity ?? 0);

    noStroke();
    fill(27, 33, 42, 240);
    rect(x, y, CARD_W, CARD_H, 7);

    stroke(canAfford ? color(156, 235, 160) : color(109, 109, 109));
    strokeWeight(1.8);
    noFill();
    rect(x, y, CARD_W, CARD_H, 7);

    textAlign(LEFT, TOP);
    textSize(15);
    fill(234, 246, 248);
    noStroke();
    text(item.description.toUpperCase(), x + 10, y + 8);

    textSize(11);
    fill(149, 177, 182);
    text("Single-use guided projectile", x + 10, y + 29);

    fill(174, 205, 211);
    text(`OWNED ${currentQuantity}`, x + 10, y + 50);

    fill(canAfford ? color(255, 223, 136) : color(132, 132, 132));
    textSize(12);
    text(`UNIT COST ${item.costPerUnit}`, x + 10, y + 98);

    textAlign(RIGHT, TOP);
    textSize(10);
    fill(canAfford ? color(148, 252, 165) : color(129, 129, 129));
    text(canAfford ? "CLICK TO BUY +1" : "INSUFFICIENT COINS", x + CARD_W - 10, y + 100);
  }

  //--------------------------------------
  // SHOP DISPLAY
  //--------------------------------------
  function drawShopUI() {
    noStroke();
    fill(2, 8, 14, 210);
    rect(0, 0, width, height);

    const layout = getLayout();
    const { panelX, panelY } = layout;

    drawTechFrame(panelX, panelY, PANEL_W, PANEL_H, "SHOP");

    noStroke();
    fill(28, 42, 54, 220);
    rect(panelX + 30, panelY + 52, PANEL_W - 280, 30, 4);
    textAlign(LEFT, CENTER);
    textSize(16);
    fill(220, 237, 242);
    text("SYSTEMS", panelX + 42, panelY + 67);

    noStroke();
    fill(24, 38, 50, 220);
    rect(panelX + 30, panelY + 203, PANEL_W - 280, 30, 4);
    fill(220, 237, 242);
    text("SUBSYSTEMS", panelX + 42, panelY + 218);

    for (const card of layout.upgradeCards) {
      drawUpgradeCard(card.key, upgrades[card.key], card.x, card.y);
    }

    for (const card of layout.itemCards) {
      drawItemCard(card.key, items[card.key], card.x, card.y);
    }

    const info = layout.rightPanel;
    drawTechFrame(info.x, info.y, info.w, info.h, "Player Loadout");
    noStroke();
    fill(190, 228, 236);
    textSize(13);
    textAlign(LEFT, TOP);
    text(`Credits: ${player?.coins ?? 0}`, info.x + 20, info.y + 56);
    text(`Missiles: ${player?.missiles ?? 0}`, info.x + 20, info.y + 82);
    text(`Power Lvl: ${player?.upgrades?.power ?? 1}`, info.x + 20, info.y + 108);
    text(`Torch Lvl: ${player?.upgrades?.torch ?? 1}`, info.x + 20, info.y + 134);
    text(`Sonar Lvl: ${player?.upgrades?.sonar ?? 1}`, info.x + 20, info.y + 160);

    fill(116, 160, 171);
    textSize(11);
    text("Click any card to buy. Press B or close to return.", info.x + 20, info.y + 204, info.w - 40, 80);

    drawButton(
      "ACCEPT (B)",
      layout.closeButton.x,
      layout.closeButton.y,
      layout.closeButton.w,
      layout.closeButton.h,
      isOver(layout.closeButton.x, layout.closeButton.y, layout.closeButton.w, layout.closeButton.h),
      true
    );
  }

  //--------------------------------------
  // PURCHASE LOGIC (now wired to player state)
  //--------------------------------------
  function attemptUpgradePurchase(upgradeName) {
    const upgrade = upgrades[upgradeName];
    if (!upgrade) return false;

    const playerCoins = player?.coins ?? 0;
    if (playerCoins < upgrade.cost) {
      console.log(`❌ Not enough coins for ${upgradeName} upgrade. Need: ${upgrade.cost}, Have: ${playerCoins}`);
      return false;
    }

    // Deduct coins
    player.coins -= upgrade.cost;
    
    // Increment upgrade level
    if (player.upgrades && upgradeName in player.upgrades) {
      player.upgrades[upgradeName]++;
    }
    
    // Update shop display
    upgrade.level++;
    upgrade.cost = Math.ceil(upgrade.cost * 1.5); // Increase cost for next level
    
    console.log(`✓ Purchased ${upgradeName} upgrade! New level: ${upgrade.level}, Coins left: ${player.coins}`);
    return true;
  }

  function attemptItemPurchase(itemName, quantity = 1) {
    const item = items[itemName];
    if (!item) return false;

    const totalCost = item.costPerUnit * quantity;
    const playerCoins = player?.coins ?? 0;
    if (playerCoins < totalCost) {
      console.log(`❌ Not enough coins for ${quantity}x ${itemName}. Need: ${totalCost}, Have: ${playerCoins}`);
      return false;
    }

    // Deduct coins
    player.coins -= totalCost;
    
    // Add to inventory
    if (itemName === 'missiles') {
      player.missiles = (player.missiles ?? 0) + quantity;
    }
    
    // Update shop display
    item.quantity += quantity;
    
    console.log(`✓ Purchased ${quantity}x ${itemName}! Total owned: ${item.quantity}, Coins left: ${player.coins}`);
    return true;
  }

  //--------------------------------------
  // CLICK HANDLING
  //--------------------------------------
  function handleClick() {
    if (!shopOpen) return;

    console.log(`[shop] click detected at mouseX=${mouseX}, mouseY=${mouseY}, coins=${player?.coins ?? 0}`);

    const layout = getLayout();

    if (isOver(layout.closeButton.x, layout.closeButton.y, layout.closeButton.w, layout.closeButton.h)) {
      console.log('[shop] close button clicked');
      shopOpen = false;
      return;
    }

    for (const card of layout.upgradeCards) {
      if (isOver(card.x, card.y, card.w, card.h)) {
        console.log(`[shop] upgrade card clicked: ${card.key}`);
        attemptUpgradePurchase(card.key);
        return;
      }
    }

    for (const card of layout.itemCards) {
      if (isOver(card.x, card.y, card.w, card.h)) {
        console.log(`[shop] item card clicked: ${card.key}`);
        attemptItemPurchase(card.key, 1);
        return;
      }
    }

    console.log('[shop] click did not hit any button');
  }

  //--------------------------------------
  // SYSTEM INTERFACE
  //--------------------------------------
  return {
    // STATE QUERIES
    isShopOpen() {
      return shopOpen;
    },

    // STATE CONTROL
    toggleShop() {
      shopOpen = !shopOpen;
    },

    openShop() {
      shopOpen = true;
    },

    closeShop() {
      shopOpen = false;
    },

    // ENGINE INTERFACE
    update() {
      // Update logic here if needed
      // Currently shop is stateless except for open/closed
    },

    draw() {
      if (!shopOpen) return;
      drawShopUI();
    },

    // INPUT INTERFACE
    onMousePressed() {
      if (!shopOpen) return;
      handleClick();
    },

    reset() {
      shopOpen = false;
      for (const name of Object.keys(upgrades)) {
        upgrades[name].level = 1;
        upgrades[name].cost  = INITIAL_UPGRADE_COSTS[name];
      }
      items.missiles.quantity = 0;
    },

    // DATA QUERIES
    getUpgradeLevel(upgradeName) {
      return upgrades[upgradeName]?.level ?? 0;
    },

    getItemQuantity(itemName) {
      return items[itemName]?.quantity ?? 0;
    },
  };
}
//======================================
// END
//======================================
