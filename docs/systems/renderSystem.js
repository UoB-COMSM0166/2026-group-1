/*
========================================
VERSION: 3.0
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Draws room background, platforms, player, UI.
  and ligthing

- Power modifiers, enemy stuff added by Monal
- Hitbox debug by Nick
========================================
*/

import { DEBUG_COLOR, COMBAT, MISSILE, HUD_DIALS, RENDER, CONTROLS, keyLabel } from "../config.js";

// Horizontal squash applied to body glow — gives the tall narrow oval shape
const JELLY_BODY_ASPECT = 0.42;
// Horizontal stretch applied to head glow — wider than tall to match dome shape
const JELLY_HEAD_ASPECT = 1.5;

// Jellyfish bioluminescent colour palette — magenta → pink → purple → lilac → blue
const JELLY_PALETTE = [
  [255,  60, 180],  // magenta
  [255, 140, 210],  // pink
  [200,  80, 255],  // purple
  [200, 160, 255],  // lilac
  [100, 120, 255],  // blue
];
function jellyColour(t) {
  const n = JELLY_PALETTE.length;
  const pos = (((t % 1) + 1) % 1) * n;
  const i   = Math.floor(pos) % n;
  const f   = pos - Math.floor(pos);
  const prev = JELLY_PALETTE[i];
  const next = JELLY_PALETTE[(i + 1) % n];
  return [
    Math.round(prev[0] + (next[0] - prev[0]) * f),
    Math.round(prev[1] + (next[1] - prev[1]) * f),
    Math.round(prev[2] + (next[2] - prev[2]) * f),
  ];
}

//======================================
// RENDER SYSTEM
//======================================
export function createRenderSystem({
   player,
   getPlatforms,
   getHazards,
   getCollectables,
   getEnemies,
   getCrabs,
   getJellyfish,
   getTriggers,
   getEntities,
   getSpawnPoints,
   getTilesets,
   getTileSize,
   getBackground,
   getPlatformColor,
   getSonarReveals,
   getSonarHazardReveals,
   getSonarCollectableReveals,
   getSonarEnemyReveals,
   getSonarCooldown,
   assets,
   darknessLayer,
   getLightSources,
   getActivePulses,
   getRevealedWalls,
   getCameraOffset,
   getOldCamPosition,
   getCameraScale,
   getMissiles,
   getMissileTarget,
   getMissileFireFeedback,
   getParticles,
   getBurstParticles,
   getPiranhas,
   getGlowObjects,
   drawMiniMap,
   getHudDialSettings,
   getGameplayOverlay,
   getGameplayOverlaySettings,
   getScrapIcon,
   getPowerCellSprite,
   getScrapSprite,
   getSkyBand,
   getVisualLayers,
   getTorchOn,
}) {

//======================================
// DRAW GAME
//======================================
   function normalizeRelativePath(basePath, relativePath) {
      const baseParts = String(basePath).split('/').filter(Boolean);
      const relParts = String(relativePath ?? '').split('/').filter(Boolean);
      for (const part of relParts) {
         if (part === '.') continue;
         if (part === '..') {
            baseParts.pop();
            continue;
         }
         baseParts.push(part);
      }
      return baseParts.join('/');
   }

   function tilesetSourceToImagePath(source, mapDir = 'data/rooms') {
      if (!source) return null;
      return normalizeRelativePath(mapDir, source).replace(/\.tsx$/i, '.png');
   }

   function getTilesetForGid(gid, tilesets = []) {
      if (!Number.isFinite(gid) || gid <= 0 || !Array.isArray(tilesets) || !tilesets.length) return null;
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
      if (typeof obj.getCornerX === 'function' && typeof obj.getCornerY === 'function') {
         return {
            x: obj.getCornerX(),
            y: obj.getCornerY(),
            w: obj.getWidth(),
            h: obj.getHeight()
         };
      }
      const tileSize = getTileSize?.() ?? {};
      const fallbackW = tileSize.tileWidth ?? 16;
      const fallbackH = tileSize.tileHeight ?? 16;
      const w = obj.w ?? obj.width ?? fallbackW;
      const h = obj.h ?? obj.height ?? fallbackH;
      const cx = obj.x ?? 0;
      const cy = obj.y ?? 0;
      return { x: cx - (w / 2), y: cy - (h / 2), w, h };
   }

   function drawSpriteFromTileset(obj) {
      const gid = Number(obj?.gid);
      if (!Number.isFinite(gid)) return false;

      const tilesets = getTilesets?.() ?? [];
      const tileset = getTilesetForGid(gid, tilesets);
      if (!tileset) return false;

      if (String(tileset.source ?? '').toLowerCase().endsWith('backgrounds.tsx')) {
         return false;
      }

      const rect = getObjectRect(obj);
      if (!rect) return false;

      const localTileId = gid - Number(tileset.firstgid);
      const collectionTileImagePath = tileset?.tileImagesById?.[localTileId]?.resolvedImagePath;
      if (collectionTileImagePath) {
         const collectionTileImage = assets?.[`tileset:${collectionTileImagePath}`];
         if (!collectionTileImage) {
            console.warn(`[renderSystem] Missing tile image for path: "${collectionTileImagePath}" (source: "${tileset.source}")`);
            return false;
         }
         image(collectionTileImage, rect.x, rect.y, rect.w, rect.h);
         return true;
      }

      const imagePath = tileset.resolvedImagePath ?? tilesetSourceToImagePath(tileset.source);
      const tilesetImage = imagePath ? assets?.[`tileset:${imagePath}`] : null;
      // Validate the atlas image is actually loaded (p5.js creates a zero-size placeholder on 404)
      if (!tilesetImage || !(tilesetImage.width > 0)) {
         console.warn(`[renderSystem] Missing or unloaded tileset image for path: "${imagePath}" (source: "${tileset.source}")`);
         return false;
      }

      const tileSize = getTileSize?.() ?? {};
      const tileWidth = tileSize.tileWidth ?? tileset.tilewidth ?? 16;
      const tileHeight = tileSize.tileHeight ?? tileset.tileheight ?? 16;
      const columns = Number(tileset.columns) || Math.max(1, Math.floor(tilesetImage.width / tileWidth));
      const srcX = (localTileId % columns) * tileWidth;
      const srcY = Math.floor(localTileId / columns) * tileHeight;

      image(tilesetImage, rect.x, rect.y, rect.w, rect.h, srcX, srcY, tileWidth, tileHeight);
      return true;
   }

   function drawTileGidAt(gid, x, y, tileW, tileH) {
      const tilesets = getTilesets?.() ?? [];
      const tileset = getTilesetForGid(gid, tilesets);
      if (!tileset) return;

      const localTileId = gid - Number(tileset.firstgid);
      const collectionPath = tileset?.tileImagesById?.[localTileId]?.resolvedImagePath;
      if (collectionPath) {
         const collectionTileImage = assets?.[`tileset:${collectionPath}`];
         if (collectionTileImage) image(collectionTileImage, x, y, tileW, tileH);
         return;
      }

      const imagePath = tileset.resolvedImagePath ?? tilesetSourceToImagePath(tileset.source);
      const tilesetImage = imagePath ? assets?.[`tileset:${imagePath}`] : null;
      if (!tilesetImage || !(tilesetImage.width > 0)) return;

      const columns = Number(tileset.columns) || Math.max(1, Math.floor(tilesetImage.width / tileW));
      const srcX = (localTileId % columns) * tileW;
      const srcY = Math.floor(localTileId / columns) * tileH;
      image(tilesetImage, x, y, tileW, tileH, srcX, srcY, tileW, tileH);
   }

   function drawVisualTileLayer(layerData) {
      if (!layerData) return;
      const { data, width, height } = layerData;
      if (!data || !width || !height) return;
      const tileSize = getTileSize?.() ?? {};
      const tileW = tileSize.tileWidth ?? 16;
      const tileH = tileSize.tileHeight ?? 16;
      for (let ty = 0; ty < height; ty++) {
         for (let tx = 0; tx < width; tx++) {
            const gid = data[ty * width + tx];
            if (!gid) continue;
            drawTileGidAt(gid, tx * tileW, ty * tileH, tileW, tileH);
         }
      }
   }

   function drawVisualLayers() {
      const layers = getVisualLayers?.() ?? null;
      if (!layers) return;
      const torchOn = getTorchOn?.() ?? false;
      if (torchOn) {
         drawVisualTileLayer(layers.combined ?? layers.terrain);
      } else {
         drawVisualTileLayer(layers.terrain);
         drawVisualTileLayer(layers.walls);
      }
   }

   function getCollectableType(item) {
      const explicitType = String(item?.collectableType ?? '').toLowerCase();
      if (explicitType) return explicitType;

      const gid = Number(item?.gid);
      if (!Number.isFinite(gid) || gid <= 0) return null;

      const tilesets = getTilesets?.() ?? [];
      const tileset = getTilesetForGid(gid, tilesets);
      if (!tileset) return null;

      const localTileId = gid - Number(tileset.firstgid);
      if (!Number.isFinite(localTileId) || localTileId < 0) return null;

      const tileProps = tileset?.tilePropertiesById?.[localTileId] ?? null;
      const type = String(tileProps?.collectableType ?? '').toLowerCase();
      if (type) return type;

      // Fallback for prototype tileset ids when metadata is absent at runtime.
      if (localTileId === 41) return 'power';
      if (localTileId === 20) return 'scrap';
      return null;
   }

   function getCollectableColorByType(collectableType, alpha = 220) {
      if (collectableType === 'power') return color(80, 175, 255, alpha);
      if (collectableType === 'scrap') return color(255, 235, 182, alpha);
      return color(80, 175, 255, alpha);
   }

//===SKY BAND===//
   function drawSkyBand(band) {
      if (!band) return;
      noStroke();
      fill(band.color ?? '#87CEEB');
      rectMode(CORNER);
      rect(0, band.y ?? 0, band.width ?? 10000, band.height);
   }

//===WATER GRADIENT===//
   function drawWaterGradient(oldCam, cam, camScale, alpha, band) {
      const wg = band?.waterGradient;
      if (!wg) return;
      const interpCamY = renderInterpolate(oldCam.y, cam.y, alpha);
      const sTop = (wg.worldTop - interpCamY) * camScale;
      const sBot = (wg.worldBot - interpCamY) * camScale;
      const vTop = Math.max(0, sTop);
      const vBot = Math.min(height, sBot);
      if (vBot <= vTop) return;
      const ctx = drawingContext;
      const grad = ctx.createLinearGradient(0, sTop, 0, sBot);
      grad.addColorStop(0, wg.topColor);
      grad.addColorStop(1, wg.bottomColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, vTop, width, vBot - vTop);
   }

//===BACKGROUND===//
   function drawBackground() {
      const bg = getBackground?.();

      if (bg?.color) {
         background(bg.color);
      } else {
         background('#021B3A');
      }

      if (bg?.image && assets?.[bg.image]) {
         image(assets[bg.image], 0, 0, width, height);
      }
   }

   // White-then-red flash overlay matching the player hit response.
   // For enemies pass isRect=false (ellipse), for walls pass isRect=true (rect).
   function drawDamageFlash(entity, cx, cy, w, h, isRect = false) {
      if (entity.damageFlashTime == null) return;
      const elapsed = millis() - entity.damageFlashTime;
      const duration = COMBAT.DAMAGE_FLASH_DURATION_MS;
      if (elapsed >= duration) return;
      const whitePhase = duration * 0.25;
      noStroke();
      if (elapsed < whitePhase) {
         fill(255, 255, 255, 180);
      } else {
         const t = (elapsed - whitePhase) / (duration - whitePhase);
         fill(255, 50, 50, 150 * (1 - t));
      }
      if (isRect) {
         rectMode(CORNER);
         rect(cx - w / 2, cy - h / 2, w, h);
      } else {
         ellipse(cx, cy, w * 1.4, h * 1.4);
      }
   }

   //===TERRAIN===//
   function drawPlatforms() {
      const platforms = getPlatforms?.() ?? [];
      const platformColor = getPlatformColor?.() ?? '#5a6e82ff';
      const hasWallsLayer = !!(getVisualLayers?.()?.walls);

      noStroke();
      fill(platformColor);

     // todo: move the fill logic inside the loop and support per-platform colors via properties, with the default as the global platform color.

      for (const p of platforms) {
         if (p.isDestroyed) {
            if (p.isBreakable) {
               const cx = p.getCornerX() + p.getWidth() / 2;
               const cy = p.getCornerY() + p.getHeight() / 2;
               drawDamageFlash(p, cx, cy, p.getWidth(), p.getHeight(), true);
            }
            continue;
         }
         // Non-breakable collision rects are a fallback — skip when walls visual layer is loaded.
         // Breakable walls always render so they remain visible until destroyed.
         if (hasWallsLayer && !p.isBreakable) continue;
         if (drawSpriteFromTileset(p)) {
            if (p.isBreakable) {
               const cx = p.getCornerX() + p.getWidth() / 2;
               const cy = p.getCornerY() + p.getHeight() / 2;
               drawDamageFlash(p, cx, cy, p.getWidth(), p.getHeight(), true);
            }
            continue;
         }
         fill(platformColor);
         rect(p.getCornerX(), p.getCornerY(), p.getWidth(), p.getHeight());
         if (p.isBreakable) {
            const cx = p.getCornerX() + p.getWidth() / 2;
            const cy = p.getCornerY() + p.getHeight() / 2;
            drawDamageFlash(p, cx, cy, p.getWidth(), p.getHeight(), true);
         }
      }
   }

   // Returns true when the tile at (col, row) in the terrain visual layer is solid.
   function isTileOccupied(col, row) {
      const terrain = getVisualLayers?.()?.terrain;
      if (!terrain?.data) return false;
      const { data, width, height } = terrain;
      if (col < 0 || col >= width || row < 0 || row >= height) return false;
      return data[row * width + col] !== 0;
   }

   // Returns the direction the spike tips should point ('up'|'down'|'left'|'right')
   // by checking which side of the hazard (cx, cy, w, h) has solid terrain.
   // allHazards is used to detect vertical columns — spikes in a column always face
   // away from their vertical wall even when a horizontal wall is also adjacent.
   function detectSpikeDirection(cx, cy, w, h, allHazards = []) {
      const tileSize = getTileSize?.() ?? {};
      const tW = tileSize.tileWidth  ?? 16;
      const tH = tileSize.tileHeight ?? 16;
      const col   = Math.floor(cx / tW);
      const row   = Math.floor(cy / tH);
      const above = isTileOccupied(col, Math.floor((cy - h / 2 - 1) / tH));
      const below = isTileOccupied(col, Math.floor((cy + h / 2 + 1) / tH));
      const left  = isTileOccupied(Math.floor((cx - w / 2 - 1) / tW), row);
      const right = isTileOccupied(Math.floor((cx + w / 2 + 1) / tW), row);

      // At a corner where both a vertical wall and a horizontal wall are adjacent,
      // check if there's a neighbouring spike in the same vertical column.
      // If so, this spike belongs to a wall column and must face away from the wall.
      if ((left || right) && (above || below)) {
         const inVerticalColumn = allHazards.some(h2 =>
            !(Math.abs(h2.x - cx) < 0.1 && Math.abs(h2.y - cy) < 0.1) &&
            Math.abs(h2.x - cx) <= tW / 2 &&
            Math.abs(h2.y - cy) <= h + tH / 2
         );
         if (inVerticalColumn) {
            if (left  && !right) return 'right';
            if (right && !left)  return 'left';
         }
      }

      if (above && !below) return 'down';
      if (below && !above) return 'up';
      if (left  && !right) return 'right';
      if (right && !left)  return 'left';
      return 'up';
   }

   // Draws 2 triangular spikes per tile along the hazard edge, tips pointing in
   // direction ('up'|'down'|'left'|'right'). Box given as corner (x, y, w, h).
   function drawSpikes(x, y, w, h, r, g, b, alpha, direction = 'up') {
      const tileSize = getTileSize?.() ?? {};
      const tileW = tileSize.tileWidth  ?? 16;
      const tileH = tileSize.tileHeight ?? 16;
      noStroke();
      fill(r, g, b, alpha);

      if (direction === 'up' || direction === 'down') {
         const count  = Math.max(2, Math.round(w / tileW) * 2);
         const spikeW = w / count;
         const tip    = direction === 'down' ? y + h : y;
         const base   = direction === 'down' ? y     : y + h;
         for (let i = 0; i < count; i++) {
            const left = x + i * spikeW;
            triangle(left, base,  left + spikeW, base,  left + spikeW / 2, tip);
         }
      } else {
         const count  = Math.max(2, Math.round(h / tileH) * 2);
         const spikeH = h / count;
         const tip    = direction === 'right' ? x + w : x;
         const base   = direction === 'right' ? x     : x + w;
         for (let i = 0; i < count; i++) {
            const top = y + i * spikeH;
            triangle(base, top,  base, top + spikeH,  tip, top + spikeH / 2);
         }
      }
   }

   //=== HAZARDS ===//
   function drawHazards() {
      const hazards = getHazards?.() ?? [];
      if (!hazards.length) return;

      for (const hazard of hazards) {
         if (hazard.visible === false) continue;
         const dir = detectSpikeDirection(hazard.x, hazard.y, hazard.w, hazard.h, hazards);
         drawSpikes(
            hazard.x - hazard.w / 2, hazard.y - hazard.h / 2,
            hazard.w, hazard.h,
            120, 120, 130, 200, dir
         );
      }
   }

   //=== COLLECTABLES ===//
   function drawCollectables() {
      const collectables = getCollectables?.() ?? [];
      if (!collectables.length) return;

      const powerCell = getPowerCellProcessed();
      const scrapSprite = getScrapSpriteProcessed();

      noStroke();
      for (const item of collectables) {
         if (item.visible === false) continue;
         const collectableType = getCollectableType(item);

         // Use custom power-cell sprite — hitbox stays 1 tile, image drawn larger
         if (collectableType === 'power' && powerCell) {
            const tileSize = Math.max(8, item.w);
            const drawSize = tileSize * 1.8;
            const cy = item.y - tileSize * 0.3;

            // Blue/cyan/aqua cycling glow rings
            const pdx = item.x - (player.position?.x ?? player.x ?? 0);
            const pdy = item.y - (player.position?.y ?? player.y ?? 0);
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            const proximity = Math.max(0, Math.min(1, (180 - pdist) / 120));
            if (proximity > 0) {
               const pulse = 0.75 + 0.25 * Math.sin(millis() / 700);
               const glowAlpha = pulse * proximity;

               // Returns [r,g,b] for a given phase in the blue→cyan→aqua cycle
               const cycleRGB = (phase) => {
                  const c = ((phase % 1) + 1) % 1;
                  if (c < 1/3) {
                     const t = c * 3;
                     return [Math.round(50 - 50*t), Math.round(130 + 80*t), 255];
                  } else if (c < 2/3) {
                     const t = (c - 1/3) * 3;
                     return [0, Math.round(210 - 35*t), Math.round(255 - 40*t)];
                  } else {
                     const t = (c - 2/3) * 3;
                     return [Math.round(50*t), Math.round(175 - 45*t), Math.round(215 + 40*t)];
                  }
               };

               // Each ring starts at a different phase so they cycle through different hues
               const base = (millis() / 3000) % 1;
               const [r0, g0, b0] = cycleRGB(base);
               const [r1, g1, b1] = cycleRGB(base + 0.20);
               const [r2, g2, b2] = cycleRGB(base + 0.40);
               const [r3, g3, b3] = cycleRGB(base + 0.60);

               noStroke();
               const pCtx = drawingContext;
               // Outer ring — hazy, diffuse like jellyfish head outer glow
               pCtx.shadowBlur = 16 + pulse * 10;
               pCtx.shadowColor = `rgba(${r0}, ${g0}, ${b0}, 0.45)`;
               fill(r0, g0, b0, glowAlpha * 255 * 0.14);
               ellipse(item.x, cy, drawSize * 2.0, drawSize * 2.0);
               pCtx.shadowBlur = 0;
               fill(r1, g1, b1, glowAlpha * 255 * 0.52);
               ellipse(item.x, cy, drawSize * 1.5, drawSize * 1.5);
               fill(r2, g2, b2, glowAlpha * 255 * 0.68);
               ellipse(item.x, cy, drawSize * 1.0, drawSize * 1.0);
               fill(r3, g3, b3, glowAlpha * 255 * 0.92);
               ellipse(item.x, cy, drawSize * 0.5, drawSize * 0.5);
            }

            imageMode(CENTER);
            image(powerCell, item.x, cy, drawSize, drawSize);
            imageMode(CORNER);
            continue;
         }

         // Use custom scrap sprite at tile size
         if (collectableType === 'scrap' && scrapSprite) {
            const tileSize = Math.max(8, item.w);
            const drawSize = tileSize * 1.8;
            const cy = item.y - tileSize * 0.3;

            // Gold shimmer glow rings — fade in as player approaches within 200px
            const sdx = item.x - (player.position?.x ?? player.x ?? 0);
            const sdy = item.y - (player.position?.y ?? player.y ?? 0);
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            const sProximity = Math.max(0, Math.min(1, (180 - sdist) / 120));
            if (sProximity > 0) {
               const scrapPulse = 0.75 + 0.25 * Math.sin(millis() / 700);
               const scrapAlpha = scrapPulse * sProximity;
               noStroke();
               const sCtx = drawingContext;
               // Outer ring — hazy, diffuse like jellyfish head outer glow
               sCtx.shadowBlur = 16 + scrapPulse * 8;
               sCtx.shadowColor = `rgba(255, 228, 170, 0.45)`;
               fill(255, 228, 170, scrapAlpha * 255 * 0.14);
               ellipse(item.x, cy, drawSize * 2.0, drawSize * 2.0);
               sCtx.shadowBlur = 0;
               fill(255, 235, 182, scrapAlpha * 255 * 0.58);
               ellipse(item.x, cy, drawSize * 1.5, drawSize * 1.5);
               fill(255, 242, 195, scrapAlpha * 255 * 0.74);
               ellipse(item.x, cy, drawSize * 1.0, drawSize * 1.0);
               fill(255, 250, 215, scrapAlpha * 255 * 0.92);
               ellipse(item.x, cy, drawSize * 0.5, drawSize * 0.5);
            }

            imageMode(CENTER);
            image(scrapSprite, item.x, cy, drawSize, drawSize);
            imageMode(CORNER);
            continue;
         }

         if (drawSpriteFromTileset(item)) continue;
         fill(getCollectableColorByType(collectableType, 220));
         ellipse(item.x, item.y, Math.max(8, item.w), Math.max(8, item.h));
      }
   }

   //=== GLOW OBJECTS ===//
   function drawInteractables() {
      const items = getGlowObjects?.() ?? [];
      if (!items.length) return;

      noStroke();
      for (const obj of items) {
         if (obj.visible === false) continue;
         if (drawSpriteFromTileset(obj)) continue;
         const intensity = obj._glow?.intensity ?? 0;
         fill(80, 200 + intensity * 55, 180, 160 + intensity * 60);
         ellipse(obj.x, obj.y, Math.max(8, obj.w), Math.max(8, obj.h));
      }
   }

   //=== TRIGGERS ===// //todo: remove this from the final game 
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
         rect(entity.x - (entity.w / 2), entity.y - (entity.h / 2), entity.w, entity.h);
      }
   }

   //=== SPAWNS ===//
   function drawSpawnPoints() {
      const spawnPoints = getSpawnPoints?.() ?? [];
      if (!spawnPoints.length) return;

      for (const spawn of spawnPoints) {
         if (drawSpriteFromTileset(spawn)) continue;
         const isPlayerSpawn = String(spawn.spawnId ?? '').toLowerCase() === 'default';
         noStroke();
         fill(isPlayerSpawn ? color(80, 255, 130, 220) : color(255, 130, 80, 220));
         triangle(
            spawn.x, spawn.y - 8,
            spawn.x - 7, spawn.y + 6,
            spawn.x + 7, spawn.y + 6
         );
      }
   }

   //=== ENEMIES ===//
   function drawEnemies(alpha) {
      const crabs = getCrabs?.() ?? [];
      for (const crab of crabs) {
         const currX = Number.isFinite(crab?.position?.x) ? crab.position.x : (Number(crab?.x) || 0);
         const currY = Number.isFinite(crab?.position?.y) ? crab.position.y : (Number(crab?.y) || 0);
         const prevX = Number.isFinite(crab?.previousPos?.x) ? crab.previousPos.x : currX;
         const prevY = Number.isFinite(crab?.previousPos?.y) ? crab.previousPos.y : currY;
         const crabW = Number(crab?.w ?? crab?.width ?? 20) || 20;
         const crabH = Number(crab?.h ?? crab?.height ?? 14) || 14;
         //const facing = Number.isFinite(crab?.facing) && crab.facing !== 0 ? crab.facing : 1;
         const dir = crab?.spriteDirection ?? 'down';

         let angle = 0;

         if (dir === 'down') angle = 0;
         if (dir === 'up') angle = Math.PI;
         if (dir === 'right') angle = -Math.PI / 2;
         if (dir === 'left') angle = Math.PI / 2;

         const drawX = renderInterpolate(prevX, currX, alpha);
         const drawY = renderInterpolate(prevY, currY, alpha);
         push();
         translate(drawX, drawY);
         //scale(facing, 1);

         rotate(angle);

         noStroke();
         fill(200, 80, 50);
         ellipse(0, 0, crabW, crabH);

         fill(180, 60, 40);
         triangle(-crabW / 2 - 6, -4, -crabW / 2, -8, -crabW / 2, 0);
         triangle(crabW / 2 + 6, -4, crabW / 2, -8, crabW / 2, 0);

         fill(255);
         circle(-4, -3, 4);
         circle(4, -3, 4);
         fill(0);
         circle(-4, -3, 2);
         circle(4, -3, 2);

         pop();
         drawDamageFlash(crab, drawX, drawY, crabW, crabH);
      }

      const jellies = getJellyfish?.() ?? [];
      for (const jelly of jellies) {
         const currX = Number.isFinite(jelly?.position?.x) ? jelly.position.x : (Number(jelly?.x) || 0);
         const currY = Number.isFinite(jelly?.position?.y) ? jelly.position.y : (Number(jelly?.y) || 0);
         const prevX = Number.isFinite(jelly?.previousPos?.x) ? jelly.previousPos.x : currX;
         const prevY = Number.isFinite(jelly?.previousPos?.y) ? jelly.previousPos.y : currY;
         const jellyW = Number(jelly?.w ?? jelly?.width ?? 48) || 48;
         const jellyH = Number(jelly?.h ?? jelly?.height ?? 52) || 52;

         // Subtle hue shift: slow sine cycles between blue-purple and violet
         const colorCycle = Math.sin((jelly.time || 0) * 0.25);
         const bodyR = 150 + Math.round(colorCycle * 30);  // 120–180
         const bodyG = 100 - Math.round(colorCycle * 20);  // 80–120

         // Trail — ghost echoes drawn oldest-first so newest sits closest to body
         const trailArr = Array.isArray(jelly.trail) ? jelly.trail : [];
         for (let t = trailArr.length - 1; t >= 0; t--) {
            push();
            translate(trailArr[t].x, trailArr[t].y);
            scale(1.5, 1.5);
            noStroke();
            fill(bodyR, bodyG, 255, Math.round(35 * (1 - t / trailArr.length)));
            ellipse(0, -jellyH / 4, jellyW * (1 - t * 0.06), jellyH / 2 * (1 - t * 0.06));
            pop();
         }

         const jellyDrawX = renderInterpolate(prevX, currX, alpha);
         const jellyDrawY = renderInterpolate(prevY, currY, alpha);
         push();
         translate(jellyDrawX, jellyDrawY);

         const pulse = Math.abs(Math.sin(jelly.pulsePhase || 0)) * 0.15 + 0.85;
         scale(1.5, pulse*1.5);

         const glowPulse = Math.abs(Math.sin(jelly.pulsePhase || 0));
         const jellyCtx = drawingContext;

         // Body — colour-shifted fill and shadow
         jellyCtx.shadowBlur = 18 + glowPulse * 12;
         jellyCtx.shadowColor = `rgba(${bodyR}, ${bodyG - 10}, 255, 0.85)`;
         noStroke();
         fill(bodyR, bodyG, 255, 180);
         ellipse(0, -jellyH / 4, jellyW, jellyH / 2);
         jellyCtx.shadowBlur = 0;

         fill(255);
         ellipse(-4, -jellyH / 4 - 2, 3, 3);
         ellipse(4, -jellyH / 4 - 2, 3, 3);
         fill(0);
         ellipse(-4, -jellyH / 4 - 2, 1.5, 1.5);
         ellipse(4, -jellyH / 4 - 2, 1.5, 1.5);

         // Tentacle lines
         jellyCtx.shadowBlur = 8 + glowPulse * 6;
         jellyCtx.shadowColor = `rgba(${bodyR - 30}, ${bodyG - 20}, 255, 0.7)`;
         stroke(120, 80, 200, 150);
         strokeWeight(2);
         for (let i = -1; i <= 1; i++) {
            const xOff = i * 5;
            const tentacleWave = Math.sin((jelly.time || 0) + i) * 3;
            line(xOff, 0, xOff + tentacleWave, jellyH / 2);
         }

         // Glowing tip dots at the end of each tentacle
         noStroke();
         jellyCtx.shadowBlur = 12 + glowPulse * 10;
         jellyCtx.shadowColor = `rgba(${bodyR + 40}, 180, 255, 0.95)`;
         for (let i = -1; i <= 1; i++) {
            const xOff = i * 5;
            const tentacleWave = Math.sin((jelly.time || 0) + i) * 3;
            fill(230, 180 + Math.round(colorCycle * 20), 255, 160 + Math.round(glowPulse * 70));
            circle(xOff + tentacleWave, jellyH / 2, 2.5);
         }
         jellyCtx.shadowBlur = 0;

         // Inner highlight — colour-shifted to match body
         noStroke();
         fill(bodyR + 50, bodyG + 50, 255, 100);
         ellipse(0, -jellyH / 4, jellyW * 0.6, jellyH * 0.3);

         pop();
         drawDamageFlash(jelly, jellyDrawX, jellyDrawY, jellyW * 1.5, jellyH * 1.5);
      }

      const piranhas = getPiranhas?.() ?? [];
      for (const piranha of piranhas) {
         const currX = Number.isFinite(piranha?.position?.x) ? piranha.position.x : 0;
         const currY = Number.isFinite(piranha?.position?.y) ? piranha.position.y : 0;
         const prevX = Number.isFinite(piranha?.previousPos?.x) ? piranha.previousPos.x : currX;
         const prevY = Number.isFinite(piranha?.previousPos?.y) ? piranha.previousPos.y : currY;
         const pW = Number(piranha?.w ?? piranha?.width ?? 24) || 24;
         const pH = Number(piranha?.h ?? piranha?.height ?? 16) || 16;
         const facing = Number.isFinite(piranha?.facing) && piranha.facing !== 0 ? piranha.facing : 1;
         const isChasing = piranha?.state === 'chase';

         const piranhaDrawX = renderInterpolate(prevX, currX, alpha);
         const piranhaDrawY = renderInterpolate(prevY, currY, alpha);
         push();
         translate(piranhaDrawX, piranhaDrawY);
         scale(facing, 1);

         noStroke();
         fill(isChasing ? color(220, 40, 40) : color(60, 120, 180));
         ellipse(0, 0, pW, pH);

         fill(isChasing ? color(180, 30, 30) : color(40, 90, 150));
         triangle(-pW / 2 - 8, -pH / 3, -pW / 2 - 8, pH / 3, -pW / 2, 0);
         triangle(-4, -pH / 2, 4, -pH / 2, 0, -pH / 2 - 7);

         fill(255);
         circle(pW / 4, -2, 6);
         fill(0);
         circle(pW / 4, -2, 3);

         if (isChasing) {
            fill(255);
            triangle(pW / 2, -3, pW / 2 + 5, -3, pW / 2, 0);
            triangle(pW / 2, 0, pW / 2 + 5, 0, pW / 2, 3);
         }

         pop();
         drawDamageFlash(piranha, piranhaDrawX, piranhaDrawY, pW, pH);
      }
   }


   //===PLAYER===//
   function drawPlayer(alpha) {
      push();
      translate(renderInterpolate(player.previousPos.x, player.position.x, alpha), renderInterpolate(player.previousPos.y, player.position.y, alpha));
      scale(player.facing, 1);

      // Periscope
      fill(120);
      noStroke();
      rect(-2, -player.w * 0.9, 4, player.w * 0.6);
      rect(-2, -player.w * 0.9, 8, 4);

      // Tail fin
      fill(150);
      triangle(
         -player.w / 2, 0,
         -player.w, -player.w / 3,
         -player.w, player.w / 3
      );

      // Body
      fill(255, 200, 50);
      ellipse(0, 0, player.w * 1.2, player.w * 0.8);

      // Porthole window
      fill(100, 220, 255);
      circle(player.w * 0.2, 0, player.w * 0.4);

      // Damage flash — semi-transparent white & red overlay drawn on top of the sprite.
      // Reads damageFlashTime set by playerHitResponse when a hit is confirmed.
      // Damage flash — white then red overlay
      if (player.damageFlashTime != null) {
         const elapsed = millis() - player.damageFlashTime;
         const duration = COMBAT.DAMAGE_FLASH_DURATION_MS;

         if (elapsed < duration) {
            noStroke();
            const whitePhase = duration * 0.25;

            if (elapsed < whitePhase) {
               // Phase 1: white flash — subtler for glow hits
               const flashAlpha = player.damageFlashColor === 'white' ? 100 : 180;
               fill(255, 255, 255, flashAlpha);
               ellipse(0, 0, player.w * 1.4, player.h * 1.1);
            } else if (player.damageFlashColor !== 'white') {
               // Phase 2: red fade out (skipped for glow hits)
               const t = (elapsed - whitePhase) / whitePhase;
               fill(255, 50, 50, 150 * (1 - t));
               ellipse(0, 0, player.w * 1.4, player.h * 1.1);
            }
         }
      }

      pop();
   }

   //===BUBBLES===//
   function drawBubbles() {
      const bubbleList = player.bubbles ?? [];
      noStroke();
      for (const b of bubbleList) {
         if (b.life > 0) {
            fill(150, 220, 255, b.life);
            circle(b.x, b.y, b.size);
         }
      }
   }

   //===SONAR PULSES===//
   function drawSonarPulses() {
      const pulses = getActivePulses?.() ?? [];
      if (!pulses.length) return;

      push();
      if (typeof blendMode === 'function' && typeof ADD !== 'undefined') {
         blendMode(ADD);
      }
      for (const pulse of pulses) {
         pulse?.show?.();
      }
      pop();
   }

   //===SONAR WALLS===//
   function drawSonarWalls() {
      const walls = getRevealedWalls?.() ?? [];
      for (const wall of walls) {
         if (wall.alpha > 1) {
            noStroke();
            if (wall.isBreakable) {
               // Lighter grey background to distinguish from solid walls
               fill(110, 130, 148, wall.alpha);
               rect(wall.x, wall.y, wall.w, wall.h, 3);
               fill(155, 172, 185, wall.alpha);
            } else {
               // Dark background rect
               fill(20, 25, 35, wall.alpha);
               rect(wall.x, wall.y, wall.w, wall.h, 3);
               // Rocky texture overlay
               fill(40, 50, 65, wall.alpha);
            }
            const rockPoints = Array.isArray(wall.rockPoints) ? wall.rockPoints : null;
            if (rockPoints && rockPoints.length > 1) {
               beginShape();
               for (const pt of rockPoints) {
                  vertex(pt.px, pt.py);
               }
               endShape(CLOSE);
            } else {
               rect(wall.x, wall.y, wall.w, wall.h, 3);
            }
         }
      }
   }

   //===LIGHTING===//
   function drawLighting(lightSources = [], cam = { x: 0, y: 0 }, camScale = 1) {
      darknessLayer.clear();
      darknessLayer.background(0);

      const ctx = darknessLayer.drawingContext;
      ctx.globalCompositeOperation = 'destination-out';

      for (const light of lightSources) {
         const { x, y, radius, kind } = light;
         let intensity = light.intensity ?? 1;
         const isCollectableLight = kind === 'collectablePower' || kind === 'collectableScrap';
         if (isCollectableLight) {
            intensity = Math.max(intensity, 0.6);
         }

         /* Fixed-position zone lighting for theSurface room.
            Stepped linear gradient in world space — zones stay put as the player climbs.
         */
         if (kind === 'surfaceAmbient') {
            const screenTop = (light.topY    - cam.y) * camScale;
            const screenBot = (light.bottomY - cam.y) * camScale;
            if (screenBot <= screenTop) continue;
            const grad = ctx.createLinearGradient(0, screenTop, 0, screenBot);
            // Paired stops create smooth but distinct vertical steps - more towards top
            grad.addColorStop(0,     'rgba(255,255,255,0.97)');
            grad.addColorStop(0.040, 'rgba(255,255,255,0.97)');
            grad.addColorStop(0.045, 'rgba(255,255,255,0.88)');
            grad.addColorStop(0.090, 'rgba(255,255,255,0.88)');
            grad.addColorStop(0.095, 'rgba(255,255,255,0.78)');
            grad.addColorStop(0.150, 'rgba(255,255,255,0.78)');
            grad.addColorStop(0.155, 'rgba(255,255,255,0.66)');
            grad.addColorStop(0.220, 'rgba(255,255,255,0.66)');
            grad.addColorStop(0.225, 'rgba(255,255,255,0.55)');
            grad.addColorStop(0.300, 'rgba(255,255,255,0.55)');
            grad.addColorStop(0.305, 'rgba(255,255,255,0.42)');
            grad.addColorStop(0.390, 'rgba(255,255,255,0.42)');
            grad.addColorStop(0.395, 'rgba(255,255,255,0.30)');
            grad.addColorStop(0.510, 'rgba(255,255,255,0.30)');
            grad.addColorStop(0.515, 'rgba(255,255,255,0.20)');
            grad.addColorStop(0.640, 'rgba(255,255,255,0.20)');
            grad.addColorStop(0.645, 'rgba(255,255,255,0.11)');
            grad.addColorStop(0.780, 'rgba(255,255,255,0.11)');
            grad.addColorStop(0.785, 'rgba(255,255,255,0.05)');
            grad.addColorStop(0.900, 'rgba(255,255,255,0.05)');
            grad.addColorStop(1,     'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, darknessLayer.width, darknessLayer.height);
            continue;
         }

         const screenX = (x - cam.x) * camScale;
         const screenY = (y - cam.y) * camScale;
         let scaledRadius;
         if (kind === 'collectablePower') {
            scaledRadius = radius * (1.4 + 0.4 * intensity) * camScale;
         } else if (kind === 'collectableScrap') {
            scaledRadius = radius * (1.2 + 0.3 * intensity) * camScale;
         } else {
            scaledRadius = radius * (0.8 + 0.2 * intensity) * camScale;
         }
         // prevents crash when using PLAYER.WIDTH in config
         if (!Number.isFinite(screenX) || !Number.isFinite(screenY) || !Number.isFinite(scaledRadius) || scaledRadius <= 0) continue;

         const gradient = ctx.createRadialGradient(
            screenX, screenY, scaledRadius * 0.1,
            screenX, screenY, scaledRadius
         );
         if (kind === 'glow') {
            // inner ring — distinct
            gradient.addColorStop(0,    'rgba(255,255,255,1)');
            gradient.addColorStop(0.08, 'rgba(255,255,255,0.68)');
            gradient.addColorStop(0.22, 'rgba(255,255,255,0.85)');
            // mid ring — moderate
            gradient.addColorStop(0.33, 'rgba(255,255,255,0.42)');
            gradient.addColorStop(0.55, 'rgba(255,255,255,0.72)');
            // outer ring — soft fade
            gradient.addColorStop(0.68, 'rgba(255,255,255,0.28)');
            gradient.addColorStop(0.82, 'rgba(255,255,255,0.32)');
            gradient.addColorStop(0.88, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(0.94, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(0.98, 'rgba(255,255,255,0.01)');
            gradient.addColorStop(1,    'rgba(0,0,0,0)');
         } else if (kind === 'collectablePower') {
            intensity = Math.max(intensity, 0.6);
            // Mask shaping only: keep a clear carve without overdriving the whole pass.
            const a = Math.max(0.78, Math.min(0.92, 0.84 + (intensity - 0.6) * 0.10));
            gradient.addColorStop(0,    `rgba(255,255,255,${a.toFixed(3)})`);
            gradient.addColorStop(0.12, `rgba(255,255,255,${Math.max(0.62, a * 0.82).toFixed(3)})`);
            gradient.addColorStop(0.34, `rgba(255,255,255,${Math.max(0.44, a * 0.62).toFixed(3)})`);
            gradient.addColorStop(0.60, `rgba(255,255,255,${Math.max(0.26, a * 0.40).toFixed(3)})`);
            gradient.addColorStop(0.82, `rgba(255,255,255,${Math.max(0.10, a * 0.18).toFixed(3)})`);
            gradient.addColorStop(1,    'rgba(0,0,0,0)');
         } else if (kind === 'collectableScrap') {
            intensity = Math.max(intensity, 0.6);
            const a = Math.max(0.62, Math.min(0.78, 0.69 + (intensity - 0.6) * 0.10));
            gradient.addColorStop(0,    `rgba(255,255,255,${a.toFixed(3)})`);
            gradient.addColorStop(0.16, `rgba(255,255,255,${Math.max(0.44, a * 0.76).toFixed(3)})`);
            gradient.addColorStop(0.40, `rgba(255,255,255,${Math.max(0.30, a * 0.56).toFixed(3)})`);
            gradient.addColorStop(0.70, `rgba(255,255,255,${Math.max(0.18, a * 0.34).toFixed(3)})`);
            gradient.addColorStop(1,    'rgba(0,0,0,0)');
         } else if (kind === 'jellyfishHead') {
            // Wide oval punch — horizontally stretched to match dome, wider than body oval
            const p = light.glowPulse ?? 0;
            const b1 = Math.min(1, 0.92 + p * 0.07);
            const b2 = 0.52 + p * 0.08;
            const b3 = 0.22 + p * 0.04;
            const b4 = 0.07;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(JELLY_HEAD_ASPECT, 1.0);
            const headGrad = ctx.createRadialGradient(0, 0, scaledRadius * 0.1, 0, 0, scaledRadius);
            headGrad.addColorStop(0,    `rgba(255,255,255,${b1.toFixed(3)})`);
            headGrad.addColorStop(0.06, `rgba(255,255,255,${b1.toFixed(3)})`);
            headGrad.addColorStop(0.09, `rgba(255,255,255,${b2.toFixed(3)})`);
            headGrad.addColorStop(0.24, `rgba(255,255,255,${b2.toFixed(3)})`);
            headGrad.addColorStop(0.28, `rgba(255,255,255,${b3.toFixed(3)})`);
            headGrad.addColorStop(0.55, `rgba(255,255,255,${b3.toFixed(3)})`);
            headGrad.addColorStop(0.59, `rgba(255,255,255,${b4.toFixed(3)})`);
            headGrad.addColorStop(0.88, `rgba(255,255,255,${b4.toFixed(3)})`);
            headGrad.addColorStop(1,    'rgba(255,255,255,0)');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
         } else if (kind === 'jellyfishBody') {
            // Tall narrow oval: transparent centre avoids stacking with head, very soft throughout
            const p = light.glowPulse ?? 0;
            const b1 = 0.16 + p * 0.04;  // peak: 0.16–0.20
            const b2 = 0.08 + p * 0.02;  // mid:  0.08–0.10
            const b3 = 0.03;              // outer: barely there
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(light.aspect ?? JELLY_BODY_ASPECT, 1.0);
            const ovalGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledRadius);
            ovalGrad.addColorStop(0,    'rgba(255,255,255,0)');                         // transparent — no contribution at core
            ovalGrad.addColorStop(0.35, `rgba(255,255,255,${b1.toFixed(3)})`);         // fades in beyond head zone
            ovalGrad.addColorStop(0.52, `rgba(255,255,255,${b1.toFixed(3)})`);         // hold
            ovalGrad.addColorStop(0.60, `rgba(255,255,255,${b2.toFixed(3)})`);         // step down
            ovalGrad.addColorStop(0.78, `rgba(255,255,255,${b2.toFixed(3)})`);         // hold
            ovalGrad.addColorStop(0.86, `rgba(255,255,255,${b3.toFixed(3)})`);         // fade to edge
            ovalGrad.addColorStop(1,    'rgba(255,255,255,0)');
            ctx.fillStyle = ovalGrad;
            ctx.beginPath();
            ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
         } else if (kind === 'ambient') {
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.15, 'rgba(255,255,255,0.45)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.25)');
            gradient.addColorStop(0.55, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.8, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
         } else {
            //torch light
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.05, 'rgba(255,255,255,0.95)');
            gradient.addColorStop(0.15, 'rgba(255,255,255,0.9)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.95)');
            gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.55, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(0.65, 'rgba(255,255,255,0.55)');
            gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)');
            gradient.addColorStop(0.8, 'rgba(255,255,255,0.2)');
            gradient.addColorStop(0.85, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.95, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
         }

         ctx.fillStyle = gradient;
         ctx.beginPath();
         ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
         ctx.fill();
      }

      // Punch holes for active missiles so they're visible in dark areas
      const missiles = getMissiles?.() ?? [];
      for (const missile of missiles) {
         if (!missile.position) continue;
         const sx = (missile.position.x - cam.x) * camScale;
         const sy = (missile.position.y - cam.y) * camScale;
         const r = 28 * camScale;
         if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
         const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
         grad.addColorStop(0,   'rgba(255,255,255,0.85)');
         grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
         grad.addColorStop(1,   'rgba(0,0,0,0)');
         ctx.fillStyle = grad;
         ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }

      // Punch holes for explosion burst particles so they're visible in dark areas
      const burstParticles = getBurstParticles?.() ?? [];
      for (const p of burstParticles) {
         const lifeRatio = Math.max(0, (p.life ?? 0) / (p.maxLife ?? 300));
         const alpha = lifeRatio * 0.9;
         if (alpha <= 0.01) continue;
         const sx = (p.x - cam.x) * camScale;
         const sy = (p.y - cam.y) * camScale;
         const r = p.size * 6 * camScale;
         if (r <= 0 || !Number.isFinite(sx) || !Number.isFinite(sy)) continue;
         const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
         grad.addColorStop(0,   `rgba(255,255,255,${alpha.toFixed(3)})`);
         grad.addColorStop(0.5, `rgba(255,255,255,${(alpha * 0.4).toFixed(3)})`);
         grad.addColorStop(1,   'rgba(0,0,0,0)');
         ctx.fillStyle = grad;
         ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }

      // Pulsing darkness punch for power collectable glow rings — synced to drawCollectables pulse
      const collectables = getCollectables?.() ?? [];
      const glowPulse = 0.5 + 0.5 * Math.sin(millis() / 700);
      const playerX = player?.position?.x ?? player?.x ?? 0;
      const playerY = player?.position?.y ?? player?.y ?? 0;
      for (const c of collectables) {
         if (c.visible === false || getCollectableType(c) !== 'power') continue;
         const cdx = c.x - playerX;
         const cdy = c.y - playerY;
         const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
         const cProximity = Math.max(0, Math.min(1, (180 - cdist) / 120));
         if (cProximity <= 0) continue;
         const tileSize = Math.max(8, c.w);
         const drawSize = tileSize * 2.5;
         const sx = (c.x - cam.x) * camScale;
         const sy = (c.y - cam.y) * camScale;
         const r = drawSize * 1.2 * camScale;
         if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
         const a = (0.70 + glowPulse * 0.25) * cProximity;
         const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
         grad.addColorStop(0,   `rgba(255,255,255,${a.toFixed(3)})`);
         grad.addColorStop(0.5, `rgba(255,255,255,${(a * 0.65).toFixed(3)})`);
         grad.addColorStop(0.8, `rgba(255,255,255,${(a * 0.25).toFixed(3)})`);
         grad.addColorStop(1,   'rgba(0,0,0,0)');
         ctx.fillStyle = grad;
         ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }

      // Darkness punch for scrap collectable glow
      for (const c of collectables) {
         if (c.visible === false || getCollectableType(c) !== 'scrap') continue;
         const sdx = c.x - playerX;
         const sdy = c.y - playerY;
         const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
         const sProximity = Math.max(0, Math.min(1, (180 - sdist) / 120));
         if (sProximity <= 0) continue;
         const tileSize = Math.max(8, c.w);
         const drawSize = tileSize * 1.8;
         const sy = (c.y - tileSize * 0.3 - cam.y) * camScale;
         const sx = (c.x - cam.x) * camScale;
         const r = drawSize * 1.1 * camScale;
         if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
         const scrapPunch = (0.75 + 0.25 * Math.sin(millis() / 700)) * sProximity;
         const a = 0.65 * scrapPunch;
         const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
         grad.addColorStop(0,   `rgba(255,255,255,${a.toFixed(3)})`);
         grad.addColorStop(0.5, `rgba(255,255,255,${(a * 0.6).toFixed(3)})`);
         grad.addColorStop(0.8, `rgba(255,255,255,${(a * 0.2).toFixed(3)})`);
         grad.addColorStop(1,   'rgba(0,0,0,0)');
         ctx.fillStyle = grad;
         ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }

      // Bioluminescent colour tint — drawn source-over the punched darkness layer.
      // Only the transparent (lit) areas pick up the colour; opaque dark areas are unaffected.
      ctx.globalCompositeOperation = 'source-over';
      for (const light of lightSources) {
         const isHead = light.kind === 'jellyfishHead';
         const isBody = light.kind === 'jellyfishBody';
         const isCollectablePower = light.kind === 'collectablePower';
         const isCollectableScrap = light.kind === 'collectableScrap';
         const isPiranha = light.kind === 'piranhaChase';
         if (light.kind !== 'glow' && !isHead && !isBody && !isCollectablePower && !isCollectableScrap && !isPiranha) continue;
         const { x, y, radius } = light;
         let intensity = light.intensity ?? 1;
         if (isCollectablePower || isCollectableScrap) {
            intensity = Math.max(intensity, 0.6);
         }
         const screenX = (x - cam.x) * camScale;
         const screenY = (y - cam.y) * camScale;
         let scaledRadius = radius * (0.8 + 0.2 * intensity) * camScale;
         if (isCollectablePower) {
            scaledRadius = radius * (1.25 + 0.4 * intensity) * camScale;
         } else if (isCollectableScrap) {
            scaledRadius = radius * (1.15 + 0.3 * intensity) * camScale;
         }
         if (!Number.isFinite(screenX) || !Number.isFinite(screenY) || !Number.isFinite(scaledRadius) || scaledRadius <= 0) continue;

         const tint = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRadius);
         if (isHead) {
            // Wide oval tint — horizontally stretched, wider than body oval, matches dome shape
            const p  = light.glowPulse ?? 0;
            const ct = light.cycleT ?? 0;
            const coreA = Math.min(1, 0.75 + p * 0.22);
            const b2A   = 0.52 + p * 0.08;
            const b3A   = 0.28 + p * 0.04;
            const outA  = 0.10;
            const [r0, g0, c0] = jellyColour(ct);
            const [r1, g1, c1] = jellyColour(ct + 0.20);
            const [r2, g2, c2] = jellyColour(ct + 0.40);
            const [r3, g3, c3] = jellyColour(ct + 0.60);
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(JELLY_HEAD_ASPECT, 1.0);
            const headTint = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledRadius);
            headTint.addColorStop(0,    `rgba(255,255,255,${(coreA * 0.88).toFixed(3)})`);
            headTint.addColorStop(0.04, `rgba(255,255,255,${(coreA * 0.88).toFixed(3)})`);
            headTint.addColorStop(0.06, `rgba(${r0},${g0},${c0},${coreA.toFixed(3)})`);
            headTint.addColorStop(0.20, `rgba(${r0},${g0},${c0},${(coreA*0.85).toFixed(3)})`);
            headTint.addColorStop(0.24, `rgba(${r1},${g1},${c1},${b2A.toFixed(3)})`);
            headTint.addColorStop(0.40, `rgba(${r1},${g1},${c1},${(b2A*0.70).toFixed(3)})`);
            headTint.addColorStop(0.44, `rgba(${r2},${g2},${c2},${b3A.toFixed(3)})`);
            headTint.addColorStop(0.62, `rgba(${r2},${g2},${c2},${(b3A*0.50).toFixed(3)})`);
            headTint.addColorStop(0.66, `rgba(${r3},${g3},${c3},${outA.toFixed(3)})`);
            headTint.addColorStop(0.90, `rgba(${r3},${g3},${c3},${(outA*0.25).toFixed(3)})`);
            headTint.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = headTint;
            ctx.beginPath();
            ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
         } else if (isBody) {
            // Tall narrow oval tint: transparent centre, soft colour shift from mid outward
            const p  = light.glowPulse ?? 0;
            const ct = light.cycleT ?? 0;
            const midA  = 0.22 + p * 0.05;  // 0.22–0.27
            const outA  = 0.10 + p * 0.02;  // 0.10–0.12
            const edgeA = 0.04;              // static
            const [r0, g0, c0] = jellyColour(ct);
            const [r1, g1, c1] = jellyColour(ct + 0.30);
            const dr = Math.round(r1 * 0.55 + 70 * 0.45);
            const dg = Math.round(g1 * 0.55 + 55 * 0.45);
            const dc = Math.round(c1 * 0.55 + 140 * 0.45);
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(light.aspect ?? JELLY_BODY_ASPECT, 1.0);
            const ovalTint = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledRadius);
            ovalTint.addColorStop(0,    `rgba(${r0},${g0},${c0},0)`);                         // transparent — no overlap at core
            ovalTint.addColorStop(0.35, `rgba(${r0},${g0},${c0},${midA.toFixed(3)})`);        // fades in
            ovalTint.addColorStop(0.52, `rgba(${r0},${g0},${c0},${(midA*0.80).toFixed(3)})`);
            ovalTint.addColorStop(0.56, `rgba(${r1},${g1},${c1},${outA.toFixed(3)})`);        // colour shifts outward
            ovalTint.addColorStop(0.75, `rgba(${dr},${dg},${dc},${(outA*0.60).toFixed(3)})`); // desaturated
            ovalTint.addColorStop(0.82, `rgba(${dr},${dg},${dc},${edgeA.toFixed(3)})`);
            ovalTint.addColorStop(0.96, `rgba(${dr},${dg},${dc},0)`);
            ovalTint.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = ovalTint;
            ctx.beginPath();
            ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
         } else if (isCollectablePower) {
            intensity = Math.max(intensity, 0.6);
            const a = 0.65 * Math.max(0.6, Math.min(1.2, intensity));
            tint.addColorStop(0,    `rgba(215,248,255,${Math.max(0.40, a * 0.72).toFixed(3)})`);
            tint.addColorStop(0.22, `rgba(120,225,255,${Math.max(0.44, a * 0.84).toFixed(3)})`);
            tint.addColorStop(0.50, `rgba(60,182,250,${Math.max(0.34, a * 0.66).toFixed(3)})`);
            tint.addColorStop(0.76, `rgba(28,128,216,${Math.max(0.22, a * 0.42).toFixed(3)})`);
            tint.addColorStop(1,    'rgba(0,0,0,0)');
         } else if (isCollectableScrap) {
            intensity = Math.max(intensity, 0.6);
            const a = 0.45 * Math.max(0.5, Math.min(1, intensity * 1.5));
            tint.addColorStop(0,    `rgba(255,244,198,${Math.max(0.22, a * 0.62).toFixed(3)})`);
            tint.addColorStop(0.30, `rgba(255,219,128,${Math.max(0.24, a * 0.70).toFixed(3)})`);
            tint.addColorStop(0.64, `rgba(220,172,88,${Math.max(0.20, a * 0.54).toFixed(3)})`);
            tint.addColorStop(1,    'rgba(0,0,0,0)');
         } else if (isPiranha) {
            const peak = 0.55 * intensity;
            if (light.piranhaColor === 'blue') {
               tint.addColorStop(0,    `rgba( 60, 120, 180, 0)`);
               tint.addColorStop(0.2,  `rgba( 60, 120, 180, ${peak * 0.4})`);
               tint.addColorStop(0.5,  `rgba( 40,  90, 150, ${peak})`);
               tint.addColorStop(0.75, `rgba( 30,  70, 130, ${peak * 0.4})`);
            } else {
               tint.addColorStop(0,    `rgba(220,  40,  40, 0)`);
               tint.addColorStop(0.2,  `rgba(220,  40,  40, ${peak * 0.4})`);
               tint.addColorStop(0.5,  `rgba(200,  30,  30, ${peak})`);
               tint.addColorStop(0.75, `rgba(160,  20,  20, ${peak * 0.4})`);
            }
            tint.addColorStop(1,   'rgba(0,0,0,0)');
         } else {
            // Existing cyan-green tint for glow interactable objects
            const peak = 0.4 * intensity;
            tint.addColorStop(0,    'rgba(40, 230, 180, 0)');
            tint.addColorStop(0.2,  `rgba(20, 220, 170, ${peak * 0.3})`);
            tint.addColorStop(0.45, `rgba(10, 200, 160, ${peak})`);
            tint.addColorStop(0.7,  `rgba(0,  170, 140, ${peak * 0.4})`);
            tint.addColorStop(1,    'rgba(0, 0, 0, 0)');
         }

         ctx.fillStyle = tint;
         ctx.beginPath();
         ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
         ctx.fill();
      }

      // Red/magenta hit flash overlay on jellyfish head core
      for (const light of lightSources) {
         if (light.kind !== 'jellyfishHead' || !(light.hitFlash > 0)) continue;
         const hf = light.hitFlash;
         const sx = (light.x - cam.x) * camScale;
         const sy = (light.y - cam.y) * camScale;
         const r  = light.radius * (0.8 + 0.2 * hf) * camScale;
         if (!Number.isFinite(sx) || !Number.isFinite(sy) || r <= 0) continue;
         const flashA = hf * 0.9;
         const isGain = light.hitFlashType === 'gain';
         ctx.save();
         ctx.translate(sx, sy);
         ctx.scale(JELLY_HEAD_ASPECT, 1.0);
         const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
         if (isGain) {
            flash.addColorStop(0,   `rgba(140, 210, 255, ${flashA.toFixed(3)})`);
            flash.addColorStop(0.3, `rgba( 80, 175, 255, ${(flashA * 0.75).toFixed(3)})`);
            flash.addColorStop(0.6, `rgba( 50, 140, 255, ${(flashA * 0.35).toFixed(3)})`);
         } else {
            flash.addColorStop(0,   `rgba(255,  20, 120, ${flashA.toFixed(3)})`);
            flash.addColorStop(0.3, `rgba(255,   0,  80, ${(flashA * 0.75).toFixed(3)})`);
            flash.addColorStop(0.6, `rgba(200,   0,  60, ${(flashA * 0.35).toFixed(3)})`);
         }
         flash.addColorStop(1,   'rgba(0,0,0,0)');
         ctx.fillStyle = flash;
         ctx.beginPath();
         ctx.arc(0, 0, r, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
      }

      image(darknessLayer, 0, 0);
   }

   // Processed (white-background removed) sprite cache
   let _powerCellProcessed = null;
   let _scrapSpriteProcessed = null;

   function removeWhiteBg(raw) {
      const img = raw.get();
      img.loadPixels();
      for (let i = 0; i < img.pixels.length; i += 4) {
         if (img.pixels[i] > 230 && img.pixels[i + 1] > 230 && img.pixels[i + 2] > 230) {
            img.pixels[i + 3] = 0;
         }
      }
      img.updatePixels();
      return img;
   }

   function getPowerCellProcessed() {
      const raw = getPowerCellSprite?.();
      if (!raw) return null;
      if (!_powerCellProcessed) _powerCellProcessed = removeWhiteBg(raw);
      return _powerCellProcessed;
   }

   function getScrapSpriteProcessed() {
      const raw = getScrapSprite?.();
      if (!raw) return null;
      if (!_scrapSpriteProcessed) _scrapSpriteProcessed = removeWhiteBg(raw);
      return _scrapSpriteProcessed;
   }

   // Greyscale-processed scrap icon used for gold tinting
   let _scrapIconGold = null;
   function getScrapIconGold() {
      const raw = getScrapIcon?.();
      if (!raw) return null;
      if (!_scrapIconGold && raw.width > 0) {
         _scrapIconGold = createGraphics(raw.width, raw.height);
         _scrapIconGold.image(raw, 0, 0);
         _scrapIconGold.filter(GRAY);
      }
      return _scrapIconGold;
   }

   // Animation state for scrap counter pickup flash
   let _lastScrap = null;
   let _scrapAnimStart = -9999;

   //===UI===//
   function drawDial({
      x,
      y,
      size,
      fillRatio,
      centerLabel,
      ringColor,
      labelColor,
   }) {
      const clampedFill = Math.max(0, Math.min(1, fillRatio ?? 0));

      push();
      noFill();

      // Outer tech-frame ring
      stroke(126, 220, 224, 100);
      strokeWeight(2);
      circle(x, y, size + 20);

      // Background ring (empty portion)
      stroke(30, 50, 65, 200);
      strokeWeight(12);
      circle(x, y, size);

      // Active fill arc
      stroke(ringColor);
      strokeWeight(12);
      strokeCap(ROUND);
      arc(
         x,
         y,
         size,
         size,
         -HALF_PI,
         -HALF_PI + (TWO_PI * clampedFill),
      );

      noStroke();
      fill(labelColor ?? color(234, 246, 248));
      textAlign(CENTER, CENTER);
      textSize(20);
      text(centerLabel, x, y);
      pop();
   }

   // Segmented upgrade bar
   function drawSegmentBar(cx, y, level, maxLevel, segW, segH, segGap) {
      const totalW = maxLevel * (segW + segGap) - segGap;
      const startX = cx - totalW / 2;
      for (let i = 0; i < maxLevel; i++) {
         noStroke();
         fill(i < level ? color(117, 250, 126) : color(53, 83, 65));
         rect(startX + i * (segW + segGap), y - segH / 2, segW, segH, 1);
      }
   }

   // Dot row — used for missiles (quantity)
   function drawDotRow(cx, y, count, maxCount, dotSize, dotGap) {
      const totalW = maxCount * (dotSize + dotGap) - dotGap;
      const startX = cx - totalW / 2;
      for (let i = 0; i < maxCount; i++) {
         noStroke();
         fill(i < count ? color(117, 250, 126) : color(53, 83, 65));
         circle(startX + i * (dotSize + dotGap) + dotSize / 2, y, dotSize);
      }
   }

   function drawScrapCounter() {
      const scrap = player.scrap ?? 0;

      // Detect pickup — animate scale on increase
      if (_lastScrap !== null && scrap > _lastScrap) _scrapAnimStart = millis();
      _lastScrap = scrap;

      const elapsed = millis() - _scrapAnimStart;
      const animDuration = 500;
      const animScale = elapsed < animDuration
         ? 1 + 0.18 * Math.sin((elapsed / animDuration) * Math.PI)
         : 1;

      const panelX = 16, panelY = 16, panelW = 185, panelH = 50;

      push();

      // Panel background
      noStroke();
      fill(12, 23, 31, 220);
      rect(panelX, panelY, panelW, panelH, 6);

      // Cyan border
      stroke(126, 220, 224, 160);
      strokeWeight(1.5);
      noFill();
      rect(panelX, panelY, panelW, panelH, 6);
      noStroke();

      // All elements vertically centred, left-justified: [icon] SCRAP [count]
      const cy = panelY + panelH / 2;

      // Scrap icon image
      const iconSize = 34;
      const ix = panelX + 24; // left edge aligns with TAB badge (panelX + 10)
      const scrapIcon = getScrapIcon?.();
      if (scrapIcon) {
         imageMode(CENTER);
         tint(255, 200, 50);
         image(getScrapIconGold() ?? scrapIcon, ix, cy, iconSize, iconSize);
         noTint();
         imageMode(CORNER);
      }

      // "SCRAP" label
      noStroke();
      fill(255, 223, 136);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('SCRAP:', ix + iconSize / 2 + 14, cy);

      // Count with pickup scale animation
      push();
      translate(ix + iconSize / 2 + 74, cy);
      scale(animScale, animScale);
      fill(255, 223, 136);
      textAlign(LEFT, CENTER);
      textSize(20);
      text(scrap, 0, 0);
      pop();

      pop();
   }

   function drawWorkshopHint() {
      // Sits directly below the scrap counter (panelY=16, panelH=50)
      const panelX = 16, panelY = 72, panelW = 185, panelH = 40;
      const cy = panelY + panelH / 2;

      push();

      // Panel background
      noStroke();
      fill(12, 23, 31, 220);
      rect(panelX, panelY, panelW, panelH, 6);

      // Cyan border
      stroke(126, 220, 224, 160);
      strokeWeight(1.5);
      noFill();
      rect(panelX, panelY, panelW, panelH, 6);

      // Workshop key badge
      const keyX = panelX + 10;
      const keyW = 26, keyH = 22;
      const workshopKey = keyLabel(CONTROLS.MODES[CONTROLS.DEFAULT_MODE].TOGGLE_WORKSHOP);
      fill(26, 42, 54, 240);
      stroke(126, 220, 224, 120);
      strokeWeight(1);
      rect(keyX, cy - keyH / 2, keyW, keyH, 3);

      noStroke();
      fill(174, 205, 211);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(workshopKey, keyX + keyW / 2, cy);

      // Label
      fill(174, 205, 211);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('OPEN WORKSHOP', keyX + keyW + 10, cy);

      pop();
   }

   function drawSneakHint() {
      // Sits below workshop hint — SHIFT to sneak
      const panelX = 16, panelY = 118, panelW = 185, panelH = 40;
      const cy = panelY + panelH / 2;

      push();

      // Panel background
      noStroke();
      fill(12, 23, 31, 220);
      rect(panelX, panelY, panelW, panelH, 6);

      // Cyan border
      stroke(126, 220, 224, 160);
      strokeWeight(1.5);
      noFill();
      rect(panelX, panelY, panelW, panelH, 6);

      // SHIFT key badge
      const keyX = panelX + 10;
      const keyW = 48, keyH = 22;
      fill(26, 42, 54, 240);
      stroke(126, 220, 224, 120);
      strokeWeight(1);
      rect(keyX, cy - keyH / 2, keyW, keyH, 3);

      noStroke();
      fill(174, 205, 211);
      textAlign(CENTER, CENTER);
      textSize(9);
      text('SHIFT', keyX + keyW / 2, cy);

      // Label
      fill(174, 205, 211);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('MOVE SLOW', keyX + keyW + 10, cy);

      pop();
   }

   function drawSettingsHint() {
      // Top-right HUD hint — ESC for settings
      const panelW = 185, panelH = 40;
      const panelX = width - panelW - 16, panelY = 16;
      const cy = panelY + panelH / 2;

      push();

      // Panel background
      noStroke();
      fill(12, 23, 31, 220);
      rect(panelX, panelY, panelW, panelH, 6);

      // Cyan border
      stroke(126, 220, 224, 160);
      strokeWeight(1.5);
      noFill();
      rect(panelX, panelY, panelW, panelH, 6);

      // ESC key badge
      const keyX = panelX + 10;
      const keyW = 48, keyH = 22;
      fill(26, 42, 54, 240);
      stroke(126, 220, 224, 120);
      strokeWeight(1);
      rect(keyX, cy - keyH / 2, keyW, keyH, 3);

      noStroke();
      fill(174, 205, 211);
      textAlign(CENTER, CENTER);
      textSize(12);
      text('ESC', keyX + keyW / 2, cy);

      // Label
      fill(174, 205, 211);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('SETTINGS', keyX + keyW + 10, cy);

      pop();
   }

   function drawControlsHint() {
      // Sits below settings hint — C for controls
      const panelW = 185, panelH = 40;
      const panelX = width - panelW - 16, panelY = 62;
      const cy = panelY + panelH / 2;

      push();

      noStroke();
      fill(12, 23, 31, 220);
      rect(panelX, panelY, panelW, panelH, 6);

      stroke(126, 220, 224, 160);
      strokeWeight(1.5);
      noFill();
      rect(panelX, panelY, panelW, panelH, 6);

      const keyX = panelX + 10;
      const keyW = 48, keyH = 22;
      fill(26, 42, 54, 240);
      stroke(126, 220, 224, 120);
      strokeWeight(1);
      rect(keyX, cy - keyH / 2, keyW, keyH, 3);

      noStroke();
      fill(174, 205, 211);
      textAlign(CENTER, CENTER);
      textSize(12);
      text('C', keyX + keyW / 2, cy);

      fill(174, 205, 211);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('CONTROLS', keyX + keyW + 10, cy);

      pop();
   }

   function drawUpgradeBars() {
      const rowY        = HUD_DIALS.BOTTOM_ROW_Y             ?? 1008;
      const labelY      = HUD_DIALS.BOTTOM_ROW_LABEL_Y       ?? 1031;
      const leftGroupX  = HUD_DIALS.BOTTOM_ROW_LEFT_GROUP_X  ?? 700;
      const rightGroupX = HUD_DIALS.BOTTOM_ROW_RIGHT_GROUP_X ?? 1220;
      const halfGap     = (HUD_DIALS.BOTTOM_ROW_GROUP_SPACING ?? 180) / 2;

      const MAX_UPGRADE = 8;
      const MAX_MISSILES = MISSILE.MAX_CONCURRENT ?? 5;

      const torchOn = player.torch?.isOn ?? false;

      const items = [
         { label: 'POWER',    value: Math.min(player.upgrades?.power  ?? 1, MAX_UPGRADE), type: 'bar',  max: MAX_UPGRADE  },
         { label: 'SONAR',    value: Math.min(player.upgrades?.sonar  ?? 1, MAX_UPGRADE), type: 'bar',  max: MAX_UPGRADE  },
         { label: 'TORCH',    value: Math.min(player.upgrades?.torch  ?? 1, MAX_UPGRADE), type: 'bar',  max: MAX_UPGRADE  },
         { label: 'MISSILES', value: Math.min(player.missiles ?? 0,   MAX_MISSILES),      type: 'dots', max: MAX_MISSILES },
      ];

      // POWER, SONAR centred on left group; TORCH, MISSILES centred on right group
      const xPositions = [
         leftGroupX  - halfGap,
         leftGroupX  + halfGap,
         rightGroupX - halfGap,
         rightGroupX + halfGap,
      ];

      push();
      for (let i = 0; i < items.length; i++) {
         const item = items[i];
         const cx = xPositions[i];

         if (item.type === 'bar') {
            drawSegmentBar(cx, rowY, item.value, item.max, 12, 16, 3);
         } else {
            drawDotRow(cx, rowY, item.value, item.max, 15, 4);
         }

         // Label — TORCH turns gold when active
         noStroke();
         fill(item.label === 'TORCH' && torchOn ? color(255, 200, 80) : color(174, 205, 211));
         textAlign(CENTER, TOP);
         textSize(14);
         text(item.label, cx, labelY);

         // Key hint badge centred below label
         const keyHints = { SONAR: 'E', TORCH: 'F', MISSILES: 'SPACE' };
         const keyLabel = keyHints[item.label];
         if (keyLabel) {
            const badgeW = item.label === 'MISSILES' ? 56 : 30;
            const badgeH = 20;
            const badgeX = cx - badgeW / 2;
            const badgeY = labelY + 18;
            fill(10, 30, 45, 200);
            stroke(100, 200, 210, 120);
            strokeWeight(1.5);
            rect(badgeX, badgeY, badgeW, badgeH, 4);
            noStroke();
            fill(174, 205, 211);
            textAlign(CENTER, CENTER);
            textSize(11);
            text(keyLabel, badgeX + badgeW / 2, badgeY + badgeH / 2);
         }
      }
      pop();
   }

   function drawUI() {
      const dialSettings = getHudDialSettings?.() ?? {};
      const powerDialX = Number.isFinite(dialSettings.powerX) ? dialSettings.powerX : 94;
      const powerDialY = Number.isFinite(dialSettings.powerY) ? dialSettings.powerY : 94;
      const sonarDialX = Number.isFinite(dialSettings.sonarX) ? dialSettings.sonarX : 214;
      const sonarDialY = Number.isFinite(dialSettings.sonarY) ? dialSettings.sonarY : 94;
      const baseDialSize = Number.isFinite(dialSettings.baseSize) ? dialSettings.baseSize : 92;
      const powerDialScale = Number.isFinite(dialSettings.powerScale) ? dialSettings.powerScale : 1;
      const sonarDialScale = Number.isFinite(dialSettings.sonarScale) ? dialSettings.sonarScale : 1;
      const powerDialSize = baseDialSize * powerDialScale;
      const sonarDialSize = baseDialSize * sonarDialScale;

      // Fill ratio: 0 = empty (at 60% baseline), 1 = full
      // Display fill % so player sees the bar move as power increases above baseline
      const powerFillRatio = Math.max(0, Math.min(1, player.power.getPercent()));
      const powerFillPct = Math.round(powerFillRatio * 100);
      const isPowerEmpty = typeof player.power.isEmpty === 'function' && player.power.isEmpty();

      // Hard colour steps: green above 40%, amber 40–15%, red below 15%, grey when empty
      let powerStrokeColor;
      let powerLabel;
      if (isPowerEmpty) {
         powerStrokeColor = color(100, 100, 110, 240);
         powerLabel = 'EMPTY';
      } else if (powerFillRatio > 0.40) {
         powerStrokeColor = color(80, 230, 120, 240);
         powerLabel = powerFillPct + '%';
      } else if (powerFillRatio > 0.15) {
         powerStrokeColor = color(255, 160, 40, 240);
         powerLabel = powerFillPct + '%';
      } else {
         powerStrokeColor = color(220, 60, 60, 240);
         powerLabel = powerFillPct + '%';
      }

      if (powerFillRatio <= 0.15 && !isPowerEmpty) {
         const pulse = Math.abs(Math.sin(millis() * 0.004));

         // Red glow — transparent at centre (text area), peaks at ring band, fades beyond
         const pulseAlpha = 0.25 + 0.20 * pulse;
         const ctx = drawingContext;
         const glowRadius = powerDialSize * 1.2;
         const grad = ctx.createRadialGradient(
            powerDialX, powerDialY, 0,
            powerDialX, powerDialY, glowRadius
         );
         grad.addColorStop(0,    `rgba(220, 30, 30, 0)`);
         grad.addColorStop(0.20, `rgba(220, 30, 30, 0)`);
         grad.addColorStop(0.35, `rgba(220, 30, 30, ${pulseAlpha * 0.6})`);
         grad.addColorStop(0.45, `rgba(220, 30, 30, ${pulseAlpha})`);
         grad.addColorStop(0.60, `rgba(180, 20, 20, ${pulseAlpha * 0.5})`);
         grad.addColorStop(1,    `rgba(180, 0,  0,  0)`);
         ctx.fillStyle = grad;
         ctx.fillRect(0, 0, width, height);
      }

      drawDial({
         x: powerDialX,
         y: powerDialY,
         size: powerDialSize,
         fillRatio: powerFillRatio,
         centerLabel: powerLabel,
         ringColor: powerStrokeColor,
         labelColor: color(234, 246, 248),
      });

      // Thin gold inner ring,  TORCH text glow when torch is on
      if (player.torch?.isOn) {
         // Gold glow: strongest at ring's inner edge, fades toward centre
         const ctx = drawingContext;
         const glowRadius = powerDialSize / 2 - 5; // inner edge of the ring stroke
         const grad = ctx.createRadialGradient(
            powerDialX, powerDialY, 0,
            powerDialX, powerDialY, glowRadius
         );
         grad.addColorStop(0,    'rgba(255, 200, 80, 0)');
         grad.addColorStop(0.55, 'rgba(255, 200, 80, 0)');
         grad.addColorStop(0.75, 'rgba(255, 200, 80, 0.25)');
         grad.addColorStop(0.88, 'rgba(255, 185, 60, 0.55)');
         grad.addColorStop(1,    'rgba(255, 170, 40, 0)');
         ctx.fillStyle = grad;
         ctx.fillRect(0, 0, width, height);
      }

      const sonarCooldown = getSonarCooldown?.() ?? 0;
      const isSonarCooling = Number.isFinite(sonarCooldown) && sonarCooldown > 0;

      // Existing value is 0 when ready and >0 while cooling, so invert for "refill" visual.
      const sonarFillRatio = isSonarCooling
         ? Math.max(0, Math.min(1, 1 - sonarCooldown))
         : 1;

      drawDial({
         x: sonarDialX,
         y: sonarDialY,
         size: sonarDialSize,
         fillRatio: sonarFillRatio,
         centerLabel: isSonarCooling ? 'COOLING' : 'READY',
         ringColor: isSonarCooling ? color(220, 90, 70, 240) : color(100, 240, 120, 240),
         labelColor: isSonarCooling ? color(255, 210, 200) : color(120, 255, 140),
      });

      drawMiniMap?.();
      drawScrapCounter();
      drawWorkshopHint();
      drawSneakHint();
      drawSettingsHint();
      drawControlsHint();
      drawUpgradeBars();
   }

   function drawGameplayOverlay() {
      const overlay = getGameplayOverlay?.();
      if (!overlay) return;

      const settings = getGameplayOverlaySettings?.() ?? {};
      if (settings.enabled === false) return;

      const centerOnScreen = settings.centerOnScreen !== false;
      const offsetX = Number.isFinite(settings.offsetX) ? settings.offsetX : 0;
      const offsetY = Number.isFinite(settings.offsetY) ? settings.offsetY : 0;
      const scaleX = Number.isFinite(settings.scaleX) ? settings.scaleX : 1;
      const scaleY = Number.isFinite(settings.scaleY) ? settings.scaleY : 1;
      const opacity = Number.isFinite(settings.opacity)
         ? Math.max(0, Math.min(255, settings.opacity))
         : 255;

      const drawW = width * scaleX;
      const drawH = height * scaleY;
      const baseX = centerOnScreen ? ((width - drawW) / 2) : 0;
      const baseY = centerOnScreen ? ((height - drawH) / 2) : 0;

      push();
      resetMatrix();
      tint(255, opacity);
      image(overlay, baseX + offsetX, baseY + offsetY, drawW, drawH);
      noTint();
      pop();
   }

//======================================
// DRAW SONAR
//======================================
   function drawSonarReveals() {
      const reveals = getSonarReveals?.() ?? [];
      if (!reveals.length) return;

      rectMode(CORNER);
      noStroke();
      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         if (r.isBreakable) {
            fill(175, 190, 200, alpha);
         } else {
            fill(90, 110, 130, alpha);
         }
         rect(r.x, r.y, r.w, r.h);
      }
   }

   function drawSonarHazardReveals() {
      const reveals = getSonarHazardReveals?.() ?? [];
      if (!reveals.length) return;

      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         const dir = detectSpikeDirection(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, getHazards?.() ?? []);
         drawSpikes(r.x, r.y, r.w, r.h, 220, 70, 70, alpha, dir);
      }
   }

   
   function drawSonarCollectableReveals() {
      const reveals = getSonarCollectableReveals?.() ?? [];
      if (!reveals.length) return;

      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         const collectableType = getCollectableType(r);
         noStroke();
         fill(getCollectableColorByType(collectableType, alpha));
         ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.max(8, r.w), Math.max(8, r.h));
      }
   }

   function drawSonarEnemyReveals() {
      const reveals = getSonarEnemyReveals?.() ?? [];
      if (!reveals.length) return;

      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         noStroke();
         fill(225, 5, 49, alpha); // red
         ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.max(8, r.w), Math.max(8, r.h));
      }
   }

//======================================
// VISUAL DEBUG HELPERS
//======================================
//===HITBOX-DEBUG===//
   // draw by changing DRAW to true in config, shows hitbox boundaries
   function debugHitbox(drawThis){
      if(drawThis){
         let walls = getPlatforms();
         for(let i in walls){
            walls[i].debugDrawHitbox(DEBUG_COLOR.WALL);
         }
         player.debugDrawHitbox(DEBUG_COLOR.PLAYER);
         const enemies = getEnemies?.() ?? [];
         if (!enemies.length) return;
         for (const crab of enemies) {
            crab.debugDrawHitbox(DEBUG_COLOR.ENEMY);
         }
      }
   }

   //===PARTICLES===//
   function drawParticles() {
      const particles = getParticles?.() ?? [];
      noStroke();
      for (const p of particles) {
         const a = Math.max(0, Math.min(255, p.life ?? 255));
         if (p.type === 'dust') {
            fill(180, 160, 130, a * 0.6);
         } else {
            fill(140, 200, 230, a * 0.5);
         }
         circle(p.x, p.y, p.size * 2);
      }

      // Burst/debris particles (enemy death, wall destruction)
      const burst = getBurstParticles?.() ?? [];
      for (const p of burst) {
         const a = Math.max(0, Math.min(255, p.life ?? 255));
         fill(p.r ?? 255, p.g ?? 100, p.b ?? 40, a);
         circle(p.x, p.y, p.size * 2);
      }
   }

   //===MISSILES===//
   function drawMissileTarget() {
      if (!player || player.missiles <= 0) return;
      const target = getMissileTarget?.();
      if (!target || !(target.position || (target.x !== undefined && target.y !== undefined))) return;

      const tx = target.position ? target.position.x : target.x;
      const ty = target.position ? target.position.y : target.y;

      let isVisible = false;
      const lightSources = getLightSources?.() ?? [];
      const tRadius = Math.max(target.w || target.width || target.getWidth?.() || 0, target.h || target.height || target.getHeight?.() || 0) / 2 || 16;
      for (const light of lightSources) {
         const lx = light.position ? light.position.x : (light.x ?? 0);
         const ly = light.position ? light.position.y : (light.y ?? 0);
         const radius = (light.radius ?? 200) * 1.2;
         if (Math.hypot(tx - lx, ty - ly) < radius + tRadius) {
            isVisible = true;
            break;
         }
      }

      if (!isVisible) {
         const reveals = [
            ...(getSonarEnemyReveals?.() ?? []),
            ...(getSonarReveals?.() ?? []),
            ...(getSonarHazardReveals?.() ?? [])
         ];
         for (const r of reveals) {
            const rCx = r.x + (r.w ?? 0) / 2;
            const rCy = r.y + (r.h ?? 0) / 2;
            if (Math.hypot(tx - rCx, ty - rCy) < 40) {
               isVisible = true;
               break;
            }
         }
      }

      if (!isVisible) return;

      const feedbackTimer = getMissileFireFeedback?.() ?? 0;
      const isFiring = feedbackTimer > 0;
      const crosshairScale = isFiring ? 1.15 : 1;
      const crosshairColor = isFiring ? color(80, 255, 120, 230) : color(255, 50, 50, 200);

      push();
      translate(tx, ty);
      scale(crosshairScale);
      stroke(crosshairColor);
      strokeWeight(2);
      noFill();
      line(-10, 0, -4, 0);
      line(10, 0, 4, 0);
      line(0, -10, 0, -4);
      line(0, 10, 0, 4);
      circle(0, 0, 24);
      pop();
   }

   function drawMissiles() {
      const missiles = getMissiles?.() ?? [];
      for (const missile of missiles) {
         if (missile.bubbles) {
            noStroke();
            for (const b of missile.bubbles) {
               fill(150, 220, 255, b.life);
               circle(b.x, b.y, b.size);
            }
         }

         push();
         translate(missile.position.x, missile.position.y);
         if (missile.velocity) rotate(missile.velocity.heading());

         const w = 24;
         const h = 10;
         noStroke();

         fill(80);
         triangle(-w/2 + 4, 0, -w/2 - 4, -h, -w/2 + 8, -h/2);
         triangle(-w/2 + 4, 0, -w/2 - 4, h, -w/2 + 8, h/2);

         fill(80);
         rectMode(CENTER);
         rect(0, 0, w, h, h/2);

         fill(255, 60, 60);
         arc(w/2 - h/2, 0, h, h, -HALF_PI, HALF_PI);

         pop();
      }
   }

// calculate rendering positions for higher fps
function renderInterpolate(oldState, newState, alpha){
   return (oldState + (newState - oldState) * alpha);
}

//======================================
// DRAW EVERYTHING
//======================================
      return {
         draw(alpha) {
            const lightSources = getLightSources?.() ?? [];
            const cam = getCameraOffset?.() ?? { x: 0, y: 0 };
            const oldCam = getOldCamPosition?.() ?? {x: 0, y: 0};
            const camScale = getCameraScale?.() ?? 1;
            const skyBand = getSkyBand?.() ?? null;

            // --- Screen space: background fills viewport --- //
            drawBackground();
            drawWaterGradient(oldCam, cam, camScale, alpha, skyBand);

            // --- World space (scaled + translated by camera) --- //
            push();
            scale(camScale);
            translate(renderInterpolate(-oldCam.x, -cam.x, alpha), renderInterpolate(-oldCam.y, -cam.y, alpha));

            drawSkyBand(skyBand);
            // Comment out prototype visuals from render
            drawPlatforms();
            drawVisualLayers();
            drawHazards();
            drawEnemies(alpha);
            drawCollectables();
            drawInteractables();
            if (RENDER.SHOW_TRIGGER_AND_ENTITY_VISUALS) {
               drawTriggers();
               drawEntities(); //- will need interpolation
            }
            if (RENDER.SHOW_TRIGGER_AND_ENTITY_VISUALS) {
               drawSpawnPoints();
            }
            drawSonarWalls(); // COMMENT OUT TO REMOVE VISUALS WHEN TORCH ON
            drawBubbles();
            drawParticles();
            drawMissiles();
            drawPlayer(alpha);
            debugHitbox(DEBUG_COLOR.DRAW);

            pop();

            // --- Screen space (fixed to viewport) --- //
         drawLighting(lightSources, cam, camScale);

         // --- World space overlays (drawn above lighting) --- //
         push();
         scale(camScale);
         translate(renderInterpolate(-oldCam.x, -cam.x, alpha), renderInterpolate(-oldCam.y, -cam.y, alpha));
         drawSonarPulses();
         drawSonarReveals();
         drawSonarHazardReveals();
         drawSonarCollectableReveals();
         drawSonarEnemyReveals();
         drawMissileTarget();
         pop();
         
         // --- Absolute top gameplay layer --- //
         drawGameplayOverlay();

         // --- HUD (rendered last so lighting never covers interface) --- //
         push();
         resetMatrix();
         drawUI();
         pop();
      }
   };
}
//======================================
// END
//======================================
