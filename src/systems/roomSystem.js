/*
========================================
VERSION: 2.0
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
import { CANVAS, TIME } from '../config.js';
import { pointToPixels, rectToPixels, toPixels } from '../utils/toPixels.js';
import { Wall } from './hitboxSystem.js';

function getTiledProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function parsePropertiesMap(properties = []) {
  const result = {};
  for (const prop of properties) {
    if (!prop?.name) continue;
    result[prop.name] = prop.value;
  }
  return result;
}

function getObjectBox(obj, defaultW, defaultH) {
  const w = obj?.width ?? defaultW;
  const h = obj?.height ?? defaultH;
  const x = obj?.x ?? 0;
  // Tiled tile-objects use bottom-left Y origin.
  const y = obj?.gid != null ? (obj?.y ?? 0) - h : (obj?.y ?? 0);
  return { x, y, w, h };
}

function normalizeLayerObject(obj, tileWidth, tileHeight, layerOpacity = 1) {
  const { x, y, w, h } = getObjectBox(obj, tileWidth, tileHeight);
  const visible = obj?.visible !== false;
  const opacity = Math.max(0, Math.min(1, (obj?.opacity ?? 1) * layerOpacity));
  return {
    x: x + w / 2,
    y: y + h / 2,
    w,
    h,
    gid: obj?.gid ?? null,
    name: obj?.name ?? '',
    type: obj?.type ?? '',
    rotation: obj?.rotation ?? 0,
    visible,
    opacity,
    properties: parsePropertiesMap(obj?.properties ?? [])
  };
}

function parseCollisionTileLayer(layer, tileWidth, tileHeight) {
  const result = [];
  const data = layer?.data;
  const width = layer?.width;
  const height = layer?.height;
  const FLIP_MASK = 0x1FFFFFFF;

  // Checks if tiled layer is breakable
  const layerBreakable = layer.properties?.find(p => p.name === 'breakable')?.value === true;

  if (!Array.isArray(data) || !width || !height) return result;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const gid = (data[index] >>> 0) & FLIP_MASK;
      if (!gid) continue;

      const wall = new Wall(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
      wall.gid = gid;
      
      if (layerBreakable) {
          wall.isBreakable = true;
      }
      result.push(wall);
    }
  }

  return result;
}

function getTilesetForGid(tilesets, gid) {
  if (!Number.isFinite(gid) || gid <= 0 || !Array.isArray(tilesets)) return null;
  let best = null;
  for (const ts of tilesets) {
    const firstgid = Number(ts?.firstgid ?? 0);
    if (!firstgid || gid < firstgid) continue;
    if (!best || firstgid > best.firstgid) {
      best = { ...ts, firstgid };
    }
  }
  return best;
}

function getCollectableTypeFromGid(tilesets, gid) {
  const tileset = getTilesetForGid(tilesets, Number(gid));
  if (!tileset) return null;
  const localTileId = Number(gid) - Number(tileset.firstgid);
  if (!Number.isFinite(localTileId) || localTileId < 0) return null;
  const tileProps = tileset?.tilePropertiesById?.[localTileId] ?? null;
  const collectableType = String(tileProps?.collectableType ?? '').toLowerCase();
  return collectableType || null;
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
      color: getTiledProperty(mapData, 'backgroundColor', '#021B3A'),
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
    exits: [],
    foreground: [],
    enemies: [],
  };

  for (const layer of mapData?.layers ?? []) {
    const layerName = (layer?.name ?? '').toLowerCase();

    if (layer?.type === 'tilelayer' && (layerName === 'collision' || layerName === 'boundary')) {
      normalized.platforms.push(...parseCollisionTileLayer(layer, tileWidth, tileHeight));
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'terrain') {
      for (const obj of layer.objects ?? []) {
        const { x, y, w, h } = getObjectBox(obj, tileWidth, tileHeight);
        const wall = new Wall(x, y, w, h);
        wall.gid = obj?.gid ?? null;

        // Checks if breakable in tiled
        if (obj.properties && (obj.properties.breakable === true || obj.properties.type === 'breakable')) {
            wall.isBreakable = true;
        }
        normalized.platforms.push(wall);
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'breakable') {
      for (const obj of layer.objects ?? []) {
        const { x, y, w, h } = getObjectBox(obj, tileWidth, tileHeight);
        const wall = new Wall(x, y, w, h);
        wall.gid = obj?.gid ?? null;
        wall.isBreakable = true;
        normalized.platforms.push(wall);
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'background') {
      const bgObj = (layer.objects ?? [])[0];
      if (bgObj) {
        const bg = normalizeLayerObject(bgObj, tileWidth, tileHeight, layer.opacity ?? 1);
        normalized.background.gid = bg.gid;
        normalized.background.w = bg.w;
        normalized.background.h = bg.h;
        if (!normalized.background.image) {
          const fromProps = bg.properties.backgroundImage ?? bg.properties.image ?? null;
          normalized.background.image = fromProps || (bg.name || null);
        }
      }
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'hazards') {
      normalized.hazards = (layer.objects ?? []).map((obj) =>
        normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1)
      );
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'collectables') {
      normalized.collectables = (layer.objects ?? []).map((obj) => {
        const collectable = normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1);
        collectable.collectableType = getCollectableTypeFromGid(normalized.tilesets, collectable.gid);
        return collectable;
      });
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'enemies') {
      normalized.enemies = (layer.objects ?? []).map((obj) => {
        const e = normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1);
        e.patrolDistance = Number(e.properties?.patrolDistance ?? 64);
        e.speed = Number(e.properties?.speed ?? 0.8);
        return e;
      });
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'triggers') {
      normalized.triggers = (layer.objects ?? []).map((obj) =>
        normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1)
      );
      normalized.exits = normalized.triggers.filter((obj) =>
        obj.properties.targetRoom != null ||
        obj.properties.targetSpawn != null ||
        obj.properties.isWin === true
      );
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'entities') {
      normalized.entities = (layer.objects ?? []).map((obj) =>
        normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1)
      );
      normalized.spawnPoints = normalized.entities.filter((obj) => obj.properties.spawnId != null)
        .map((obj) => ({
          x: obj.x,
          y: obj.y,
          spawnId: String(obj.properties.spawnId),
          gid: obj.gid
        }));
      continue;
    }

    if (layer?.type === 'objectgroup' && layerName === 'foreground') {
      normalized.foreground = (layer.objects ?? []).map((obj) =>
        normalizeLayerObject(obj, tileWidth, tileHeight, layer.opacity ?? 1)
      );
      continue;
    }

    if (layer?.type === 'imagelayer' && !normalized.background.image && layer?.image) {
      normalized.background.image = layer.image;
    }
  }

  if (!normalized.playerStart) {
    const defaultSpawn = normalized.spawnPoints.find((spawn) => spawn.spawnId.toLowerCase() === 'default')
      ?? normalized.spawnPoints[0];
    if (defaultSpawn) {
      normalized.playerStart = { x: defaultSpawn.x, y: defaultSpawn.y };
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
    enemies: [],
    triggers: [],
    foreground: []
  };

  if (roomConfig.platformsTiles) {
    normalized.platforms = roomConfig.platformsTiles.map((platform) => {
      const px = rectToPixels(platform);
      return new Wall(px.x, px.y, px.w, px.h);
    });
  } else if (roomConfig.platforms) {
    normalized.platforms = roomConfig.platforms.map((platform) => {
      if (platform instanceof Wall) return platform;
      return new Wall(
        platform.x ?? 0,
        platform.y ?? 0,
        platform.w ?? platform.width ?? CANVAS.TILE_SIZE,
        platform.h ?? platform.height ?? CANVAS.TILE_SIZE
      );
    });
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
  normalized.triggers = [...(roomConfig.triggers ?? [])];
  normalized.foreground = [...(roomConfig.foreground ?? [])];

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
  onRoomLoaded = null,
  onWin = null
} = {}) {
  let currentRoom = null;
  let currentConfig = null;
  let playerStart = null;
  let entities = [];
  let platforms = [];
  let hazards = [];
  let collectables = [];
  let enemies = [];
  let triggers = [];
  let exits = [];
  let spawnPoints = [];
  let foreground = [];
  let tilesets = [];
  let tileWidth = CANVAS.TILE_SIZE;
  let tileHeight = CANVAS.TILE_SIZE;
  let exitCoolDownSeconds = 0;

  function loadRoom(roomKey, { spawnId = null } = {}) {
    const roomSource = roomData[roomKey];
    if (!roomSource) {
      console.warn(`Room "${roomKey}" not found in roomData.`);
      return;
    }

    const normalized = normalizeRoom(roomKey, roomSource);

    currentRoom = roomKey;
    currentConfig = normalized;
    platforms = [...(normalized.platforms ?? [])];
    hazards = [...(normalized.hazards ?? [])];
    collectables = [...(normalized.collectables ?? [])];
    enemies = [...(normalized.enemies ?? [])];
    triggers = [...(normalized.triggers ?? [])];
    exits = [...(normalized.exits ?? [])];
    spawnPoints = [...(normalized.spawnPoints ?? [])];
    foreground = [...(normalized.foreground ?? [])];
    entities = [...(normalized.entities ?? [])];
    tilesets = [...(normalized.tilesets ?? [])];
    tileWidth = normalized.tileWidth ?? CANVAS.TILE_SIZE;
    tileHeight = normalized.tileHeight ?? CANVAS.TILE_SIZE;

    const explicitSpawn = spawnId
      ? spawnPoints.find((spawn) => String(spawn.spawnId).toLowerCase() === String(spawnId).toLowerCase())
      : null;
    playerStart = explicitSpawn ? { x: explicitSpawn.x, y: explicitSpawn.y } : (normalized.playerStart ?? null);

    if (player && playerStart) {
      if (typeof player.setCurrentPosition === 'function') {
        player.setCurrentPosition(playerStart.x, playerStart.y);
      } else if (player.position) {
        player.position.x = playerStart.x;
        player.position.y = playerStart.y;
      }
    }

    onRoomLoaded?.({
      room: currentRoom,
      width: normalized.width,
      height: normalized.height
    });
  }

  function updateRoomLogic() {
    for (const entity of entities) {
      entity.update?.();
    }
  }

  function isOverlappingPlayer(obj) {
    if (!player || !obj || !player.position) return false;

    const playerW = player.w ?? CANVAS.TILE_SIZE;
    const playerH = player.h ?? CANVAS.TILE_SIZE;
    const objW = obj.w ?? 0;
    const objH = obj.h ?? 0;
    if (!objW || !objH) return false;

    const playerLeft = player.position.x - playerW / 2;
    const playerRight = player.position.x + playerW / 2;
    const playerTop = player.position.y - playerH / 2;
    const playerBottom = player.position.y + playerH / 2;

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
    if (!exits.length || !player || exitCoolDownSeconds > 0) return;

    for (const exit of exits) {
      if (exit.visible === false) continue;
      if (!isOverlappingPlayer(exit)) continue;

      if (exit?.properties?.isWin === true) {
        onWin?.({ exit, room: currentRoom });
        exitCoolDownSeconds = 0.25;
        break;
      }

      const targetRoom = exit?.properties?.targetRoom;
      if (!targetRoom || !roomData[targetRoom]) continue;

      const targetSpawn = exit?.properties?.targetSpawn ?? null;
      loadRoom(targetRoom, { spawnId: targetSpawn });
      exitCoolDownSeconds = 0.25;
      break;
    }
  }

  if (initialRoom) {
    loadRoom(initialRoom);
  }

  return {
    update() {
      if (!currentRoom) return;
      exitCoolDownSeconds = Math.max(0, exitCoolDownSeconds - TIME.fixedDeltaTime);
      updateRoomLogic();
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

    getEnemies() {
      return enemies;
    },

    getTriggers() {
      return triggers;
    },

    getExits() {
      return exits;
    },

    getSpawnPoints() {
      return spawnPoints;
    },

    getForeground() {
      return foreground;
    },

    getTilesets() {
      return tilesets;
    },

    getTileSize() {
      return { tileWidth, tileHeight };
    },

    getRoomState() {
      return {
        platforms,
        hazards,
        collectables,
        enemies,
        triggers,
        exits,
        spawnPoints,
        entities,
        tileWidth,
        tileHeight,
        width: currentConfig?.width,
        height: currentConfig?.height,
        background: currentConfig?.background,
        platformColor: currentConfig?.platformColor,
        currentRoom
      };
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
