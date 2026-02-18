/*
========================================
VERSION: 1.1
SYSTEM: ROOM SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Loads and normalizes room data from legacy objects or
imported Tiled JSON: https://www.mapeditor.org/
- Exposes room state to physics/render systems
========================================
*/

//======================================
// ROOM SYSTEM
//======================================
import { CANVAS } from '../config.js';
import { pointToPixels, rectToPixels, toPixels } from '../utils/toPixels.js';

function getTiledProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function parseCollisionTileLayer(layer, tileWidth, tileHeight) {
  const result = [];
  const data = layer?.data;
  const width = layer?.width;
  const height = layer?.height;

  if (!Array.isArray(data) || !width || !height) return result;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const gid = data[index];
      if (!gid) continue;

      result.push({
        x: x * tileWidth + tileWidth / 2,
        y: y * tileHeight + tileHeight / 2,
        w: tileWidth,
        h: tileHeight
      });
    }
  }

  return result;
}

function normalizeTiledRoom(roomKey, mapData) {
  const tileWidth = mapData?.tilewidth ?? CANVAS.TILE_SIZE;
  const tileHeight = mapData?.tileheight ?? CANVAS.TILE_SIZE;

  const normalized = {
    id: roomKey,
    width: (mapData?.width ?? 0) * tileWidth,
    height: (mapData?.height ?? 0) * tileHeight,
    background: {
      color: getTiledProperty(mapData, 'backgroundColor', '#000000'),
      image: getTiledProperty(mapData, 'backgroundImage', null)
    },
    platformColor: getTiledProperty(mapData, 'platformColor', '#5a6e82'),
    playerStart: null,
    platforms: [],
    entities: [],
    exits: []
  };

  for (const layer of mapData?.layers ?? []) {
    const layerName = (layer?.name ?? '').toLowerCase();

    if (layer?.type === 'tilelayer' && layerName === 'collision') {
      normalized.platforms.push(...parseCollisionTileLayer(layer, tileWidth, tileHeight));
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'platforms') {
      for (const obj of layer.objects ?? []) {
        normalized.platforms.push({
          x: (obj.x ?? 0) + (obj.width ?? tileWidth) / 2,
          y: (obj.y ?? 0) + (obj.height ?? tileHeight) / 2,
          w: obj.width ?? tileWidth,
          h: obj.height ?? tileHeight
        });
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'spawns') {
      const spawn = (layer.objects ?? []).find(
        (obj) => (obj.type ?? '').toLowerCase() === 'player' || (obj.name ?? '').toLowerCase() === 'player'
      ) ?? (layer.objects ?? [])[0];

      if (spawn) {
        normalized.playerStart = {
          x: (spawn.x ?? 0) + (spawn.width ?? 0) / 2,
          y: (spawn.y ?? 0) + (spawn.height ?? 0) / 2
        };
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'entities') {
      normalized.entities = [...(layer.objects ?? [])];
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'exits') {
      normalized.exits = [...(layer.objects ?? [])];
      continue;
    }

    if (layer?.type === 'imagelayer' && !normalized.background.image && layer?.image) {
      normalized.background.image = layer.image;
    }
  }

  if (!normalized.playerStart) {
    const startX = getTiledProperty(mapData, 'playerStartX', null);
    const startY = getTiledProperty(mapData, 'playerStartY', null);
    if (startX !== null && startY !== null) {
      normalized.playerStart = pointToPixels({ x: startX, y: startY });
    }
  }

  return normalized;
}

function normalizeLegacyRoom(roomKey, roomConfig) {
  const normalized = {
    ...roomConfig,
    id: roomConfig.id ?? roomKey,
    playerStart: null,
    platforms: []
  };

  if (roomConfig.platformsTiles) {
    normalized.platforms = roomConfig.platformsTiles.map((platform) => rectToPixels(platform));
  } else if (roomConfig.platforms) {
    normalized.platforms = [...roomConfig.platforms];
  } else if (Array.isArray(roomConfig.tiles)) {
    // Basic grid fallback: any non-zero tile is treated as solid.
    normalized.platforms = [];
    for (let y = 0; y < roomConfig.tiles.length; y++) {
      for (let x = 0; x < roomConfig.tiles[y].length; x++) {
        if (!roomConfig.tiles[y][x]) continue;
        normalized.platforms.push({
          x: toPixels(x) + CANVAS.TILE_SIZE / 2,
          y: toPixels(y) + CANVAS.TILE_SIZE / 2,
          w: CANVAS.TILE_SIZE,
          h: CANVAS.TILE_SIZE
        });
      }
    }
  }

  if (roomConfig.playerStartTiles) {
    normalized.playerStart = pointToPixels(roomConfig.playerStartTiles);
  } else {
    normalized.playerStart = roomConfig.playerStart ?? null;
  }

  normalized.entities = [...(roomConfig.entities ?? [])];
  normalized.exits = [...(roomConfig.exits ?? [])];
  normalized.background = roomConfig.background ?? null;
  normalized.platformColor = roomConfig.platformColor ?? null;

  return normalized;
}

function normalizeRoom(roomKey, roomSource) {
  if (Array.isArray(roomSource?.layers)) {
    return normalizeTiledRoom(roomKey, roomSource);
  }
  return normalizeLegacyRoom(roomKey, roomSource);
}

export function createRoomSystem({ initialRoom = null, roomData = {} } = {}) {
  let currentRoom = null;
  let currentConfig = null;
  let playerStart = null;
  let entities = [];
  let platforms = [];

  function loadRoom(roomKey) {
    const roomSource = roomData[roomKey];
    if (!roomSource) return;

    const normalized = normalizeRoom(roomKey, roomSource);

    currentRoom = roomKey;
    currentConfig = normalized;
    platforms = [...(normalized.platforms ?? [])];
    entities = [...(normalized.entities ?? [])];
    playerStart = normalized.playerStart ?? null;
  }

  function updateRoomLogic(deltaTime) {
    for (const entity of entities) {
      entity.update?.(deltaTime);
    }
  }

  if (initialRoom) {
    loadRoom(initialRoom);
  }

  return {
    update(deltaTime) {
      if (!currentRoom) return;
      updateRoomLogic(deltaTime);
    },

    goToRoom(roomKey) {
      loadRoom(roomKey);
    },

    getCurrentRoom() {
      return currentRoom;
    },

    getEntities() {
      return entities;
    },

    getPlatforms() {
      return platforms;
    },

    getBackground() {
      return currentConfig?.background ?? null;
    },

    getPlayerStart() {
      return playerStart;
    },

    getPlatformColor() {
      return currentConfig?.platformColor ?? null;
    }
  };
}

//======================================
// END
//======================================
