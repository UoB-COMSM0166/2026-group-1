/*
========================================
VERSION: 3.0
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Draws room background, platforms, player, UI.
  and ligthing

- Power modifiers added by Monal
- Hitbox debug by Nick
- drawLighting edited by jude
- UI re-written by jude
  . Replaced the raw text digits with a 5-segment battery bar where each block represents 20% power.
  . Relocated the power bar to the top-right corner.
  . Added a positive terminal "nub" to the right side of the main casing.
  . Converted the torch status from text ("Torch: ON") into a circular indicator light that toggles between bright and dim mustard yellow depending on the active state.
  . Semi-Transparency
========================================
*/

import { DEBUG_COLOR } from "../config.js";

//======================================
// RENDER SYSTEM
//======================================
export function createRenderSystem({
  player,
  getCamera,
  getUIData,
  getPlatforms,
  getHazards,
  getCollectables,
  getTriggers,
  getEntities,
  getSpawnPoints,
  getTilesets,
  getTileSize,
  getBackground,
  getPlatformColor,
  assets,
  darknessLayer,
  getLightSources,
}) {
  let elapsedTime = 0;
  const oscillationSpeed = 2; // Hz
  const oscillationAmount = 10; // pixels

  //======================================
  // DRAW GAME
  //======================================
  function normalizeRelativePath(basePath, relativePath) {
    const baseParts = String(basePath).split("/").filter(Boolean);
    const relParts = String(relativePath ?? "")
      .split("/")
      .filter(Boolean);
    for (const part of relParts) {
      if (part === ".") continue;
      if (part === "..") {
        baseParts.pop();
        continue;
      }
      baseParts.push(part);
    }
    return baseParts.join("/");
  }

  function tilesetSourceToImagePath(source) {
    if (!source) return null;
    return normalizeRelativePath("data/rooms", source).replace(
      /\.tsx$/i,
      ".png",
    );
  }

  function getTilesetForGid(gid, tilesets = []) {
    if (
      !Number.isFinite(gid) ||
      gid <= 0 ||
      !Array.isArray(tilesets) ||
      !tilesets.length
    )
      return null;
    let best = null;
    for (const tileset of tilesets) {
      const firstgid = Number(tileset?.firstgid ?? 0);
      if (!firstgid || gid < firstgid) continue;
      if (!best || firstgid > best.firstgid) {
        best = { ...tileset, firstgid };
      }
    }
    return best;
  }

  function getObjectRect(obj) {
    if (!obj) return null;
    if (
      typeof obj.getCornerX === "function" &&
      typeof obj.getCornerY === "function"
    ) {
      return {
        x: obj.getCornerX(),
        y: obj.getCornerY(),
        w: obj.getWidth(),
        h: obj.getHeight(),
      };
    }
    const tileSize = getTileSize?.() ?? {};
    const fallbackW = tileSize.tileWidth ?? 16;
    const fallbackH = tileSize.tileHeight ?? 16;
    const w = obj.w ?? obj.width ?? fallbackW;
    const h = obj.h ?? obj.height ?? fallbackH;
    const cx = obj.x ?? 0;
    const cy = obj.y ?? 0;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  function drawSpriteFromTileset(obj) {
    const gid = Number(obj?.gid);
    if (!Number.isFinite(gid)) return false;

    const tilesets = getTilesets?.() ?? [];
    const tileset = getTilesetForGid(gid, tilesets);
    if (!tileset) return false;

    if (
      String(tileset.source ?? "")
        .toLowerCase()
        .endsWith("backgrounds.tsx")
    ) {
      return false;
    }

    const imagePath = tilesetSourceToImagePath(tileset.source);
    const tilesetImage = imagePath ? assets?.[`tileset:${imagePath}`] : null;
    if (!tilesetImage) return false;

    const rect = getObjectRect(obj);
    if (!rect) return false;

    const tileSize = getTileSize?.() ?? {};
    const tileWidth = tileSize.tileWidth ?? tileset.tilewidth ?? 16;
    const tileHeight = tileSize.tileHeight ?? tileset.tileheight ?? 16;
    const localTileId = gid - Number(tileset.firstgid);
    const columns =
      Number(tileset.columns) ||
      Math.max(1, Math.floor(tilesetImage.width / tileWidth));
    const srcX = (localTileId % columns) * tileWidth;
    const srcY = Math.floor(localTileId / columns) * tileHeight;

    image(
      tilesetImage,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      srcX,
      srcY,
      tileWidth,
      tileHeight,
    );
    return true;
  }

  //===BACKGROUND===//
  function drawBackground() {
    const bg = getBackground?.();

    if (bg?.color) {
      background(bg.color);
    } else {
      background(0);
    }

    if (bg?.image && assets?.[bg.image]) {
      image(assets[bg.image], 0, 0, width, height);
    }
  }

  //===TERRAIN===//
  function drawPlatforms() {
    const platforms = getPlatforms?.() ?? [];
    const platformColor = getPlatformColor?.() ?? "#5a6e82";

    noStroke();
    fill(platformColor);

    for (const p of platforms) {
      if (drawSpriteFromTileset(p)) continue;
      rect(p.getCornerX(), p.getCornerY(), p.getWidth(), p.getHeight());
    }
  }

  //=== HAZARDS ===//
  function drawHazards() {
    const hazards = getHazards?.() ?? [];
    if (!hazards.length) return;

    noStroke();
    fill(220, 70, 70, 180);
    rectMode(CENTER);
    for (const hazard of hazards) {
      if (hazard.visible === false) continue;
      if (drawSpriteFromTileset(hazard)) continue;
      rect(hazard.x, hazard.y, hazard.w, hazard.h);
    }
    rectMode(CORNER);
  }

  //=== COLLECTABLES ===//
  function drawCollectables() {
    const collectables = getCollectables?.() ?? [];
    if (!collectables.length) return;

    noStroke();
    fill(255, 225, 80, 220);
    for (const item of collectables) {
      if (item.visible === false) continue;
      if (drawSpriteFromTileset(item)) continue;
      ellipse(item.x, item.y, Math.max(8, item.w), Math.max(8, item.h));
    }
  }

  //=== TRIGGERS ===//
  function drawTriggers() {
    const triggers = getTriggers?.() ?? [];
    if (!triggers.length) return;

    noFill();
    stroke(140, 180, 255, 180);
    strokeWeight(1);
    rectMode(CENTER);
    for (const trigger of triggers) {
      if (trigger.visible === false) continue;
      if (drawSpriteFromTileset(trigger)) continue;
      rect(trigger.x, trigger.y, trigger.w, trigger.h);
    }
    rectMode(CORNER);
    noStroke();
  }

  //=== ENTITIES ===//
  function drawEntities() {
    const entities = getEntities?.() ?? [];
    if (!entities.length) return;

    noStroke();
    fill(180, 110, 230, 210);
    for (const entity of entities) {
      if (entity.visible === false) continue;
      if (entity.properties?.spawnId != null) continue;
      if (drawSpriteFromTileset(entity)) continue;
      rect(
        entity.x - entity.w / 2,
        entity.y - entity.h / 2,
        entity.w,
        entity.h,
      );
    }
  }

  //=== SPAWNS ===//
  function drawSpawnPoints() {
    const spawnPoints = getSpawnPoints?.() ?? [];
    if (!spawnPoints.length) return;

    for (const spawn of spawnPoints) {
      if (drawSpriteFromTileset(spawn)) continue;
      const isPlayerSpawn =
        String(spawn.spawnId ?? "").toLowerCase() === "default";
      noStroke();
      fill(isPlayerSpawn ? color(80, 255, 130, 220) : color(255, 130, 80, 220));
      triangle(
        spawn.x,
        spawn.y - 8,
        spawn.x - 7,
        spawn.y + 6,
        spawn.x + 7,
        spawn.y + 6,
      );
    }
  }

  //===PLAYER===//
  function drawPlayer() {
    stroke(150, 0, 25);
    fill(225, 0, 50);
    rect(
      player.getCornerX(),
      player.getCornerY(),
      player.getWidth(),
      player.getHeight(),
    );
  }

  //===LIGHTING===//
  function drawLighting(lightSources = []) {
    const cam = getCamera?.() ?? { x: 0, y: 0 };

    darknessLayer.clear();
    darknessLayer.background(0);

    const ctx = darknessLayer.drawingContext;
    ctx.globalCompositeOperation = "destination-out";

    for (const light of lightSources) {
      const screenX = light.x - cam.x;
      const screenY = light.y - cam.y;

      const { x, y, radius, intensity = 1 } = light;
      const scaledRadius = radius * (0.8 + 0.2 * intensity);
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        scaledRadius * 0.1,
        screenX,
        screenY,
        scaledRadius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    image(darknessLayer, 0, 0);
  }

  function drawUI() {
    const ui = getUIData?.();
    if (!ui) return;

    // ==========================================
    // 1. TORCH INDICATOR
    // ==========================================
    noStroke();
    if (ui.torch.isOn) {
      fill(255, 215, 0, 200); // Bright mustard
    } else {
      fill(100, 85, 0, 200); // Dim/Dark mustard
    }

    circle(30, 30, 35);

    fill(255);
    // textSize(14);
    // text("Torch", 45, 35);

    // ==========================================
    // 2. SEGMENTED POWER BAR (Battery Style)
    // ==========================================
    const totalSegments = 5; // Reduced from 10 to 5 (20% per segment)
    const segmentW = 14;
    const segmentH = 22;
    const gap = 4;
    const padding = 5;

    // --- 1. Calculate Dimensions & Position ---
    const frameW =
      totalSegments * segmentW + (totalSegments - 1) * gap + padding * 2;
    const frameH = segmentH + padding * 2;

    // Define the nub dimensions first so we can use them for positioning
    const nubW = 8;
    const nubH = frameH * 0.6;

    // Position: Top Right Corner
    const rightMargin = 20;
    // Subtract both the frame AND the nub from the screen width
    const startX = width - frameW - nubW - rightMargin;
    const startY = 18;

    // --- 2. Draw the Battery Casing & Nub ---
    // Shared styling for the battery container (semi-transparent)
    stroke(120, 180); // Silver border with opacity
    strokeWeight(2);
    fill(30, 30, 40, 150); // Dark background with opacity

    // A. The Main Casing
    // 5 applies rounded corners to all 4 sides
    rect(startX, startY, frameW, frameH, 5);

    // B. The "Nub" (Positive Terminal) on the right
    const nubX = startX + frameW; // Place it immediately to the right of the casing
    const nubY = startY + (frameH - nubH) / 2; // Center it vertically
    // 0, 4, 4, 0 applies rounding ONLY to the top-right and bottom-right corners
    rect(nubX, nubY, nubW, nubH, 0, 4, 4, 0);

    // --- 3. Draw the Inner Segments ---
    const activeSegments = Math.ceil(ui.power.percentage * totalSegments);
    const isLowPower = ui.power.percentage <= 0.25;
    const isFlashing = millis() % 500 < 250;

    noStroke(); // Turn off borders for segments

    const innerStartX = startX + padding;
    const innerStartY = startY + padding;

    for (let i = 0; i < totalSegments; i++) {
      const currentX = innerStartX + i * (segmentW + gap);

      if (i < activeSegments) {
        // Active Segment
        if (isLowPower) {
          // Flash red/dark red with opacity
          fill(isFlashing ? color(255, 50, 50, 200) : color(120, 0, 0, 200));
        } else {
          // Normal whitish-blue with opacity
          fill(150, 220, 255, 200);
        }
      } else {
        // Empty Segment (dark grey with opacity)
        fill(60, 60, 70, 150);
      }

      rect(currentX, innerStartY, segmentW, segmentH, 2);
    }
  }

  //======================================
  // VISUAL DEBUG HELPERS
  //======================================
  //===HITBOX-DEBUG===//
  // draw by changing DRAW to true in config, shows hitbox boundaries
  function debugHitbox(drawThis) {
    if (drawThis) {
      let walls = getPlatforms();
      for (let i in walls) {
        walls[i].debugDrawHitbox(DEBUG_COLOR.WALL);
      }
      player.debugDrawHitbox(DEBUG_COLOR.PLAYER);
    }
  }

  //======================================
  // DRAW EVERYTHING
  //======================================
  return {
    draw(deltaTime) {
      elapsedTime += deltaTime;
      const lightSources = getLightSources?.() ?? [];

      const camera = getCamera?.();
      push();
      if (camera) {
        translate(-camera.x, -camera.y);
      }

      drawBackground();
      drawPlatforms();
      drawHazards();
      drawCollectables();
      drawTriggers();
      drawEntities();
      drawSpawnPoints();
      drawPlayer();
      debugHitbox(DEBUG_COLOR.DRAW);

      pop();

      // drawLighting(lightSources);
      drawUI();
    },
  };
}
//======================================
// END
//======================================
