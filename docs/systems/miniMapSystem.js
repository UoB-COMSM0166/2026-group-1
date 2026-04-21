import { MINIMAP } from "../config.js";
import {
   buildRevealNeighborhood,
   clamp,
   isTileInBounds,
   parseTileKey,
   projectWorldPointToFrame,
   projectWorldRectToFrame,
   resolveHudFrame,
   tileKey,
   worldToTile,
} from "./minimapMath.js";

function getPlayerWorldPosition(player) {
   const worldX = player?.position?.x ?? player?.x;
   const worldY = player?.position?.y ?? player?.y;
   if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return null;
   return { worldX, worldY };
}

function getPlatformRect(platform) {
   if (!platform) return null;

   if (
      typeof platform.getCornerX === "function" &&
      typeof platform.getCornerY === "function" &&
      typeof platform.getWidth === "function" &&
      typeof platform.getHeight === "function"
   ) {
      return {
         x: platform.getCornerX(),
         y: platform.getCornerY(),
         w: platform.getWidth(),
         h: platform.getHeight(),
      };
   }

   const w = platform?.w ?? platform?.width;
   const h = platform?.h ?? platform?.height;
   const centerX = platform?.x;
   const centerY = platform?.y;

   if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerY)
   ) {
      return null;
   }

   return {
      x: centerX - w / 2,
      y: centerY - h / 2,
      w,
      h,
   };
}

function mergeConfig(partialConfig = {}) {
   const merged = {
      anchor: partialConfig.anchor ?? MINIMAP.ANCHOR,
      marginPx: partialConfig.marginPx ?? MINIMAP.MARGIN_PX,
      widthPx: partialConfig.widthPx ?? MINIMAP.WIDTH_PX,
      heightPx: partialConfig.heightPx ?? MINIMAP.HEIGHT_PX,
      revealRadiusTiles:
         partialConfig.revealRadiusTiles ?? MINIMAP.REVEAL_RADIUS_TILES,
      maxRevealRadiusTiles:
         partialConfig.maxRevealRadiusTiles ?? MINIMAP.MAX_REVEAL_RADIUS_TILES,
      colors: {
         ...MINIMAP.COLORS,
         ...(partialConfig.colors ?? {}),
      },
   };

   merged.revealRadiusTiles = clamp(
      Math.floor(merged.revealRadiusTiles),
      0,
      Math.max(0, merged.maxRevealRadiusTiles),
   );

   return merged;
}

function normalizeRoomMetrics(roomState) {
   const roomWidthPx = Number(roomState?.width);
   const roomHeightPx = Number(roomState?.height);
   const tileWidthPx = Number(roomState?.tileWidth);
   const tileHeightPx = Number(roomState?.tileHeight);

   const valid =
      Number.isFinite(roomWidthPx) &&
      Number.isFinite(roomHeightPx) &&
      Number.isFinite(tileWidthPx) &&
      Number.isFinite(tileHeightPx) &&
      roomWidthPx > 0 &&
      roomHeightPx > 0 &&
      tileWidthPx > 0 &&
      tileHeightPx > 0;

   if (!valid) {
      return {
         valid: false,
         roomWidthPx: 0,
         roomHeightPx: 0,
         tileWidthPx: 0,
         tileHeightPx: 0,
         roomWidthTiles: 0,
         roomHeightTiles: 0,
      };
   }

   return {
      valid: true,
      roomWidthPx,
      roomHeightPx,
      tileWidthPx,
      tileHeightPx,
      roomWidthTiles: Math.max(1, Math.ceil(roomWidthPx / tileWidthPx)),
      roomHeightTiles: Math.max(1, Math.ceil(roomHeightPx / tileHeightPx)),
   };
}

export function createMiniMapSystem({
   player,
   getCurrentRoomId,
   getCurrentRoomState,
   getPlatforms,
   getViewportSize,
   config,
} = {}) {
   const minimapConfig = mergeConfig(config);
   const explorationByRoom = new Map();
   const initializedRooms = new Set();
   const warnedInvalidMetricsRooms = new Set();
   const lastPlayerTileByRoom = new Map();
   const skipRevealOnRoomEntry = new Set();

   let activeRoomId = null;

   function ensureRoomSet(roomId) {
      if (!explorationByRoom.has(roomId)) {
         explorationByRoom.set(roomId, new Set());
      }
      return explorationByRoom.get(roomId);
   }

   function onRoomChanged(roomId) {
      if (!roomId) return;
      activeRoomId = roomId;
      ensureRoomSet(roomId);
      if (initializedRooms.has(roomId)) {
         skipRevealOnRoomEntry.add(roomId);
      }
   }

   function revealAroundPlayer(metrics, radiusTiles) {
      if (!activeRoomId || !metrics.valid) return 0;
      const playerPos = getPlayerWorldPosition(player);
      if (!playerPos) return 0;

      const revealSet = ensureRoomSet(activeRoomId);
      const playerTile = worldToTile(
         playerPos.worldX,
         playerPos.worldY,
         metrics.tileWidthPx,
         metrics.tileHeightPx,
      );

      let inserted = 0;
      const candidates = buildRevealNeighborhood(
         playerTile.tileX,
         playerTile.tileY,
         radiusTiles,
      );

      for (const candidate of candidates) {
         if (
            !isTileInBounds(
               candidate.tileX,
               candidate.tileY,
               metrics.roomWidthTiles,
               metrics.roomHeightTiles,
            )
         ) {
            continue;
         }

         const key = tileKey(candidate.tileX, candidate.tileY);
         if (!revealSet.has(key)) {
            revealSet.add(key);
            inserted += 1;
         }
      }

      return inserted;
   }

   function getCurrentPlayerTile(metrics) {
      if (!metrics.valid) return null;
      const playerPos = getPlayerWorldPosition(player);
      if (!playerPos) return null;

      return worldToTile(
         playerPos.worldX,
         playerPos.worldY,
         metrics.tileWidthPx,
         metrics.tileHeightPx,
      );
   }

   function getMetrics() {
      const roomState = getCurrentRoomState?.() ?? null;
      return {
         roomState,
         metrics: normalizeRoomMetrics(roomState),
      };
   }

   function warnInvalidMetrics(roomId, roomState) {
      if (!roomId || warnedInvalidMetricsRooms.has(roomId)) return;
      warnedInvalidMetricsRooms.add(roomId);
      console.warn("[miniMapSystem] Invalid room metrics, drawing fallback frame only", {
         roomId,
         width: roomState?.width,
         height: roomState?.height,
         tileWidth: roomState?.tileWidth,
         tileHeight: roomState?.tileHeight,
      });
   }

   function getFrame() {
      const viewport = getViewportSize?.() ?? {
         width: typeof width === "number" ? width : 640,
         height: typeof height === "number" ? height : 360,
      };

      return resolveHudFrame({
         anchor: minimapConfig.anchor,
         marginPx: minimapConfig.marginPx,
         widthPx: minimapConfig.widthPx,
         heightPx: minimapConfig.heightPx,
         viewportWidth: viewport.width,
         viewportHeight: viewport.height,
      });
   }

   function drawFrame(frame) {
      noStroke();
      fill(minimapConfig.colors.FRAME);
      rect(frame.x, frame.y, frame.width, frame.height, 8);

      const inset = 4;
      fill(minimapConfig.colors.BACKGROUND);
      rect(
         frame.x + inset,
         frame.y + inset,
         frame.width - inset * 2,
         frame.height - inset * 2,
         6,
      );
   }

   function drawRevealedTiles(frame, metrics, revealSet) {
      if (!metrics.valid || !revealSet) return;
      const tileW = frame.width / metrics.roomWidthTiles;
      const tileH = frame.height / metrics.roomHeightTiles;

      noStroke();
      fill(minimapConfig.colors.REVEALED);

      for (const key of revealSet) {
         const parsed = parseTileKey(key);
         if (!parsed) continue;
         if (
            !isTileInBounds(
               parsed.tileX,
               parsed.tileY,
               metrics.roomWidthTiles,
               metrics.roomHeightTiles,
            )
         ) {
            continue;
         }

         rect(
            frame.x + parsed.tileX * tileW,
            frame.y + parsed.tileY * tileH,
            Math.max(1, tileW),
            Math.max(1, tileH),
         );
      }
   }

   function drawUnrevealedFog(frame, metrics, revealSet) {
      if (!metrics.valid || !revealSet) return;
      const maxTileCount = metrics.roomWidthTiles * metrics.roomHeightTiles;
      if (revealSet.size >= maxTileCount) return;

      const tileW = frame.width / metrics.roomWidthTiles;
      const tileH = frame.height / metrics.roomHeightTiles;

      noStroke();
      fill(minimapConfig.colors.UNREVEALED);

      for (let tileY = 0; tileY < metrics.roomHeightTiles; tileY += 1) {
         for (let tileX = 0; tileX < metrics.roomWidthTiles; tileX += 1) {
            const key = tileKey(tileX, tileY);
            if (revealSet.has(key)) continue;

            rect(
               frame.x + tileX * tileW,
               frame.y + tileY * tileH,
               Math.max(1, tileW),
               Math.max(1, tileH),
            );
         }
      }
   }

   function drawGeometry(frame, metrics, revealSet) {
      const platforms = getPlatforms?.() ?? [];
      if (!Array.isArray(platforms) || platforms.length === 0) return;

      noStroke();
      fill(minimapConfig.colors.GEOMETRY);

      for (const platform of platforms) {
         const rectWorld = getPlatformRect(platform);
         if (!rectWorld) continue;

         const centerTile = worldToTile(
            rectWorld.x + rectWorld.w / 2,
            rectWorld.y + rectWorld.h / 2,
            metrics.tileWidthPx,
            metrics.tileHeightPx,
         );
         if (!revealSet.has(tileKey(centerTile.tileX, centerTile.tileY))) continue;

         const projected = projectWorldRectToFrame({
            rect: rectWorld,
            roomWidthPx: metrics.roomWidthPx,
            roomHeightPx: metrics.roomHeightPx,
            frame,
         });

         rect(projected.x, projected.y, projected.w, projected.h);
      }
   }

   function drawPlayerMarker(frame, metrics) {
      const playerPos = getPlayerWorldPosition(player);
      if (!playerPos || !metrics.valid) return;

      const marker = projectWorldPointToFrame({
         worldX: playerPos.worldX,
         worldY: playerPos.worldY,
         roomWidthPx: metrics.roomWidthPx,
         roomHeightPx: metrics.roomHeightPx,
         frame,
      });

      stroke(minimapConfig.colors.OUTLINE);
      strokeWeight(1);
      fill(minimapConfig.colors.PLAYER);
      circle(marker.x, marker.y, 6);
   }

   return {
      update() {
         const roomId = getCurrentRoomId?.();
         if (!roomId) return;

         if (activeRoomId !== roomId) {
            onRoomChanged(roomId);
         }

         const { metrics } = getMetrics();
         if (!metrics.valid) return;

         warnedInvalidMetricsRooms.delete(roomId);

          const playerTile = getCurrentPlayerTile(metrics);
          if (!playerTile) return;
          const currentTileKey = tileKey(playerTile.tileX, playerTile.tileY);

         if (!initializedRooms.has(roomId)) {
            revealAroundPlayer(metrics, minimapConfig.revealRadiusTiles);
            initializedRooms.add(roomId);
            lastPlayerTileByRoom.set(roomId, currentTileKey);
            return;
         }

         if (skipRevealOnRoomEntry.has(roomId)) {
            lastPlayerTileByRoom.set(roomId, currentTileKey);
            skipRevealOnRoomEntry.delete(roomId);
            return;
         }

         if (lastPlayerTileByRoom.get(roomId) === currentTileKey) {
            return;
         }

         lastPlayerTileByRoom.set(roomId, currentTileKey);
         revealAroundPlayer(metrics, minimapConfig.revealRadiusTiles);
      },

      draw() {
         if (typeof push !== "function") return;
         const frame = getFrame();

         const roomId = getCurrentRoomId?.() ?? activeRoomId;
         if (!roomId) return;
         const revealSet = ensureRoomSet(roomId);
         const { roomState, metrics } = getMetrics();

         push();
         drawFrame(frame);

         if (metrics.valid) {
            drawRevealedTiles(frame, metrics, revealSet);
            drawGeometry(frame, metrics, revealSet);
            drawUnrevealedFog(frame, metrics, revealSet);
            drawPlayerMarker(frame, metrics);
         } else {
            warnInvalidMetrics(roomId, roomState);
         }

         pop();
      },

      onRoomChanged,

      getExplorationState(roomId) {
         if (roomId) {
            const roomSet = explorationByRoom.get(roomId) ?? new Set();
            return {
               roomId,
               revealedTiles: new Set(roomSet),
            };
         }

         const snapshot = {};
         for (const [id, roomSet] of explorationByRoom.entries()) {
            snapshot[id] = [...roomSet];
         }
         return snapshot;
      },

      restoreExplorationState(roomId, revealedTileKeys = []) {
         if (!roomId) return;
         const roomSet = new Set();
         for (const key of revealedTileKeys) {
            if (parseTileKey(key)) roomSet.add(key);
         }
         explorationByRoom.set(roomId, roomSet);
      },

      resetAllState() {
         explorationByRoom.clear();
         initializedRooms.clear();
         warnedInvalidMetricsRooms.clear();
         lastPlayerTileByRoom.clear();
         skipRevealOnRoomEntry.clear();
         activeRoomId = null;
      },
   };
}

