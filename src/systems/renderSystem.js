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

import { DEBUG_COLOR, COMBAT } from "../config.js";

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
   getParticles,
   drawMiniMap,
   getHudDialSettings,
   getGameplayOverlay,
   getGameplayOverlaySettings,
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
      if (!tilesetImage) {
         console.warn(`[renderSystem] Missing tileset image for path: "${imagePath}" (source: "${tileset.source}")`);
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
      if (localTileId === 41 || localTileId === 53) return 'health';
      if (localTileId === 20) return 'power';
      return null;
   }

   function getCollectableColorByType(collectableType, alpha = 220) {
      if (collectableType === 'health') return color(80, 220, 120, alpha);
      if (collectableType === 'power') return color(255, 225, 80, alpha);
      return color(255, 225, 80, alpha);
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

   //===TERRAIN===//
   function drawPlatforms() {
      const platforms = getPlatforms?.() ?? [];
      const platformColor = getPlatformColor?.() ?? '#5a6e82ff';

      noStroke();
      fill(platformColor);
      
      for (const p of platforms) {
         if (p.isDestroyed) continue;
         if (drawSpriteFromTileset(p)) continue;
         if (p.isBreakable) {
            rect(p.getCornerX(), p.getCornerY(), p.getWidth(), p.getHeight());
         }
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
      for (const item of collectables) {
         if (item.visible === false) continue;
         if (drawSpriteFromTileset(item)) continue;
         const collectableType = getCollectableType(item);
         fill(getCollectableColorByType(collectableType, 220));
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
         const facing = Number.isFinite(crab?.facing) && crab.facing !== 0 ? crab.facing : 1;

         push();
         translate(renderInterpolate(prevX, currX, alpha), renderInterpolate(prevY, currY, alpha));
         scale(facing, 1);

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
      }

      const jellies = getJellyfish?.() ?? [];
      for (const jelly of jellies) {
         const currX = Number.isFinite(jelly?.position?.x) ? jelly.position.x : (Number(jelly?.x) || 0);
         const currY = Number.isFinite(jelly?.position?.y) ? jelly.position.y : (Number(jelly?.y) || 0);
         const prevX = Number.isFinite(jelly?.previousPos?.x) ? jelly.previousPos.x : currX;
         const prevY = Number.isFinite(jelly?.previousPos?.y) ? jelly.previousPos.y : currY;
         const jellyW = Number(jelly?.w ?? jelly?.width ?? 18) || 18;
         const jellyH = Number(jelly?.h ?? jelly?.height ?? 22) || 22;

         push();
         translate(renderInterpolate(prevX, currX, alpha), renderInterpolate(prevY, currY, alpha));

         const pulse = Math.abs(Math.sin(jelly.pulsePhase || 0)) * 0.15 + 0.85;
         scale(1, pulse);

         noStroke();
         fill(150, 100, 255, 180);
         ellipse(0, -jellyH / 4, jellyW, jellyH / 2);
         fill(255);
         ellipse(-4, -jellyH / 4 - 2, 3, 3);
         ellipse(4, -jellyH / 4 - 2, 3, 3);
         fill(0);
         ellipse(-4, -jellyH / 4 - 2, 1.5, 1.5);
         ellipse(4, -jellyH / 4 - 2, 1.5, 1.5);

         stroke(120, 80, 200, 150);
         strokeWeight(2);
         for (let i = -1; i <= 1; i++) {
            const xOff = i * 5;
            const tentacleWave = Math.sin((jelly.time || 0) + i) * 3;
            line(xOff, 0, xOff + tentacleWave, jellyH / 2);
         }

         noStroke();
         fill(200, 150, 255, 100);
         ellipse(0, -jellyH / 4, jellyW * 0.6, jellyH * 0.3);

         pop();
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
               // Phase 1: white flash
               fill(255, 255, 255, 180);
            } else {
               // Phase 2: red fade out
               const t = (elapsed - whitePhase) / whitePhase; // 0 → 1
               const alpha = 150 * (1 - t);
               fill(255, 50, 50, alpha);
            }

            ellipse(0, 0, player.w * 1.4, player.h * 1.1);
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
            // Dark background rect
            noStroke();
            fill(20, 25, 35, wall.alpha);
            rect(wall.x, wall.y, wall.w, wall.h, 3);

            // Rocky texture overlay
            fill(40, 50, 65, wall.alpha);
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
         const { x, y, radius, intensity = 1, kind } = light;
         const screenX = (x - cam.x) * camScale;
         const screenY = (y - cam.y) * camScale;
         const scaledRadius = radius * (0.8 + 0.2 * intensity) * camScale;
         // prevents crash when using PLAYER.WIDTH in config
         if (!Number.isFinite(screenX) || !Number.isFinite(screenY) || !Number.isFinite(scaledRadius) || scaledRadius <= 0) continue;
         const gradient = ctx.createRadialGradient(
            screenX, screenY, scaledRadius * 0.1,
            screenX, screenY, scaledRadius
         );
         if (kind === 'ambient') {
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

      ctx.globalCompositeOperation = 'source-over';
      image(darknessLayer, 0, 0);
   }

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
      stroke(255, 255, 255, 90);
      strokeWeight(10);
      circle(x, y, size);

      stroke(ringColor);
      strokeWeight(10);
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
      fill(labelColor ?? 255);
      textAlign(CENTER, CENTER);
      textSize(18);
      text(centerLabel, x, y);
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

      // Keep existing power computation logic.
      const powerPercent = Math.round(player.power.current);
      const powerFillRatio = Math.max(0, Math.min(1, powerPercent / 100));
      const lowPowerColor = color(220, 60, 60, 240);
      const fullPowerColor = color(80, 230, 120, 240);
      const powerStrokeColor = lerpColor(lowPowerColor, fullPowerColor, powerFillRatio);

      drawDial({
         x: powerDialX,
         y: powerDialY,
         size: powerDialSize,
         fillRatio: powerFillRatio,
         centerLabel: `${powerPercent}%`,
         ringColor: powerStrokeColor,
         labelColor: color(255),
      });

      const sonarCooldown = getSonarCooldown?.() ?? 0;
      const isSonarCooling = Number.isFinite(sonarCooldown) && sonarCooldown > 0;

      // Keep existing sonar cooldown logic.
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
      if (player?.torch?.isOn) return;
      const reveals = getSonarReveals?.() ?? [];
      if (!reveals.length) return;

      rectMode(CORNER);
      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         noStroke();
         fill(90, 110, 130, alpha);
         rect(r.x, r.y, r.w, r.h);
      }
   }

   function drawSonarHazardReveals() {
      if (player?.torch?.isOn) return;
      const reveals = getSonarHazardReveals?.() ?? [];
      if (!reveals.length) return;

      rectMode(CORNER);
      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         noStroke();
         fill(220, 70, 70, alpha);
         rect(r.x, r.y, r.w, r.h);
      }
   }

   function drawSonarCollectableReveals() {
      if (player?.torch?.isOn) return;
      const reveals = getSonarCollectableReveals?.() ?? [];
      if (!reveals.length) return;

      for (const r of reveals) {
         const alpha = Math.max(0, Math.min(255, r.alpha ?? 0));
         noStroke();
         const collectableType = getCollectableType(r);
         if (collectableType === 'health') {
            fill(80, 220, 120, alpha);
         } else if (collectableType === 'power') {
            fill(255, 225, 80, alpha);
         } else {
            fill(getCollectableColorByType(null, alpha));
         }
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
      if (!particles.length) return;
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
   }

   //===MISSILES===//
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

            // --- Screen space: background fills viewport --- //
            drawBackground();

            // --- World space (scaled + translated by camera) --- //
            push();
            scale(camScale);
            translate(renderInterpolate(-oldCam.x, -cam.x, alpha), renderInterpolate(-oldCam.y, -cam.y, alpha));

            // Comment out prototype visuals from render
            drawPlatforms();
            drawHazards();
            drawEnemies(alpha);
            drawCollectables();
            drawTriggers();
            drawEntities(); //- will need interpolation
            drawSpawnPoints();
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
         pop();
         
         // --- World Space UI overlays (drawn above everything) --- //
         push();
         resetMatrix(); // Returns drawing to default screen space (cancels camera transform)
         drawUI();
         pop();

         // --- Absolute top gameplay layer --- //
         drawGameplayOverlay();
      }
   };
}
//======================================
// END
//======================================
