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
import { Wall } from './hitboxSystem.js';

function getTiledProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function getLayerProperty(layer, key, fallback = null) {
  const props = layer?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function normalizeLayerName(name = '') {
  return String(name).toLowerCase().replace(/[\s_-]+/g, '');
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

function inferSpawnTypeFromObject(obj, tilesets = []) {
  const propType = (obj?.properties ?? []).find((p) => p?.name === 'spawnType')?.value;
  if (typeof propType === 'string' && propType.trim()) return propType;

  const gid = obj?.gid;
  if (!Number.isFinite(gid)) return '';
  const tileset = getTilesetForGid(gid, tilesets);
  if (!tileset) return '';

  const localTileId = gid - tileset.firstgid;
  if (localTileId === 68) return 'player';
  if (localTileId === 78) return 'enemy';
  return '';
}

function isSpawnMarkerObject(obj, tilesets = []) {
  const hasSpawnId = (obj?.properties ?? []).some((p) => p?.name === 'spawnId');
  if (hasSpawnId) return true;
  return inferSpawnTypeFromObject(obj, tilesets).length > 0;
}

function parseCollisionTileLayer(layer, tileWidth, tileHeight) {
  const result = [];
  const data = layer?.data;
  const width = layer?.width;
  const height = layer?.height;
  const FLIP_MASK = 0x1FFFFFFF;

  if (!width || !height) return result;
  if (!Array.isArray(data)) {
    // Room exports should use CSV / uncompressed tile arrays for runtime parsing.
    console.warn(`Collision layer "${layer?.name ?? 'unknown'}" has non-array tile data.`);
    return result;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const rawGid = data[index] >>> 0;
      const gid = rawGid & FLIP_MASK;
      if (!gid) continue;

      result.push({
        // Normalize to world-space center coordinates so render + physics align.
        x: x * tileWidth + tileWidth / 2,
        y: y * tileHeight + tileHeight / 2,
        w: tileWidth,
        h: tileHeight,
        gid
      });
    }
  }

  return result;
}

function parsePropertiesMap(properties = []) {
  const result = {};
  for (const prop of properties) {
    if (!prop?.name) continue;
    result[prop.name] = prop.value;
  }
  return result;
}

function getObjectCenter(obj, defaultW, defaultH) {
  const w = obj?.width ?? defaultW;
  const h = obj?.height ?? defaultH;
  const x = (obj?.x ?? 0) + w / 2;
  // In Tiled, tile objects (with gid) use bottom-left origin on Y.
  const y = obj?.gid != null
    ? (obj?.y ?? 0) - h / 2
    : (obj?.y ?? 0) + h / 2;
  return { x, y, w, h };
}

function normalizeObjectGroupObjects(objects = [], tileWidth, tileHeight, layerOpacity = 1) {
  return objects.map((obj) => {
    const { x, y, w, h } = getObjectCenter(obj, tileWidth, tileHeight);
    const properties = parsePropertiesMap(obj.properties ?? []);
    const visible = obj.visible !== false;
    const opacity = Math.max(0, Math.min(1, (obj.opacity ?? 1) * (layerOpacity ?? 1)));
    return {
      x,
      y,
      w,
      h,
      gid: obj.gid ?? null,
      type: obj.type ?? '',
      name: obj.name ?? '',
      rotation: obj.rotation ?? 0,
      visible,
      opacity,
      properties
    };
  });
}

function normalizeTiledRoom(roomKey, mapData) {
  const tileWidth = mapData?.tilewidth ?? CANVAS.TILE_SIZE;
  const tileHeight = mapData?.tileheight ?? CANVAS.TILE_SIZE;

  const normalized = {
    id: roomKey,
    width: (mapData?.width ?? 0) * tileWidth,
    height: (mapData?.height ?? 0) * tileHeight,
    tileWidth,
    tileHeight,
    tilesets: [...(mapData?.tilesets ?? [])],
    background: {
      color: getTiledProperty(mapData, 'backgroundColor', '#000000'),
      image: getTiledProperty(mapData, 'backgroundImage', null),
      gid: null,
      w: null,
      h: null
    },
    platformColor: getTiledProperty(mapData, 'platformColor', '#5a6e82'),
    playerStart: null,
    spawnPoints: [],
    platforms: [],
    hazards: [],
    collectables: [],
    triggers: [],
    entities: [],
    exits: []
  };

  for (const layer of mapData?.layers ?? []) {
    const layerName = normalizeLayerName(layer?.name ?? '');

    const isCollisionLayer = layer?.type === 'tilelayer'
      && (layerName.includes('collision') || getLayerProperty(layer, 'collisionLayer', false) === true);
    if (isCollisionLayer) {
      normalized.platforms.push(...parseCollisionTileLayer(layer, tileWidth, tileHeight));
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName.includes('platform')) {
      for (const obj of layer.objects ?? []) {
        const center = getObjectCenter(obj, tileWidth, tileHeight);
        normalized.platforms.push({
          x: center.x,
          y: center.y,
          w: center.w,
          h: center.h
        });
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName.includes('hazard')) {
      normalized.hazards = normalizeObjectGroupObjects(
        layer.objects ?? [],
        tileWidth,
        tileHeight,
        layer.opacity ?? 1
      );
      continue;
    }

    if (layer?.type === 'objectgroup' && (layerName.includes('collectable') || layerName.includes('collectible'))) {
      normalized.collectables = normalizeObjectGroupObjects(
        layer.objects ?? [],
        tileWidth,
        tileHeight,
        layer.opacity ?? 1
      );
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName.includes('background')) {
      const backgroundObj = (layer.objects ?? [])[0];
      const objectProps = parsePropertiesMap(backgroundObj?.properties ?? []);
      const objectName = backgroundObj?.name ?? '';
      normalized.background.image =
        objectProps.backgroundImage
        ?? objectProps.image
        ?? (objectName || normalized.background.image);
      normalized.background.gid = backgroundObj?.gid ?? normalized.background.gid;
      normalized.background.w = backgroundObj?.width ?? normalized.background.w;
      normalized.background.h = backgroundObj?.height ?? normalized.background.h;
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName.includes('spawn')) {
      const spawnCandidates = (layer.objects ?? []).map((obj) => {
        const center = getObjectCenter(obj, 0, 0);
        const spawnId = (obj.properties ?? []).find((p) => p?.name === 'spawnId')?.value
          ?? obj.name
          ?? obj.type
          ?? 'spawn';
        const spawnType = (obj.properties ?? []).find((p) => p?.name === 'spawnType')?.value
          ?? obj.type
          ?? obj.name
          ?? '';
        return {
          x: center.x,
          y: center.y,
          spawnId: String(spawnId),
          spawnType: String(spawnType),
          gid: obj.gid ?? null
        };
      });
      normalized.spawnPoints.push(...spawnCandidates);

      const spawn = (layer.objects ?? []).find(
        (obj) => (obj.type ?? '').toLowerCase() === 'player' || (obj.name ?? '').toLowerCase() === 'player'
      ) ?? (layer.objects ?? [])[0];

      if (spawn) {
        const center = getObjectCenter(spawn, 0, 0);
        normalized.playerStart = {
          x: center.x,
          y: center.y
        };
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && (layerName.includes('entity') || layerName.includes('entities'))) {
      normalized.entities = [...(layer.objects ?? [])];

      const entitySpawns = (layer.objects ?? []).filter((obj) =>
        isSpawnMarkerObject(obj, normalized.tilesets)
      ).map((obj) => {
        const center = getObjectCenter(obj, 0, 0);
        const spawnId = (obj.properties ?? []).find((p) => p?.name === 'spawnId')?.value ?? 'spawn';
        const spawnType = (obj.properties ?? []).find((p) => p?.name === 'spawnType')?.value
          ?? inferSpawnTypeFromObject(obj, normalized.tilesets)
          ?? obj.type
          ?? obj.name
          ?? '';
        return {
          x: center.x,
          y: center.y,
          spawnId: String(spawnId),
          spawnType: String(spawnType),
          gid: obj.gid ?? null
        };
      });
      normalized.spawnPoints.push(...entitySpawns);

      // Prefer explicit spawn marker with spawnId=default.
      const spawnObject = (layer.objects ?? []).find((obj) => {
        const spawnId = (obj.properties ?? []).find((p) => p?.name === 'spawnId')?.value;
        return typeof spawnId === 'string' && spawnId.toLowerCase() === 'default';
      }) ?? (layer.objects ?? []).find((obj) =>
        (obj.properties ?? []).some((p) => p?.name === 'spawnId')
      );

      if (spawnObject) {
        const center = getObjectCenter(spawnObject, 0, 0);
        normalized.playerStart = {
          x: center.x,
          y: center.y
        };
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && (layerName.includes('trigger') || layerName.includes('exit'))) {
      const triggerObjects = normalizeObjectGroupObjects(
        layer.objects ?? [],
        tileWidth,
        tileHeight,
        layer.opacity ?? 1
      );
      normalized.triggers.push(...triggerObjects);

      const typedExits = triggerObjects.filter((obj) => {
        const typeIsExit = String(obj?.type ?? '').toLowerCase() === 'exit';
        const hasExitProps = obj?.properties?.targetRoom != null
          || obj?.properties?.targetSpawn != null
          || obj?.properties?.isWin === true;
        return typeIsExit || hasExitProps;
      });
      if (typedExits.length) {
        normalized.exits.push(...typedExits);
      } else if (layerName.includes('exit')) {
        // Backward compatibility for dedicated "exit" layers with untyped objects.
        normalized.exits.push(...triggerObjects);
      }
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
    tileWidth: CANVAS.TILE_SIZE,
    tileHeight: CANVAS.TILE_SIZE,
    tilesets: [...(roomConfig.tilesets ?? [])],
    playerStart: null,
    spawnPoints: [...(roomConfig.spawnPoints ?? [])],
    platforms: [],
    hazards: [],
    collectables: [],
    triggers: [...(roomConfig.triggers ?? [])]
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
        normalized.platforms.push(
          new Wall(toPixels(x), toPixels(y), CANVAS.TILE_SIZE, CANVAS.TILE_SIZE)
        );
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
  normalized.hazards = [...(roomConfig.hazards ?? [])];
  normalized.collectables = [...(roomConfig.collectables ?? [])];

  return normalized;
}

function normalizeRoom(roomKey, roomSource) {
  if (Array.isArray(roomSource?.layers)) {
    return normalizeTiledRoom(roomKey, roomSource);
  }
  return normalizeLegacyRoom(roomKey, roomSource);
}

export function createRoomSystem({
  initialRoom = null,
  roomData = {},
  player = null,
  onRoomLoaded = null
} = {}) {
  let currentRoom = null;
  let currentConfig = null;
  let playerStart = null;
  let entities = [];
  let platforms = [];
  let hazards = [];
  let collectables = [];
  let triggers = [];
  let spawnPoints = [];
  let exits = [];
  let tilesets = [];
  let tileWidth = CANVAS.TILE_SIZE;
  let tileHeight = CANVAS.TILE_SIZE;
  let exitCooldownMs = 0;

  function findSpawnPointById(spawnId) {
    if (!spawnId) return null;
    const needle = String(spawnId).toLowerCase();
    return spawnPoints.find((spawn) => String(spawn?.spawnId ?? '').toLowerCase() === needle) ?? null;
  }

  function setPlayerPosition(position) {
    if (!player || !position) return;
    if (typeof player.setCurrentPosition === 'function') {
      player.setCurrentPosition(position.x, position.y);
    } else {
      player.x = position.x;
      player.y = position.y;
      if (player.nextPos) {
        player.nextPos.x = position.x;
        player.nextPos.y = position.y;
      }
    }

    if (typeof player.setVelocityX === 'function') player.setVelocityX(0);
    if (typeof player.setVelocityY === 'function') player.setVelocityY(0);
    if (Number.isFinite(player.vx)) player.vx = 0;
    if (Number.isFinite(player.vy)) player.vy = 0;
  }

  function loadRoom(roomKey, { spawnId = null } = {}) {
    const roomSource = roomData[roomKey];
    if (!roomSource) return;

    const normalized = normalizeRoom(roomKey, roomSource);

    currentRoom = roomKey;
    currentConfig = normalized;
    platforms = [...(normalized.platforms ?? [])];
    hazards = [...(normalized.hazards ?? [])];
    collectables = [...(normalized.collectables ?? [])];
    triggers = [...(normalized.triggers ?? [])];
    spawnPoints = [...(normalized.spawnPoints ?? [])];
    exits = [...(normalized.exits ?? [])];
    entities = [...(normalized.entities ?? [])];
    tilesets = [...(normalized.tilesets ?? [])];
    tileWidth = normalized.tileWidth ?? CANVAS.TILE_SIZE;
    tileHeight = normalized.tileHeight ?? CANVAS.TILE_SIZE;

    const explicitSpawn = findSpawnPointById(spawnId);
    playerStart = explicitSpawn ?? normalized.playerStart ?? null;
    setPlayerPosition(playerStart);

    onRoomLoaded?.({
      room: currentRoom,
      width: normalized.width,
      height: normalized.height
    });
  }

  function updateRoomLogic(deltaTime) {
    for (const entity of entities) {
      entity.update?.(deltaTime);
    }
  }

  function isOverlappingPlayer(obj) {
    if (!player || !obj) return false;
    const playerW = player.w ?? player.size ?? CANVAS.TILE_SIZE;
    const playerH = player.h ?? player.size ?? CANVAS.TILE_SIZE;
    const objW = obj.w ?? 0;
    const objH = obj.h ?? 0;
    if (!objW || !objH) return false;

    const playerLeft = player.x - playerW / 2;
    const playerRight = player.x + playerW / 2;
    const playerTop = player.y - playerH / 2;
    const playerBottom = player.y + playerH / 2;

    const objLeft = obj.x - objW / 2;
    const objRight = obj.x + objW / 2;
    const objTop = obj.y - objH / 2;
    const objBottom = obj.y + objH / 2;

    return (
      playerRight > objLeft &&
      playerLeft < objRight &&
      playerBottom > objTop &&
      playerTop < objBottom
    );
  }

  function applyExitTransitions() {
    if (!exits.length || !player || exitCooldownMs > 0) return;

    for (const exit of exits) {
      if (exit.visible === false) continue;
      if (!isOverlappingPlayer(exit)) continue;

      const targetRoom = exit?.properties?.targetRoom;
      if (!targetRoom || !roomData[targetRoom]) continue;

      const targetSpawn = exit?.properties?.targetSpawn ?? null;
      loadRoom(targetRoom, { spawnId: targetSpawn });
      exitCooldownMs = 250;
      break;
    }
  }

  if (initialRoom) {
    loadRoom(initialRoom);
  }

  return {
    update(deltaTime) {
      if (!currentRoom) return;
      exitCooldownMs = Math.max(0, exitCooldownMs - (deltaTime ?? 0));
      updateRoomLogic(deltaTime);
      applyExitTransitions();
    },

    goToRoom(roomKey, options = {}) {
      loadRoom(roomKey, options);
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

    getHazards() {
      return hazards;
    },

    getCollectables() {
      return collectables;
    },

    getSpawnPoints() {
      return spawnPoints;
    },

    getTriggers() {
      return triggers;
    },

    getExits() {
      return exits;
    },

    getTilesets() {
      return tilesets;
    },

    getTileSize() {
      return { tileWidth, tileHeight };
    },

    getBackground() {
      return currentConfig?.background ?? null;
    },

    getPlayerStart() {
      return playerStart;
    },

    getPlatformColor() {
      return currentConfig?.platformColor ?? null;
    },

    getRoomState() {
      return currentConfig
        ? {
            width: currentConfig.width,
            height: currentConfig.height,
            platforms
          }
        : null;
    }
  };
}

//======================================
// END
//======================================