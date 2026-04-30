/*
========================================
VERSION: 1.0
SYSTEM: WORKSHOP SYSTEM
AUTHOR/s: Archie
DESCRIPTION:
- Manages workshop UI overlay
- Displays upgradeable abilities: power, torch, sonar
- Displays purchasable items: missiles
- Frontend-only: reads player scrap, no mutations

RULES:
- No drawing inside update() function
- No state changes inside draw() function
- Mutations handled by other systems later
- Only reads player.scrap, does not modify player state directly

DESIGN GOALS:
- Decouple workshop UI from gameplay systems
- Provide clear purchase feedback without action
- Enable future integration with upgrade/purchase handlers

RESPONSIBILITIES:
- Workshop open/close state management
- UI rendering and hit detection
- Log purchase attempts to console
- Display current upgrade levels and item quantities
- Handle mouse clicks on upgrade/item cards

DEPENDENCIES:
- Player object (read-only: scrap property)
- p5.js drawing functions (fill, rect, text, etc.)
- Mouse events (mouseX, mouseY from p5.js)

USAGE:
import { createWorkshopSystem } from './systems/workshopSystem.js';

const workshopSystem = createWorkshopSystem(player);
engine.register(workshopSystem);

// In draw():
if (workshopSystem.isWorkshopOpen()) {
  workshopSystem.draw();
}

// In keyPressed():
workshopSystem.onKeyPressed?.(key, keyCode);
========================================
NOTES:
- Purchase attempts logged to console (no scrap deducted yet)
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
// WORKSHOP SYSTEM
//======================================

import { CONTROLS, keyLabel, MISSILE } from '../config.js';

export function createWorkshopSystem(player, initialControlMode = CONTROLS.DEFAULT_MODE, getScrapIcon = () => null, soundSystem = null) {
  let workshopOpen = false;
  let _goldScrapIcon = null;
  function getGoldScrapIcon() {
    const raw = getScrapIcon?.();
    if (!raw) return null;
    if (!_goldScrapIcon && raw.width > 0) {
      _goldScrapIcon = createGraphics(raw.width, raw.height);
      _goldScrapIcon.image(raw, 0, 0);
      _goldScrapIcon.filter(GRAY);
    }
    return _goldScrapIcon;
  }
  let controlMode = initialControlMode;

  const INITIAL_UPGRADE_COSTS = { power: 50, torch: 40, sonar: 60 };

  // Upgrade levels (now synced with player)
  const upgrades = {
    power: {
      level: player?.upgrades?.power ?? 1,
      cost: INITIAL_UPGRADE_COSTS.power,
      description: "Increase max power & refills some current power",
    },
    sonar: {
      level: player?.upgrades?.sonar ?? 1,
      cost: INITIAL_UPGRADE_COSTS.sonar,
      description: "Faster ping cooldown & tiles stay visible longer"
    },
    torch: {
      level: player?.upgrades?.torch ?? 1,
      cost: INITIAL_UPGRADE_COSTS.torch,
      description: "Expand torch radius"
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
  const PANEL_W = 1280;
  const PANEL_H = 630;
  const CARD_W = 290;
  const CARD_H = 168;
  const BUTTON_W = 140;
  const BUTTON_H = 48;

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
    textSize(16);
    text(label, x + w / 2, y + h / 2);
  }

  function drawTechFrame(x, y, w, h, title, titleBarH = 34) {
    noStroke();
    fill(12, 23, 31, 240);
    rect(x, y, w, h, 10);

    stroke(126, 220, 224, 200);
    strokeWeight(2);
    noFill();
    rect(x, y, w, h, 10);

    const titleBarTop = y + 15;
    noStroke();
    fill(33, 56, 70, 240);
    rect(x + 16, titleBarTop, w - 32, titleBarH, 5);

    fill(227, 244, 248);
    textAlign(LEFT, CENTER);
    textSize(17);
    text(title, x + 28, titleBarTop + titleBarH / 2);
  }

  function drawLevelTicks(x, y, level, maxTicks = 8) {
    const safeLevel = Math.max(0, Math.min(maxTicks, level ?? 0));
    for (let i = 0; i < maxTicks; i++) {
      const tx = x + i * 11;
      noStroke();
      fill(i < safeLevel ? color(117, 250, 126) : color(53, 83, 65));
      rect(tx, y, 7, 12, 1);
    }
  }

  function getLayout() {
    const panelX = width / 2 - PANEL_W / 2;
    const panelY = height / 2 - PANEL_H / 2;
    const upgradesStartX = panelX + 36;
    const upgradesStartY = panelY + 148;
    const cardGap = 22;
    const sectionGapY = 228;

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

    const rp = { x: panelX + PANEL_W - 295, y: panelY + 148, w: 260, h: 385 };
    const rightPanel = rp;
    const closeButton = {
      x: rp.x + (rp.w - BUTTON_W) / 2,
      y: rp.y + rp.h - BUTTON_H - 15,
      w: BUTTON_W,
      h: BUTTON_H,
    };

    return { panelX, panelY, upgradeCards, itemCards, rightPanel, closeButton };
  }

  function drawScrapCost(amount, x, y, canAfford) {
    const icon = getScrapIcon();
    const iconSize = 30;
    const textCol = canAfford ? color(255, 223, 136) : color(132, 132, 132);
    if (icon) {
      tint(canAfford ? color(255, 200, 50) : color(100, 100, 100));
      image(canAfford ? (getGoldScrapIcon() ?? icon) : icon, x, y - iconSize / 2, iconSize, iconSize);
      noTint();
    }
    fill(textCol);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(15);
    text(amount, x + iconSize + 5, y);
  }

  function drawUpgradeCard(name, upgrade, x, y) {
    const playerScrap = player?.scrap ?? 0;
    const canAfford = playerScrap >= upgrade.cost;
    const currentLevel = player?.upgrades?.[name] ?? upgrade.level;

    noStroke();
    fill(26, 31, 40, 240);
    rect(x, y, CARD_W, CARD_H, 7);

    stroke(canAfford ? color(143, 234, 255) : color(109, 109, 109));
    strokeWeight(1.8);
    noFill();
    rect(x, y, CARD_W, CARD_H, 7);

    textAlign(LEFT, TOP);
    textSize(18);
    fill(234, 246, 248);
    noStroke();
    text(name.toUpperCase(), x + 12, y + 10);

    fill(149, 177, 182);
    textSize(13);
    text(upgrade.description, x + 12, y + 34, CARD_W - 24);

    fill(174, 205, 211);
    text(`LEVEL ${currentLevel}`, x + 12, y + 74);
    drawLevelTicks(x + 12, y + 90, currentLevel, 8);

    drawScrapCost(upgrade.cost, x + 6, y + 126, canAfford);

    textAlign(RIGHT, CENTER);
    textSize(12);
    fill(canAfford ? color(148, 252, 165) : color(129, 129, 129));
    text(canAfford ? "CLICK TO UPGRADE" : "INSUFFICIENT MATERIALS", x + CARD_W - 12, y + 126);
  }

  function drawItemCard(itemName, item, x, y) {
    const playerScrap = player?.scrap ?? 0;
    const currentQuantity = itemName === 'missiles' ? (player?.missiles ?? 0) : (item.quantity ?? 0);
    const atMax = itemName === 'missiles' && currentQuantity >= MAX_MISSILES;
    const canAfford = !atMax && playerScrap >= item.costPerUnit;

    noStroke();
    fill(27, 33, 42, 240);
    rect(x, y, CARD_W, CARD_H, 7);

    stroke(canAfford ? color(156, 235, 160) : color(109, 109, 109));
    strokeWeight(1.8);
    noFill();
    rect(x, y, CARD_W, CARD_H, 7);

    textAlign(LEFT, TOP);
    textSize(18);
    fill(234, 246, 248);
    noStroke();
    text(item.description.toUpperCase(), x + 12, y + 10);

    textSize(13);
    fill(149, 177, 182);
    text("Single-use guided projectile", x + 12, y + 34, CARD_W - 24);

    fill(174, 205, 211);
    text(`OWNED ${currentQuantity}`, x + 12, y + 74);

    drawScrapCost(item.costPerUnit, x + 6, y + 126, canAfford);

    textAlign(RIGHT, CENTER);
    textSize(12);
    fill(canAfford ? color(148, 252, 165) : color(129, 129, 129));
    const actionText = atMax ? "MAX CAPACITY" : (canAfford ? "CLICK TO BUY +1" : "INSUFFICIENT MATERIALS");
    text(actionText, x + CARD_W - 12, y + 126);
  }

  //--------------------------------------
  // SHOP DISPLAY
  //--------------------------------------
  function drawWorkshopUI() {
    noStroke();
    fill(2, 8, 14, 210);
    rect(0, 0, width, height);

    const layout = getLayout();
    const { panelX, panelY } = layout;

    drawTechFrame(panelX, panelY, PANEL_W, PANEL_H, "WORKSHOP", 54);

    const sectionBarW = layout.rightPanel.x - panelX - 36 - 8;
    const sysBarTop = panelY + 86, sysBarH = 38;
    noStroke();
    fill(28, 42, 54, 220);
    rect(panelX + 36, sysBarTop, sectionBarW, sysBarH, 4);
    noStroke();
    fill(220, 237, 242);
    textAlign(LEFT, CENTER);
    textSize(20);
    text("SYSTEMS", panelX + 50, sysBarTop + sysBarH / 2);

    const subBarTop = panelY + 316, subBarH = 38;
    noStroke();
    fill(24, 38, 50, 220);
    rect(panelX + 36, subBarTop, sectionBarW, subBarH, 4);
    noStroke();
    fill(220, 237, 242);
    textAlign(LEFT, CENTER);
    textSize(20);
    text("SUBSYSTEMS", panelX + 50, subBarTop + subBarH / 2);

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
    textSize(16);
    textAlign(LEFT, TOP);

    // Scrap row — highlighted box
    const scrapIcon = getScrapIcon?.();
    const iconSize = 25;
    const boxX = info.x + 16, boxY = info.y + 60, boxW = info.w - 32, boxH = 32;
    noStroke();
    fill(12, 23, 31, 200);
    rect(boxX, boxY, boxW, boxH, 4);
    stroke(126, 220, 224, 140);
    strokeWeight(1.2);
    noFill();
    rect(boxX, boxY, boxW, boxH, 4);
    noStroke();

    const scrapRowY = boxY + boxH / 2;
    if (scrapIcon) {
      tint(255, 200, 50);
      image(getGoldScrapIcon() ?? scrapIcon, boxX + 8, scrapRowY - iconSize / 2, iconSize, iconSize);
      noTint();
    }
    fill(255, 223, 136);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(`Scrap: ${player?.scrap ?? 0}`, boxX + 8 + (scrapIcon ? iconSize + 5 : 0), scrapRowY);

    fill(190, 228, 236);
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Missiles: ${player?.missiles ?? 0}`, info.x + 24, info.y + 102);
    text(`Power Lvl: ${player?.upgrades?.power ?? 1}`, info.x + 24, info.y + 134);
    text(`Torch Lvl: ${player?.upgrades?.torch ?? 1}`, info.x + 24, info.y + 166);
    text(`Sonar Lvl: ${player?.upgrades?.sonar ?? 1}`, info.x + 24, info.y + 198);

    fill(116, 160, 171);
    textSize(14);
    const shopKey = keyLabel(CONTROLS.MODES[controlMode].TOGGLE_WORKSHOP);
    text(`Click any card to buy. Press ${shopKey} or close to return.`, info.x + 24, info.y + 275, info.w - 48, 80);

    drawButton(
      `CLOSE (${shopKey})`,
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

    const playerScrap = player?.scrap ?? 0;
    if (playerScrap < upgrade.cost) {
      console.log(`❌ Not enough scrap for ${upgradeName} upgrade. Need: ${upgrade.cost}, Have: ${playerScrap}`);
      return false;
    }

    // Deduct scrap
    player.scrap -= upgrade.cost;

    // Increment upgrade level
    if (player.upgrades && upgradeName in player.upgrades) {
      player.upgrades[upgradeName]++;
    }

    // Power upgrade: restore current power immediately for a satisfying feedback loop
    if (upgradeName === 'power' && player.power) {
      const bonus = player.power.upgradeBonusPerLevel ?? 20;
      player.power.current = Math.min(player.power.current + bonus * 1.5, player.power.maxPower);
    }

    // Update shop display
    upgrade.level++;
    upgrade.cost = Math.ceil(upgrade.cost * 1.5); // Increase cost for next level
    
    soundSystem?.play('upgrade', 0.6);
    console.log(`✓ Purchased ${upgradeName} upgrade! New level: ${upgrade.level}, Scrap left: ${player.scrap}`);
    return true;
  }

  function attemptItemPurchase(itemName, quantity = 1) {
    const item = items[itemName];
    if (!item) return false;
    if (itemName === 'missiles' && (player?.missiles ?? 0) >= MAX_MISSILES) {
      console.log(`❌ Cannot buy more missiles. Max reached: ${MAX_MISSILES}`);
      return false;
    }

    const totalCost = item.costPerUnit * quantity;
    const playerScrap = player?.scrap ?? 0;
    if (playerScrap < totalCost) {
      console.log(`❌ Not enough scrap for ${quantity}x ${itemName}. Need: ${totalCost}, Have: ${playerScrap}`);
      return false;
    }

    // Deduct scrap
    player.scrap -= totalCost;
    
    // Add to inventory
    if (itemName === 'missiles') {
      player.missiles = (player.missiles ?? 0) + quantity;
    }
    
    // Update shop display
    item.quantity += quantity;
    
    soundSystem?.play('upgrade', 0.6);
    console.log(`✓ Purchased ${quantity}x ${itemName}! Total owned: ${item.quantity}, Scrap left: ${player.scrap}`);
    return true;
  }

  //--------------------------------------
  // CLICK HANDLING
  //--------------------------------------
  function handleClick() {
    if (!workshopOpen) return;

    console.log(`[workshop] click detected at mouseX=${mouseX}, mouseY=${mouseY}, scrap=${player?.scrap ?? 0}`);

    const layout = getLayout();

    if (isOver(layout.closeButton.x, layout.closeButton.y, layout.closeButton.w, layout.closeButton.h)) {
      console.log('[workshop] close button clicked');
      workshopOpen = false;
      return;
    }

    for (const card of layout.upgradeCards) {
      if (isOver(card.x, card.y, card.w, card.h)) {
        console.log(`[workshop] upgrade card clicked: ${card.key}`);
        attemptUpgradePurchase(card.key);
        return;
      }
    }

    for (const card of layout.itemCards) {
      if (isOver(card.x, card.y, card.w, card.h)) {
        console.log(`[workshop] item card clicked: ${card.key}`);
        attemptItemPurchase(card.key, 1);
        return;
      }
    }

    console.log('[workshop] click did not hit any button');
  }

  //--------------------------------------
  // SYSTEM INTERFACE
  //--------------------------------------
  return {
    // STATE QUERIES
    isWorkshopOpen() {
      return workshopOpen;
    },

    setControlMode(mode) {
      if (CONTROLS.MODES[mode]) controlMode = mode;
    },

    // STATE CONTROL
    toggleWorkshop() {
      workshopOpen = !workshopOpen;
    },

    openWorkshop() {
      workshopOpen = true;
    },

    closeWorkshop() {
      workshopOpen = false;
    },

    // ENGINE INTERFACE
    update() {
      // Update logic here if needed
      // Currently workshop is stateless except for open/closed
    },

    draw() {
      if (!workshopOpen) return;
      drawWorkshopUI();
    },

    // INPUT INTERFACE
    onMousePressed() {
      if (!workshopOpen) return;
      handleClick();
    },

    reset() {
      workshopOpen = false;
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
  const MAX_MISSILES = MISSILE.MAX_CONCURRENT ?? 5;
