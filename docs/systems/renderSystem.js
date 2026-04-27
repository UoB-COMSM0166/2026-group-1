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
   getParticles,
   getPiranhas,
   getGlowObjects,
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

      // Direct tile lookup: tiles are pre-extracted as data/tiles/{tileset}/{gid}.png
      const tileImg = assets?.[`tile:${gid}`];
      if (!tileImg || !(tileImg.width > 0)) {
         // Fallback: solid rect so platforms are never invisible
         return false;
      }

      image(tileImg, rect.x, rect.y, rect.w, rect.h);
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
      if (localTileId === 41) return 'power';
      if (localTileId === 20) return 'credits';
      return null;
   }

   function getCollectableColorByType(collectableType, alpha = 220) {
      if (collectableType === 'credits') return color(255, 225, 80, alpha);
      if (collectableType === 'power') return color(80, 220, 120, alpha);
      return color(80, 220, 120, alpha);
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

     // todo: move the fill logic inside the loop and support per-platform colors via properties, with the default as the global platform color.
     
      for (const p of platforms) {
         if (p.isDestroyed) continue;
         if (drawSpriteFromTileset(p)) continue;
         // Fallback: no sprite atlas tile available — draw solid rect so platforms
         // are never invisible (collision-layer walls with no atlas tile still visible).
         fill(platformColor);
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
      for (const item of collectables) {
         if (item.visible === false) continue;
         if (drawSpriteFromTileset(item)) continue;
         const collectableType = getCollectableType(item);
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
         const jellyW = Number(jelly?.w ?? jelly?.width ?? 48) || 48;
         const jellyH = Number(jelly?.h ?? jelly?.height ?? 52) || 52;

         push();
         translate(renderInterpolate(prevX, currX, alpha), renderInterpolate(prevY, currY, alpha));

         const pulse = Math.abs(Math.sin(jelly.pulsePhase || 0)) * 0.15 + 0.85;
         scale(1.5, pulse*1.5);

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

         push();
         translate(renderInterpolate(prevX, currX, alpha), renderInterpolate(prevY, currY, alpha));
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

      // Bioluminescent colour tint — drawn source-over the punched darkness layer.
      // Only the transparent (lit) areas pick up the colour; opaque dark areas are unaffected.
      ctx.globalCompositeOperation = 'source-over';
      for (const light of lightSources) {
         if (light.kind !== 'glow') continue;
         const { x, y, radius, intensity = 1 } = light;
         const screenX = (x - cam.x) * camScale;
         const screenY = (y - cam.y) * camScale;
         const scaledRadius = radius * (0.8 + 0.2 * intensity) * camScale;
         if (!Number.isFinite(screenX) || !Number.isFinite(screenY) || !Number.isFinite(scaledRadius) || scaledRadius <= 0) continue;

         const tint = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRadius);
         const peak = 0.4 * intensity;
         // centre is near-white so suppress colour there; tint peaks in the mid-ring zone
         tint.addColorStop(0,    'rgba(40, 230, 180, 0)');
         tint.addColorStop(0.2,  `rgba(20, 220, 170, ${peak * 0.3})`);
         tint.addColorStop(0.45, `rgba(10, 200, 160, ${peak})`);
         tint.addColorStop(0.7,  `rgba(0,  170, 140, ${peak * 0.4})`);
         tint.addColorStop(1,    'rgba(0, 0, 0, 0)');

         ctx.fillStyle = tint;
         ctx.beginPath();
         ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
         ctx.fill();
      }

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

      const powerFillRatio = Math.max(0, Math.min(1, player.power.getPercent()));
      const powerPercent = Math.round(powerFillRatio * 100);
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
            drawInteractables();
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
         drawSonarEnemyReveals();
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
