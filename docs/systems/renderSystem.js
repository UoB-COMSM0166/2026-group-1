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

import { DEBUG_COLOR } from "../config.js";

//======================================
// RENDER SYSTEM
//======================================
export function createRenderSystem({
   player,
   getPlatforms,
   getHazards,
   getCollectables,
   getEnemies,
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

      const imagePath = tileset.resolvedImagePath ?? tilesetSourceToImagePath(tileset.source);
      const tilesetImage = imagePath ? assets?.[`tileset:${imagePath}`] : null;
      if (!tilesetImage) {
         console.warn(`[renderSystem] Missing tileset image for path: "${imagePath}" (source: "${tileset.source}")`);
         return false;
      }

      const rect = getObjectRect(obj);
      if (!rect) return false;

      const tileSize = getTileSize?.() ?? {};
      const tileWidth = tileSize.tileWidth ?? tileset.tilewidth ?? 16;
      const tileHeight = tileSize.tileHeight ?? tileset.tileheight ?? 16;
      const localTileId = gid - Number(tileset.firstgid);
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
         background(0);
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

   //=== ENEMIES - Crab ===//
   function drawEnemies(alpha) {
      const enemies = getEnemies?.() ?? [];
      if (!enemies.length) return;

      for (const crab of enemies) {
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

         // body
         noStroke();
         fill(200, 80, 50);
         ellipse(0, 0, crabW, crabH);

         // left claw
         fill(180, 60, 40);
         triangle(-crabW / 2 - 6, -4, -crabW / 2, -8, -crabW / 2, 0);

         // right claw  
         triangle(crabW / 2 + 6, -4, crabW / 2, -8, crabW / 2, 0);

         // eyes
         fill(255);
         circle(-4, -3, 4);
         circle(4, -3, 4);
         fill(0);
         circle(-4, -3, 2);
         circle(4, -3, 2);

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
      // Explicit reset — push/pop does not reliably restore blendMode in all p5.js builds
      if (typeof blendMode === 'function' && typeof BLEND !== 'undefined') {
         blendMode(BLEND);
      }
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
            gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.3)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(0.65, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.9, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
         } else {
            //torch light
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.005, 'rgba(255,255,255,8)');
            gradient.addColorStop(0.01, 'rgba(255,255,255,7)');
            gradient.addColorStop(0.1, 'rgba(255,255,255,0.65)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.4)');
            gradient.addColorStop(0.45, 'rgba(255,255,255,0.35)');
            gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.85, 'rgba(255,255,255,0.05)');
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
   function drawUI() {
      push();

      // Panel backdrop — drawn in absolute screen space, unaffected by camera
      const panelX = 16;
      const panelY = 16;
      const panelW = 220;
      const panelH = 68;
      noStroke();
      fill(0, 0, 0, 160);
      rect(panelX, panelY, panelW, panelH, 6);

      // Text
      textSize(22);
      textAlign(LEFT, TOP);

      const power = player?.power?.current ?? 0;
      fill(255, 220, 60);
      text(`Power: ${Math.round(power)}`, panelX + 12, panelY + 10);

      const sonarCooldown = getSonarCooldown?.() ?? 0;
      if (Number.isFinite(sonarCooldown) && sonarCooldown > 0) {
         fill(220, 60, 60);
         text(`Sonar: cooling`, panelX + 12, panelY + 38);
      } else {
         fill(80, 220, 100);
         text(`Sonar: ready (K)`, panelX + 12, panelY + 38);
      }

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

// calculate rendering positions for higher fps
function renderInterpolate(oldState, newState, alpha){
   const from = Number.isFinite(oldState) ? oldState : 0;
   const to = Number.isFinite(newState) ? newState : from;
   const a = Number.isFinite(alpha) ? alpha : 1;
   return from + (to - from) * a;
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
            drawSonarWalls(); //- might need interpolation
            drawSonarPulses(); //- might need interpolation
            drawBubbles();
            drawPlayer(alpha);
            debugHitbox(DEBUG_COLOR.DRAW);

            pop();

            // --- Screen space (fixed to viewport) --- //
         drawLighting(lightSources, cam, camScale);

         // --- World space overlays (drawn above lighting) --- //
         push();
         scale(camScale);
         translate(renderInterpolate(-oldCam.x, -cam.x, alpha), renderInterpolate(-oldCam.y, -cam.y, alpha));
         drawSonarReveals();
         drawSonarHazardReveals();
         drawSonarCollectableReveals();
         pop();

         drawUI();
      }
   };
}
//======================================
// END
//======================================
