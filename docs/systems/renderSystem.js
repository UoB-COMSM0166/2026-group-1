/*
========================================
VERSION: 2.6
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Draws room background, platforms, player, UI.
  and ligthing

- Power modifiers added by Monal
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
   getExits,
   getSpawnPoints,
   getTilesets,
   getTileSize,
   getBackground,
   getPlatformColor,
   getSonarCooldown,
   getSonarReveals,
   assets,
   darknessLayer,
   getLightSources,
   enableLighting = true,
}) {
   const BACKGROUND_FILE_MAP = {
      'bg-atmosphere': 'bg-atmosphere.jpg',
      'bg-atmosphere.jpg': 'bg-atmosphere.jpg',
   };

   function normalizeBackgroundImageName(name) {
      if (!name) return null;
      const raw = String(name).trim();
      if (!raw) return null;
      if (BACKGROUND_FILE_MAP[raw]) return BACKGROUND_FILE_MAP[raw];
      return raw;
   }

   function toRgba(hex, alpha = 1) {
      if (typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(255,255,255,${alpha})`;
      let value = hex.slice(1);
      if (value.length === 3) {
         value = value.split('').map((c) => c + c).join('');
      }
      if (value.length !== 6) return `rgba(255,255,255,${alpha})`;
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
   }

   function drawRotatedAt(x, y, w, h, rotationDeg, drawFn) {
      push();
      translate(x, y);
      rotate(radians(rotationDeg || 0));
      drawFn(w, h);
      pop();
   }

   function getHazardStyle(hazard) {
      const props = hazard.properties ?? {};
      const shape = props.shape ?? (hazard.gid === 28 ? 'triangle' : 'rect');
      const color = props.color ?? '#d1342f';
      const alpha = Number.isFinite(props.alpha) ? props.alpha : hazard.opacity;
      return { shape, color, alpha: alpha ?? 1 };
   }

   function getCollectableStyle(collectable) {
      const props = collectable.properties ?? {};
      const gid = collectable.gid;
      const defaultShape = gid === 57 ? 'diamond' : 'circle';
      const shape = props.shape ?? defaultShape;
      const color = props.color ?? (gid === 57 ? '#7cf4ff' : '#ffd34d');
      const alpha = Number.isFinite(props.alpha) ? props.alpha : collectable.opacity;
      return { shape, color, alpha: alpha ?? 1 };
   }

   function getCollectableType(collectable, tileset) {
      const fromProps = collectable?.properties?.collectableType;
      if (typeof fromProps === 'string' && fromProps.length) return fromProps.toLowerCase();
      if (!tileset || !Number.isFinite(collectable?.gid)) return null;

      const localTileId = collectable.gid - tileset.firstgid;
      if (localTileId === 20) return 'power';
      if (localTileId === 41 || localTileId === 53) return 'health';
      return null;
   }

   function getCollectableTint(type) {
      if (type === 'power') return [255, 225, 80, 255]; // yellow
      if (type === 'health') return [110, 255, 120, 255]; // green
      return null;
   }

   function getExitStyle(exitObj) {
      const props = exitObj.properties ?? {};
      const color = exitObj.color ?? props.color ?? '#ff00ff';
      const alpha = Number.isFinite(props.alpha) ? props.alpha : exitObj.opacity;
      return { color, alpha: alpha ?? 1 };
   }

   function getSpawnKind(spawn, tilesets) {
      const typeText = String(spawn?.spawnType ?? '').toLowerCase();
      if (typeText.includes('enemy')) return 'enemy';
      if (typeText.includes('player')) return 'player';

      if (Number.isFinite(spawn?.gid)) {
         const tileset = getTilesetForGid(spawn.gid, tilesets);
         if (tileset) {
            const localTileId = spawn.gid - tileset.firstgid;
            if (localTileId === 68) return 'player'; // prototype tileset playerSpawn
            if (localTileId === 78) return 'enemy';  // prototype tileset enemySpawn
         }
      }

      const spawnId = String(spawn?.spawnId ?? '').toLowerCase();
      if (spawnId) return 'player';
      return 'unknown';
   }

   function normalizeRelativePath(basePath, relativePath) {
      const baseParts = basePath.split('/').filter(Boolean);
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

   function tilesetSourceToImagePath(source) {
      if (!source) return null;
      // backgrounds.tsx is an image collection (no single .png atlas file to load).
      if (String(source).toLowerCase().endsWith('backgrounds.tsx')) return null;
      const pngSource = source.replace(/\.tsx$/i, '.png');
      return normalizeRelativePath('data/rooms', pngSource);
   }

   function getTilesetForGid(gid, tilesets) {
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

   function resolveBackgroundImageFromGid(tilesets, gid) {
      const tileset = getTilesetForGid(gid, tilesets);
      if (!tileset) return null;
      if (String(tileset.source ?? '').toLowerCase().endsWith('backgrounds.tsx')) {
         const localTileId = gid - tileset.firstgid;
         const byId = {
            0: 'bg-atmosphere.jpg',
            1: 'bg-atmosphere.jpg'
         };
         return byId[localTileId] ?? null;
      }
      return null;
   }

   
//======================================
// DRAW BACKGROUND
//======================================

   function drawBackground() {
      const bg = getBackground?.();
      const tilesets = getTilesets?.() ?? [];
      const bgFromGid = resolveBackgroundImageFromGid(tilesets, bg?.gid);
      const bgImageKey = normalizeBackgroundImageName(bg?.image ?? bgFromGid);
      const drawW = bg?.w ?? width;
      const drawH = bg?.h ?? height;

      if (bgImageKey && assets?.[bgImageKey]) {
         image(assets[bgImageKey], 0, 0, drawW, drawH);
      } else if (bg?.color) {
         background(bg.color);
      } else {
         background(0);
      }

   }

//======================================
// DRAW ROOM
//======================================
   let elapsedTime = 0;
   const oscillationSpeed = 2; // Hz
   const oscillationAmount = 10; // pixels

   function drawPlatforms() {
      const platforms = getPlatforms?.() ?? [];
      const platformColor = getPlatformColor?.() ?? '#5a6e82';
      const tilesets = getTilesets?.() ?? [];
      const tileSize = getTileSize?.() ?? {};
      const tileWidth = tileSize.tileWidth ?? 16;
      const tileHeight = tileSize.tileHeight ?? 16;

      noStroke();
      for (const p of platforms) {
         const tileset = getTilesetForGid(p.gid, tilesets);
         const tilesetImagePath = tilesetSourceToImagePath(tileset?.source);
         const tilesetImage = tilesetImagePath ? assets?.[`tileset:${tilesetImagePath}`] : null;

         if (tileset && tilesetImage && Number.isFinite(p.gid)) {
            const localTileId = p.gid - tileset.firstgid;
            const columns = Math.max(1, Math.floor(tilesetImage.width / tileWidth));
            const srcX = (localTileId % columns) * tileWidth;
            const srcY = Math.floor(localTileId / columns) * tileHeight;
            image(tilesetImage, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, srcX, srcY, tileWidth, tileHeight);
            continue;
         }

         fill(platformColor);
         rect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      }
   }

   function drawHazards() {
      const hazards = getHazards?.() ?? [];
      if (!hazards.length) return;

      noStroke();
      for (const h of hazards) {
         if (h.visible === false) continue;
         const style = getHazardStyle(h);
         fill(toRgba(style.color, style.alpha));

         drawRotatedAt(h.x, h.y, h.w, h.h, h.rotation, (w, hgt) => {
            if (style.shape === 'triangle') {
               triangle(-w / 2, hgt / 2, 0, -hgt / 2, w / 2, hgt / 2);
            } else {
               rect(-w / 2, -hgt / 2, w, hgt);
            }
         });
      }
   }

   function drawCollectables() {
      const collectables = getCollectables?.() ?? [];
      if (!collectables.length) return;
      const tilesets = getTilesets?.() ?? [];
      const tileSize = getTileSize?.() ?? {};
      const tileWidth = tileSize.tileWidth ?? 16;
      const tileHeight = tileSize.tileHeight ?? 16;

      noStroke();
      for (const c of collectables) {
         if (c.visible === false) continue;
         const tileset = getTilesetForGid(c.gid, tilesets);
         const tilesetImagePath = tilesetSourceToImagePath(tileset?.source);
         const tilesetImage = tilesetImagePath ? assets?.[`tileset:${tilesetImagePath}`] : null;
         const collectableType = getCollectableType(c, tileset);
         const collectableTint = getCollectableTint(collectableType);
         const drawW = tileWidth;
         const drawH = tileHeight;

         if (tileset && tilesetImage) {
            const localTileId = c.gid - tileset.firstgid;
            const columns = Math.max(1, Math.floor(tilesetImage.width / tileWidth));
            const srcX = (localTileId % columns) * tileWidth;
            const srcY = Math.floor(localTileId / columns) * tileHeight;

            drawRotatedAt(c.x, c.y, drawW, drawH, c.rotation, (w, h) => {
               if (collectableTint) tint(...collectableTint);
               image(tilesetImage, -w / 2, -h / 2, w, h, srcX, srcY, tileWidth, tileHeight);
               if (collectableTint) noTint();
            });
            continue;
         }

         const style = getCollectableStyle(c);
         const fallbackColor = collectableType === 'power'
            ? '#ffe150'
            : collectableType === 'health'
              ? '#6eff78'
              : style.color;
         fill(toRgba(fallbackColor, style.alpha));

         drawRotatedAt(c.x, c.y, drawW, drawH, c.rotation, (w, h) => {
            if (style.shape === 'diamond') {
               beginShape();
               vertex(0, -h / 2);
               vertex(w / 2, 0);
               vertex(0, h / 2);
               vertex(-w / 2, 0);
               endShape(CLOSE);
            } else {
               ellipse(0, 0, w, h);
            }
         });
      }
   }

   function drawSpawnPoints() {
      const spawnPoints = getSpawnPoints?.() ?? [];
      if (!spawnPoints.length) return;
      const tilesets = getTilesets?.() ?? [];
      const tileSize = getTileSize?.() ?? {};
      const tileWidth = tileSize.tileWidth ?? 16;
      const tileHeight = tileSize.tileHeight ?? 16;
      const side = tileWidth;
      const triHeight = tileHeight;
      const topY = -triHeight / 2;
      const baseY = triHeight / 2;

      for (const s of spawnPoints) {
         const kind = getSpawnKind(s, tilesets);
         const markerColor = kind === 'enemy' ? '#ff3b3b' : '#39ff8a';

         push();
         noStroke();
         fill(markerColor);
         triangle(
            s.x, s.y + topY,
            s.x - side / 2, s.y + baseY,
            s.x + side / 2, s.y + baseY
         );
         pop();
      }
   }

   function drawExits() {
      const exits = getExits?.() ?? [];
      if (!exits.length) return;

      strokeWeight(2);
      for (const e of exits) {
         if (e.visible === false) continue;
         const style = getExitStyle(e);
         stroke(style.color);
         fill(toRgba(style.color, Math.min(0.35, style.alpha)));
         drawRotatedAt(e.x, e.y, e.w, e.h, e.rotation, (w, h) => {
            rect(-w / 2, -h / 2, w, h);
         });
      }
      noStroke();
   }

//======================================
// DRAW SONAR REVEALS (FROM SONAR SYSTEM)
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

         noFill();
         rect(r.x, r.y, r.w, r.h);
      }
      rectMode(CORNER);
   }

//======================================
// DRAW PLAYER
//======================================
   function drawPlayer() {

      push();
      translate(player.x, player.y);
      scale(player.facing, 1);

      fill(120);
      noStroke();
      rect(-2, -player.size * 0.8, 4, player.size * 0.6);
      rect(0.1, -player.size * 0.8, 8, 4);

      fill(150);
      noStroke();
      triangle(
         -player.size / 2, 0,
         -player.size,
         -player.size / 3,
         -player.size,
         player.size / 3
      );
      fill(255, 200, 50);
      ellipse(0, 0, player.size * 1.2, player.size * 0.8);

      fill(100, 220, 255);
      circle(player.size * 0.2, 0, player.size * 0.4);
      pop();
   }

//======================================
// DRAW UI
//======================================
   function drawUI() {
      fill(255);
      noStroke();
      text(`Power: ${Math.round(player.power.current)}`, 20, 30);

      const sonarCooldown = getSonarCooldown?.() ?? 0;
      if (Number.isFinite(sonarCooldown) && sonarCooldown > 0) {
         fill('#d61b1b');
         text(`Sonar: cooling`, 20, 55);
      } else {
         fill('#64ff64');
         text(`Sonar: ready (K)`, 20, 55);
      }
   }

//======================================
// DRAW LIGHTING
//======================================
   function drawLighting(lightSources = []) {
      darknessLayer.clear();
      darknessLayer.background(0);

      const ctx = darknessLayer.drawingContext;
      ctx.globalCompositeOperation = 'destination-out';

      for (const light of lightSources) {
         const { x, y, radius, intensity = 1 } = light;
         const scaledRadius = radius * (0.8 + 0.2 * intensity);

         const gradient = ctx.createRadialGradient(
            x, y, scaledRadius * 0.1,
            x, y, scaledRadius
         );
         gradient.addColorStop(0, `rgba(255,255,255,${intensity})`);
         gradient.addColorStop(0.3, `rgba(255,255,255,${intensity * 0.6})`);
         gradient.addColorStop(0.6, `rgba(255,255,255,${intensity * 0.2})`);
         gradient.addColorStop(1, 'rgba(0,0,0,0)');

         ctx.fillStyle = gradient;
         ctx.beginPath();
         ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
         ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      image(darknessLayer, 0, 0);
   }

   // draw by changing DRAW to true in config, shows hitbox boundaries
   function debugHitbox(drawThis){
      if(drawThis){
         let walls = getPlatforms();
         for(let i in walls){
            walls[i].debugDrawHitbox(DEBUG_COLOR.WALL);
         }
         player.debugDrawHitbox(DEBUG_COLOR.PLAYER);
      }
   }

//======================================
// DRAW() - EVERYTHING
//======================================
   return {
      draw(deltaTime) {
         elapsedTime += deltaTime ?? 0;
         const lightSources = getLightSources?.() ?? [];

         drawBackground();
         drawPlatforms();
         drawHazards();
         drawCollectables();
         drawExits();
         drawSpawnPoints();
         drawPlayer();
         if (enableLighting) {
            drawLighting(lightSources);
         }
         drawSonarReveals();
         drawUI();
         debugHitbox(DEBUG_COLOR.DRAW);
      }
   };
}
//======================================
// END
//======================================