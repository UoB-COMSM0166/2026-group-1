/*
========================================
MAIN (SKETCH CANVAS)
========================================
VERSION: 4
SYSTEM: Main / p5.js Canvas
AUTHOR: Georgia Sweeny (intial setup)

DESCRIPTION:
- uses p5.js library to power game...
- runs JS system modules - wired up by team members
- contains fixed deltatime logic for update
  cycle (Nick)
========================================
*/

//======================================
// MAIN
//======================================

import { Engine } from "./gameEngine/engine.js";
import { createInputSystem } from "./systems/inputSystem.js";
import { createPlayerSystem } from "./systems/playerSystem.js";
import { createPhysicsSystem } from "./systems/physicsSystem.js";
import { createTorchSystem } from "./systems/torchSystem.js";
import { createPowerSystem } from "./systems/powerSystem.js";
import { createRenderSystem } from "./systems/renderSystem.js";
import { createLightingSystem } from "./systems/lightingSystem.js";
import { createSonarSystem } from "./systems/sonarSystem.js";
import { createRoomSystem } from "./systems/roomSystem.js";
import { createPauseMenuSystem } from "./systems/pauseMenuSystem.js";
import { createCameraSystem } from "./systems/cameraSystem.js";
import {
  CANVAS,
  PLAYER,
  TIME,
  GAME,
  CONTROLS,
  GAMEPLAY_OVERLAY,
  MINIMAP,
  HUD_DIALS,
} from "./config.js";

const GAME_ROOMS = ["demoStart", "tunnel", "theDrop", "endlessAbyss", "crabCaverns", "spikeMaze", "jellyfishAtrium", "theSurface"];
const GAME_START_ROOM = "demoStart";
import { Player } from "./entities/player.js";
import { createResourceManagementSystem } from "./systems/resourceManagementSystem.js";
import { createMainPageSystem } from "./systems/mainPageSystem.js";
import { createMenuSystem } from "./systems/menuSystem.js";
import { createWorkshopSystem } from "./systems/workshopSystem.js";
import { createMissileSystem } from "./systems/missileSystem.js";
import { createParticleSystem } from "./systems/particleSystem.js";
import { createEnemySystem } from './systems/enemySystem.js';
import { createWinScreenSystem } from "./systems/winScreenSystem.js";
import { createGameOverSystem } from "./systems/gameOverSystem.js";
import { createMiniMapSystem } from "./systems/miniMapSystem.js";
import { createGlowSystem } from "./systems/glowSystem.js";
import { createSoundSystem } from "./systems/soundSystem.js";
import { createStoryPageSystem } from "./systems/storyPageSystem.js";
import { createControlsPageSystem } from "./systems/controlsPageSystem.js";

let accumulator = 0;
let alpha;

let engine;
let darknessLayer;
let player;
let mainPageSystem;
let mainPageBg;
let menuBg;
let storyPageSystem;
let controlsPageSystem;
let inputSystem;
let playerSystem;
let physicsSystem;
let powerSystem;
let torchSystem;
let sonarSystem;
let renderSystem;
let lightingSystem;
let roomSystem;
let resourceManagementSystem;
let enemySystem;
let pauseMenuSystem;
let workshopSystem;
let missileSystem;
let particleSystem;
let cameraSystem;
let miniMapSystem;
let glowSystem;
let lastEnsuredRoom = null;
//let gameState = "MENU";
let gameState = "MAIN_PAGE";
let showControlsOverlay = false;   // toggled by C key
let storyDialogActive = false;     // story dialog shown on game start
let hasSeenIntro = false;          // true after player passes STORY_PAGE → CONTROLS flow
let settingsReturnState = "MENU"; // state to restore when settings overlay closes
let controlsReturnState = null;   // non-null when controls page opened from settings/overlay
let sessionDifficulty = null;  // locked-in difficulty for the current session ("EASY"|"HARD")
let menuSystem;
let winScreenSystem;
let gameOverSystem;
let audioUnlocked = false;
let soundSystem;  
const WIN_STATE = "WIN";
const GAME_OVER_STATE = "GAME_OVER";

let assets = {};
// NOTE: Some rooms are placeholders (see docs/data/rooms/*.json) so the build runs end-to-end.
// Prototype rooms are preloaded for testing but not part of any game version.
const ROOM_IDS = ["roomA", "roomB", ...GAME_ROOMS];
const roomData = {};
const FIT_CANVAS_TO_ROOM = false;
let useDevResolution = false;
const BACKGROUND_FILE_MAP = {
  "bg-atmosphere": "bg-atmosphere.jpg",
  "bg-atmosphere.jpg": "bg-atmosphere.jpg",
};
const GAMEPLAY_OVERLAY_ASSET_KEY = "ui:gameplayOverlay";
const GAMEPLAY_OVERLAY_PATH = "assets/ui/gameplay-overlay.png";
const SCRAP_ICON_ASSET_KEY = "ui:scrapIcon";
const SCRAP_ICON_PATH = "assets/ui/scrap-icon.png";
const POWER_CELL_ASSET_KEY = "sprite:powerCell";
const POWER_CELL_PATH = "assets/sprites/power-cell.png";
const SCRAP_SPRITE_ASSET_KEY = "sprite:scrap";
const SCRAP_SPRITE_PATH = "assets/sprites/scrap.png";

function getTilesetForGid(room, gid) {
  if (!Number.isFinite(gid)) return null;
  let best = null;
  for (const ts of room?.tilesets ?? []) {
    const firstgid = Number(ts?.firstgid ?? 0);
    if (!firstgid || gid < firstgid) continue;
    if (!best || firstgid > best.firstgid) best = { ...ts, firstgid };
  }
  return best;
}

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

function getPathDir(path) {
  const parts = String(path ?? "")
    .split("/")
    .filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function normalizeTilesetSource(source, mapDir) {
  if (!source) return source;
  const resolved = normalizeRelativePath(mapDir, source);
  if (resolved.startsWith("data/tilesets/")) return source;
  const idx = source.indexOf("tilesets/");
  if (idx !== -1) {
    const fixed = `../${source.slice(idx)}`;
    console.warn(`[preload] Fixed tileset source: "${source}" → "${fixed}"`);
    return fixed;
  }
  return source;
}

function tilesetSourceToImagePath(source, mapDir = "data/rooms") {
  if (!source) return null;
  if (String(source).toLowerCase().endsWith("backgrounds.tsx")) return null;
  // Normalize the tsx path relative to the map directory first, so that a
  // relative source like "../tilesets/X.tsx" resolves to "data/tilesets/X"
  // before we extract its directory for image resolution.
  const resolvedSource = normalizeRelativePath(mapDir, source);
  const tsxDir = getPathDir(resolvedSource);
  const pngFilename = resolvedSource.split("/").pop().replace(/\.tsx$/i, ".png");
  return normalizeRelativePath(tsxDir, pngFilename);
}

function parseTsxTileProperties(xmlText) {
  if (!xmlText || typeof DOMParser === "undefined") return {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const byId = {};
  const tileNodes = Array.from(doc.querySelectorAll("tile"));

  for (const tileNode of tileNodes) {
    const localId = Number(tileNode.getAttribute("id"));
    if (!Number.isFinite(localId)) continue;

    const props = {};
    const propertyNodes = Array.from(
      tileNode.querySelectorAll("properties > property"),
    );
    for (const propNode of propertyNodes) {
      const name = propNode.getAttribute("name");
      if (!name) continue;
      const valueAttr = propNode.getAttribute("value");
      props[name] = valueAttr ?? propNode.textContent ?? "";
    }
    if (Object.keys(props).length) {
      byId[localId] = props;
    }
  }

  return byId;
}

function parseTsxMetadata(xmlText, sourcePath = "") {
  const empty = {
    tilePropertiesById: {},
    tileImagesById: {},
    resolvedImagePath: null,
    tilewidth: null,
    tileheight: null,
    columns: null,
    tilecount: null,
  };
  if (!xmlText || typeof DOMParser === "undefined") return empty;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const tilesetNode = doc.querySelector("tileset");
  if (!tilesetNode) return empty;

  const baseDir = getPathDir(sourcePath);
  const tilePropertiesById = {};
  const tileImagesById = {};

  const rootChildren = Array.from(tilesetNode.children ?? []);
  const rootImageNode = rootChildren.find(
    (node) => String(node?.tagName).toLowerCase() === "image",
  );
  const rootImageSource = rootImageNode?.getAttribute("source") ?? null;
  const resolvedImagePath = rootImageSource
    ? normalizeRelativePath(baseDir, rootImageSource)
    : null;

  const tileNodes = Array.from(tilesetNode.querySelectorAll("tile"));
  for (const tileNode of tileNodes) {
    const localId = Number(tileNode.getAttribute("id"));
    if (!Number.isFinite(localId)) continue;

    const props = {};
    const propertyNodes = Array.from(
      tileNode.querySelectorAll("properties > property"),
    );
    for (const propNode of propertyNodes) {
      const name = propNode.getAttribute("name");
      if (!name) continue;
      const valueAttr = propNode.getAttribute("value");
      props[name] = valueAttr ?? propNode.textContent ?? "";
    }
    if (Object.keys(props).length) {
      tilePropertiesById[localId] = props;
    }

    const tileChildren = Array.from(tileNode.children ?? []);
    const tileImageNode = tileChildren.find(
      (node) => String(node?.tagName).toLowerCase() === "image",
    );
    const tileImageSource = tileImageNode?.getAttribute("source") ?? null;
    if (!tileImageSource) continue;

    tileImagesById[localId] = {
      source: tileImageSource,
      resolvedImagePath: normalizeRelativePath(baseDir, tileImageSource),
      width: Number(tileImageNode.getAttribute("width") ?? 0) || null,
      height: Number(tileImageNode.getAttribute("height") ?? 0) || null,
    };
  }

  return {
    tilePropertiesById,
    tileImagesById,
    resolvedImagePath,
    tilewidth: Number(tilesetNode.getAttribute("tilewidth") ?? 0) || null,
    tileheight: Number(tilesetNode.getAttribute("tileheight") ?? 0) || null,
    columns: Number(tilesetNode.getAttribute("columns") ?? 0) || null,
    tilecount: Number(tilesetNode.getAttribute("tilecount") ?? 0) || null,
  };
}

function getMapProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function normalizeBackgroundImageName(name) {
  if (!name) return null;
  const raw = String(name).trim();
  if (!raw) return null;
  if (raw.includes("/")) return raw;
  if (BACKGROUND_FILE_MAP[raw]) return BACKGROUND_FILE_MAP[raw];
  if (/\.[a-z0-9]+$/i.test(raw)) return raw;
  return raw;
}

function resolveBackgroundImageFromGid(room, gid) {
  if (!Number.isFinite(gid) || gid <= 0) return null;
  const tilesets = room?.tilesets ?? [];
  let best = null;
  for (const ts of tilesets) {
    const firstgid = Number(ts?.firstgid ?? 0);
    if (!firstgid || gid < firstgid) continue;
    if (!best || firstgid > best.firstgid) best = { ...ts, firstgid };
  }
  if (!best) return null;

  if (
    String(best.source ?? "")
      .toLowerCase()
      .endsWith("backgrounds.tsx")
  ) {
    const localId = gid - best.firstgid;
    const byId = {
      0: "bg-atmosphere.jpg",
      1: "bg-atmosphere.jpg",
    };
    return byId[localId] ?? null;
  }
  return null;
}

function getBackgroundImageName(room) {
  const roomBg = normalizeBackgroundImageName(room?.background?.image);
  if (roomBg) return roomBg;

  const propImage = getMapProperty(room, "backgroundImage", null);
  if (propImage) return propImage;

  const bgObjectLayer = (room?.layers ?? []).find(
    (l) =>
      l?.type === "objectgroup" &&
      String(l?.name ?? "")
        .toLowerCase()
        .includes("background"),
  );
  const bgObject = (bgObjectLayer?.objects ?? [])[0];
  const bgObjectProps = bgObject?.properties ?? [];
  const bgPropImage = bgObjectProps.find(
    (p) => p?.name === "backgroundImage" || p?.name === "image",
  )?.value;
  const propBg = normalizeBackgroundImageName(bgPropImage);
  if (propBg) return propBg;
  const bgGidImage = resolveBackgroundImageFromGid(room, bgObject?.gid ?? null);
  if (bgGidImage) return bgGidImage;
  const namedBg = normalizeBackgroundImageName(bgObject?.name);
  if (namedBg) return namedBg;

  const imageLayer = (room?.layers ?? []).find(
    (l) => l?.type === "imagelayer" && l?.image,
  );
  if (imageLayer?.image) return imageLayer.image;

  return null;
}

function ensureRoomAssetsLoaded(roomId) {
  const room = roomData[roomId];
  if (!room) return;

  const backgroundImageName = getBackgroundImageName(room);
  if (backgroundImageName && !assets[backgroundImageName]) {
    const backgroundPath = backgroundImageName.includes("/")
      ? backgroundImageName
      : `assets/backgrounds/${backgroundImageName}`;
    assets[backgroundImageName] = loadImage(backgroundPath);
  }

  const mapDir = roomMapDir(roomId);
  for (const tileset of room?.tilesets ?? []) {
    const imagePath =
      tileset.resolvedImagePath ??
      tilesetSourceToImagePath(tileset?.source, mapDir);
    console.warn(`[ensureRoomAssetsLoaded] tileset.source="${tileset.source}" resolvedImagePath="${tileset.resolvedImagePath}" imagePath="${imagePath}" tsxDirForImage="${tileset.resolvedImagePath ? getPathDir(tileset.resolvedImagePath) : 'N/A(resolvedImagePath was undefined)'}"`);
    if (imagePath) {
      tileset.resolvedImagePath = imagePath;
      const key = `tileset:${imagePath}`;
      if (!assets[key]) {
        console.warn(`[preload] Loading ATLAS image: imagePath="${imagePath}" key="${key}" assetsDir=docs/data/`);
        assets[key] = loadImage(imagePath);
      }
    }

    for (const tileImage of Object.values(tileset?.tileImagesById ?? {})) {
      const tileImagePath = tileImage?.resolvedImagePath;
      if (!tileImagePath) continue;
      const tileKey = `tileset:${tileImagePath}`;
      if (!assets[tileKey]) {
        // Only log once per tileset to avoid spam
        if (!ensureRoomAssetsLoaded._loggedTileImages) {
          ensureRoomAssetsLoaded._loggedTileImages = true;
          const allTileImages = Object.values(tileset?.tileImagesById ?? {}).map(ti => ti?.resolvedImagePath);
          console.warn(`[preload] tileImagesById sample for ${tileset?.name}: ${JSON.stringify(allTileImages.slice(0, 5))} (${Object.keys(tileset?.tileImagesById ?? {}).length} total)`);
        }
        console.warn(`[preload] Loading individual tile image: tileImagePath="${tileImagePath}" tileKey="${tileKey}"`);
        assets[tileKey] = loadImage(tileImagePath);
      }
    }
  }
}

function getRoomPixelSize(roomKey) {
  const room = roomData?.[roomKey];
  if (!room) return { width: CANVAS.WIDTH, height: CANVAS.HEIGHT };

  const tileWidth = room.tilewidth ?? CANVAS.TILE_SIZE;
  const tileHeight = room.tileheight ?? CANVAS.TILE_SIZE;
  return {
    width: (room.width ?? 0) * tileWidth,
    height: (room.height ?? 0) * tileHeight,
  };
}

function syncCanvasToCurrentRoom() {
  if (!FIT_CANVAS_TO_ROOM || !roomSystem) return;

  const roomKey = roomSystem.getCurrentRoom?.();
  if (!roomKey) return;

  const roomSize = getRoomPixelSize(roomKey);
  if (roomSize.width <= 0 || roomSize.height <= 0) return;
  if (width === roomSize.width && height === roomSize.height) return;

  resizeCanvas(roomSize.width, roomSize.height);
  darknessLayer.resizeCanvas(roomSize.width, roomSize.height);
  applyDisplayScale();
}

function roomMapDir(_roomId) {
  return `data/rooms`;
}

function preload() {

  soundSystem = createSoundSystem();
  soundSystem.preload();

  for (const roomId of ROOM_IDS) {
    roomData[roomId] = loadJSON(`data/rooms/${roomId}.json`);
  }

  const tsxMetaBySourcePath = {};
  for (const [roomId, room] of Object.entries(roomData)) {
    const mapDir = roomMapDir(roomId);
    for (const tileset of room?.tilesets ?? []) {
      tileset.source = normalizeTilesetSource(tileset.source, mapDir);
      const sourcePath = normalizeRelativePath(mapDir, tileset?.source ?? "");
      if (!sourcePath.toLowerCase().endsWith(".tsx")) continue;
      if (tsxMetaBySourcePath[sourcePath]) continue;

      const tsxLines = loadStrings(sourcePath) ?? [];
      if (!tsxLines.length) {
        console.warn(`[preload] TSX file empty or failed to load: "${sourcePath}"`);
      }
      tsxMetaBySourcePath[sourcePath] = parseTsxMetadata(
        tsxLines.join("\n"),
        sourcePath,
      );
      console.warn(`[preload] TSX parsed: "${sourcePath}" → resolvedImagePath="${tsxMetaBySourcePath[sourcePath].resolvedImagePath}" tileImagesById count=${Object.keys(tsxMetaBySourcePath[sourcePath].tileImagesById).length}`);
    }
  }

  for (const [roomId, room] of Object.entries(roomData)) {
    const mapDir = roomMapDir(roomId);
    for (const tileset of room?.tilesets ?? []) {
      const sourcePath = normalizeRelativePath(mapDir, tileset?.source ?? "");
      const tsxMeta = tsxMetaBySourcePath[sourcePath] ?? {};
      tileset.tilePropertiesById = tsxMeta.tilePropertiesById ?? {};
      tileset.tileImagesById = tsxMeta.tileImagesById ?? {};
      // Attach the resolved image path so the render system can look it up
      // without needing to re-derive the map directory at draw time.
      tileset.resolvedImagePath =
        tsxMeta.resolvedImagePath ??
        tilesetSourceToImagePath(tileset?.source, mapDir);
      const tileImgKeys = Object.keys(tsxMeta.tileImagesById ?? {});
      const tileImgSample = tileImgKeys.slice(0, 3).map(k => `${k}:"${tsxMeta.tileImagesById[k]?.resolvedImagePath}"`);
      console.warn(`[preload] Tileset "${tileset.source}" resolvedImagePath="${tileset.resolvedImagePath}" tileImagesById=${tileImgSample.join(', ')}${tileImgKeys.length > 3 ? ' ...' : ''} (${tileImgKeys.length} total)`);
      if (tsxMeta.tilewidth) tileset.tilewidth = tsxMeta.tilewidth;
      if (tsxMeta.tileheight) tileset.tileheight = tsxMeta.tileheight;
      if (tsxMeta.columns != null) tileset.columns = tsxMeta.columns;
      if (tsxMeta.tilecount != null) tileset.tilecount = tsxMeta.tilecount;
    }
  }

  const imageNames = new Set();
  for (const room of Object.values(roomData)) {
    const imageName = getBackgroundImageName(room);

    if (imageName) imageNames.add(imageName);
  }

  for (const imageName of imageNames) {
    const imagePath = imageName.includes("/")
      ? imageName
      : `assets/backgrounds/${imageName}`;
    assets[imageName] = loadImage(imagePath);
  }

  for (const filename of Object.values(BACKGROUND_FILE_MAP)) {
    if (!assets[filename]) {
      assets[filename] = loadImage(`assets/backgrounds/${filename}`);
    }
  }

  const tilesetImagePaths = new Set();
  for (const [roomId, room] of Object.entries(roomData)) {
    const mapDir = roomMapDir(roomId);
    for (const tileset of room?.tilesets ?? []) {
      const imagePath =
        tileset.resolvedImagePath ??
        tilesetSourceToImagePath(tileset?.source, mapDir);
      if (imagePath) tilesetImagePaths.add(imagePath);
      for (const tileImage of Object.values(tileset?.tileImagesById ?? {})) {
        if (tileImage?.resolvedImagePath) {
          tilesetImagePaths.add(tileImage.resolvedImagePath);
        }
      }
    }
  }

  for (const imagePath of tilesetImagePaths) {
    assets[`tileset:${imagePath}`] = loadImage(imagePath);
  }

  assets[GAMEPLAY_OVERLAY_ASSET_KEY] = loadImage(
    GAMEPLAY_OVERLAY_PATH,
    () => {},
    () => {
      assets[GAMEPLAY_OVERLAY_ASSET_KEY] = null;
      console.warn(
        `[sketch] Gameplay overlay image not found at ${GAMEPLAY_OVERLAY_PATH}`,
      );
    },
  );

  assets[SCRAP_ICON_ASSET_KEY] = loadImage(
    SCRAP_ICON_PATH,
    () => {},
    () => {
      assets[SCRAP_ICON_ASSET_KEY] = null;
      console.warn(`[sketch] Scrap icon not found at ${SCRAP_ICON_PATH}`);
    },
  );

  assets[POWER_CELL_ASSET_KEY] = loadImage(
    POWER_CELL_PATH,
    () => {},
    () => {
      assets[POWER_CELL_ASSET_KEY] = null;
      console.warn(`[sketch] Power cell sprite not found at ${POWER_CELL_PATH}`);
    },
  );

  assets[SCRAP_SPRITE_ASSET_KEY] = loadImage(
    SCRAP_SPRITE_PATH,
    () => {},
    () => {
      assets[SCRAP_SPRITE_ASSET_KEY] = null;
      console.warn(`[sketch] Scrap sprite not found at ${SCRAP_SPRITE_PATH}`);
    },
  );


  mainPageBg = loadImage("assets/backgrounds/titleBackground.png");
  menuBg = loadImage("assets/backgrounds/bg_black.png");
}

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  textSize(20);
  textAlign(LEFT);
  applyDisplayScale();

  mainPageSystem = createMainPageSystem();
  storyPageSystem = createStoryPageSystem();
  controlsPageSystem = createControlsPageSystem();
  menuSystem = createMenuSystem();
  winScreenSystem = createWinScreenSystem();
  gameOverSystem = createGameOverSystem();

  player = new Player(PLAYER);

  const initialRoom = GAME_START_ROOM;
  roomSystem = createRoomSystem({
    initialRoom,
    roomData,
    player,
    onRoomLoaded: ({ room, width: roomWidth, height: roomHeight }) => {
      if (room) {
        ensureRoomAssetsLoaded(room);
        lastEnsuredRoom = room;
      }

      if (!FIT_CANVAS_TO_ROOM) return;
      if (!roomWidth || !roomHeight) return;
      resizeCanvas(roomWidth, roomHeight);
      if (darknessLayer) {
        darknessLayer.resizeCanvas(roomWidth, roomHeight);
      }
    },
    onWin: () => {
      soundSystem?.stop('gamebg1');
      soundSystem?.play('win', 0.4);
      gameState = WIN_STATE;
    },
    getAllowedRooms: () => GAME_ROOMS,
    getGameVersion: () => "full",
    soundSystem,
  });
  roomSystem.goToRoom(initialRoom, { spawnId: "default" });
  syncCanvasToCurrentRoom();
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y);
  }

  darknessLayer = createGraphics(width, height);

  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player, soundSystem);
  physicsSystem = createPhysicsSystem(player, () => roomSystem.getRoomState());
  cameraSystem = createCameraSystem(player, CANVAS.WIDTH, CANVAS.HEIGHT);
  // Snap camera to player's initial position
  cameraSystem.snapTo(player.position.x, player.position.y);
  powerSystem = createPowerSystem(player, {
    getDifficulty: () => pauseMenuSystem?.getDifficulty() ?? "easy",
  });
  torchSystem = createTorchSystem(player.torch, player, { soundSystem });

  sonarSystem = createSonarSystem(
    player,
    () => roomSystem.getPlatforms(),
    () => roomSystem.getHazards(),
    () =>
      roomSystem
        .getCollectables()
        .filter((c) => !resourceManagementSystem?.isCollected(c)),
    soundSystem,
    () => enemySystem?.getEnemies() ?? [],
  );

  particleSystem = createParticleSystem(player, () => roomSystem.getCollisionData?.());

  missileSystem = createMissileSystem(
    player,
    () => enemySystem?.getEnemies() ?? [],
    () => roomSystem.getPlatforms(),
    soundSystem,
    particleSystem,
  );

  glowSystem = createGlowSystem(
    player,
    () => roomSystem.getGlowObjects(),
    soundSystem,
  );

  lightingSystem = createLightingSystem(
    player,
    () => sonarSystem?.getSonarLights?.() ?? [],
    () => glowSystem.getGlowLights(),
    () => roomSystem?.getCurrentRoom?.() ?? null,
    () => enemySystem?.getJellyfishLights?.() ?? [],
    () =>
      roomSystem
        .getCollectables()
        .filter((c) => !resourceManagementSystem?.isCollected(c)),
    () => enemySystem?.getPiranhaLights?.() ?? [],
  );

  resourceManagementSystem = createResourceManagementSystem(
    player,
    roomSystem,
    () => roomSystem.getCollectables(),
    () => roomSystem.getHazards(),
    () => pauseMenuSystem.getDifficulty(),
    () => enemySystem?.getEnemies() ?? [],
    soundSystem,
  );

  enemySystem = createEnemySystem(
    player,
    () => roomSystem.getEnemies(),
    () => sonarSystem?.getActivePulses?.() ?? [],
    soundSystem,
    particleSystem,
  );

  miniMapSystem = createMiniMapSystem({
    player,
    zoom: MINIMAP.ZOOM,
    centerX: MINIMAP.CENTER_X,
    centerY: MINIMAP.CENTER_Y,
    dialRadius: MINIMAP.DIAL_RADIUS,
    dialInset: MINIMAP.DIAL_INSET,
    playerMarkerTileScale: MINIMAP.PLAYER_MARKER_TILE_SCALE,
    borderColor: 'rgba(126, 220, 224, 0.78)',
    borderWidth: 2,
    backgroundColor: 'rgba(12, 23, 31, 0.80)',
    getPlayer: () => player,
    getRoomState: () => roomSystem.getRoomState(),
    getPlatforms: () => roomSystem.getPlatforms(),
    getSonarReveals: () => sonarSystem?.getRevealedWalls?.() ?? [],
  });
  
  renderSystem = createRenderSystem({
    player,
    getPlatforms: () => roomSystem.getPlatforms(),
    getHazards: () => roomSystem.getHazards(),
    getCollectables: () =>
      roomSystem
        .getCollectables()
        .filter((c) => !resourceManagementSystem.isCollected(c)),
    getEnemies: () => enemySystem.getCrabs(),
    getCrabs: () => enemySystem.getCrabs(),
    getJellyfish: () => enemySystem.getJellyfish(),
    getPiranhas: () => enemySystem.getPiranhas(),
    getTriggers: () => roomSystem.getTriggers(),
    getGlowObjects: () => roomSystem.getGlowObjects(),
    getEntities: () => roomSystem.getEntities(),
    getSpawnPoints: () => roomSystem.getSpawnPoints(),
    getTilesets: () => roomSystem.getTilesets(),
    getTileSize: () => roomSystem.getTileSize(),
    getBackground: () => roomSystem.getBackground(),
    getPlatformColor: () => roomSystem.getPlatformColor(),
    getSonarCooldown: () => sonarSystem?.getCooldownPercent?.(),
    getSonarReveals: () => sonarSystem?.getRevealedWalls?.(),
    getSonarHazardReveals: () => sonarSystem?.getRevealedHazards?.(),
    getSonarCollectableReveals: () => sonarSystem?.getRevealedCollectables?.(),
    getSonarEnemyReveals: () => sonarSystem?.getRevealedEnemies?.(),
    assets,
    darknessLayer,
    getLightSources: () => lightingSystem.getLightSources(),
    getSkyBand: () => roomSystem?.getCurrentRoom?.() === 'theSurface'
      ? {
          y: 0, height: 320, width: 1440, color: '#87CEEB',
          waterGradient: { topColor: '#1a5f8a', bottomColor: '#021B3A', worldTop: 320, worldBot: 950 },
        }
      : null,
    getActivePulses: () => sonarSystem?.getActivePulses?.() ?? [],
    getRevealedWalls: () => sonarSystem?.getRevealedWalls?.() ?? [],
    getCameraOffset: () => cameraSystem.getOffset(),
    getOldCamPosition: () => cameraSystem.getOldCamPosition(),
    getCameraScale: () => cameraSystem.getScale(),
    getMissiles: () => missileSystem.getMissiles(),
    getMissileTarget: () => missileSystem.getCurrentTarget(),
    getMissileFireFeedback: () => missileSystem.getFireFeedbackTimer(),
    getParticles: () => particleSystem.getParticles(),
    getBurstParticles: () => particleSystem.getBurstParticles(),
    drawMiniMap: () => miniMapSystem.draw(),
    getHudDialSettings: () => ({
      powerX: HUD_DIALS.POWER_X,
      powerY: HUD_DIALS.POWER_Y,
      sonarX: HUD_DIALS.SONAR_X,
      sonarY: HUD_DIALS.SONAR_Y,
      baseSize: HUD_DIALS.BASE_SIZE,
      powerScale: HUD_DIALS.POWER_SCALE,
      sonarScale: HUD_DIALS.SONAR_SCALE,
    }),
    getGameplayOverlay: () => assets[GAMEPLAY_OVERLAY_ASSET_KEY],
    getScrapIcon: () => assets[SCRAP_ICON_ASSET_KEY],
    getPowerCellSprite: () => assets[POWER_CELL_ASSET_KEY],
    getScrapSprite: () => assets[SCRAP_SPRITE_ASSET_KEY],
    getGameplayOverlaySettings: () => ({
      enabled: GAMEPLAY_OVERLAY.ENABLED,
      centerOnScreen: GAMEPLAY_OVERLAY.CENTER_ON_SCREEN,
      offsetX: GAMEPLAY_OVERLAY.OFFSET_X,
      offsetY: GAMEPLAY_OVERLAY.OFFSET_Y,
      scaleX: GAMEPLAY_OVERLAY.SCALE_X,
      scaleY: GAMEPLAY_OVERLAY.SCALE_Y,
      opacity: GAMEPLAY_OVERLAY.OPACITY,
    }),
    getVisualLayers: () => roomSystem.getVisualLayers(),
    getTorchOn: () => player?.torch?.isOn ?? false,
  });

  pauseMenuSystem = createPauseMenuSystem({
    onResolutionChange: (isDev) => {
      useDevResolution = isDev;
      applyDisplayScale();
    },
    onControlModeChange: (mode) => { inputSystem.setControlMode(mode); workshopSystem?.setControlMode(mode); },
    onVolumeChange: (v) => {
      soundSystem.setMasterVolume(v);
    },
    onOpenControls: () => {
      controlsReturnState = gameState;
      pauseMenuSystem?.togglePause();
      gameState = "CONTROLS";
    },
    initialControlMode: CONTROLS.DEFAULT_MODE,
  });

  workshopSystem = createWorkshopSystem(player, CONTROLS.DEFAULT_MODE, () => assets[SCRAP_ICON_ASSET_KEY], soundSystem);

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(sonarSystem);
  engine.register(miniMapSystem);
  engine.register(missileSystem);
  engine.register(particleSystem);
  engine.register(cameraSystem);
  engine.register(powerSystem);
  engine.register(torchSystem);
  engine.register(roomSystem);
  engine.register(resourceManagementSystem);
  engine.register(glowSystem);
  engine.register(enemySystem);
  engine.register(pauseMenuSystem);
  engine.register(workshopSystem);
}

function draw() {
  frameRate(GAME.FPS);

  const isMenuState = gameState === "MAIN_PAGE" || gameState === "STORY_PAGE"
    || gameState === "CONTROLS" || gameState === "MENU"
    || gameState === "SETTINGS";

  if (audioUnlocked && isMenuState && !soundSystem?.isPlaying?.('introMusic')) {
    soundSystem?.loop?.('introMusic', 0.5);
  }

  if (!isMenuState) {
    soundSystem?.stop?.('introMusic');
  }

  const isGameplayState = gameState === "PLAYING";
  if (!isGameplayState) {
    soundSystem?.stop('gamebg1');
    soundSystem?.stop('movement');
  }

  // Check power depletion before any state routing so game over renders on the SAME frame
  if (isGameplayState && player.power?.isEmpty()) {
    gameState = GAME_OVER_STATE;
  }

  if (gameState === "MAIN_PAGE") {
    mainPageSystem.draw(mainPageBg);
    return;
  }

  if (gameState === "STORY_PAGE") {
    storyPageSystem.draw(menuBg);
    return;
  }

  if (gameState === "CONTROLS") {
    controlsPageSystem.draw(menuBg, controlsReturnState !== null);
    return;
  }

  if (gameState === "MENU") {
    menuSystem.draw(menuBg);
    return;
  } else if (gameState === "SETTINGS") {
    pauseMenuSystem.draw();
    if (!pauseMenuSystem.isPaused()) {
      gameState = settingsReturnState;
    }
    return;
  }

  if (gameState === WIN_STATE) {
    renderSystem?.draw?.(0);
    winScreenSystem.draw();
    // push(); // placeholder win screen
    // fill(255);
    // stroke(0);
    // strokeWeight(4);
    // textAlign(CENTER, CENTER);
    // textSize(48);
    // text("You Win!", width / 2, height / 2);
    // pop();
    return;
  }

  if (gameState === GAME_OVER_STATE) {
    renderSystem?.draw?.(0);
    gameOverSystem.draw();
    return;
  }

  const currentRoom = roomSystem?.getCurrentRoom?.();
  if (currentRoom && currentRoom !== lastEnsuredRoom) {
    ensureRoomAssetsLoaded(currentRoom);
    lastEnsuredRoom = currentRoom;
  }

  // Workshop overlay (blocks all input/gameplay)
  if (workshopSystem && workshopSystem.isWorkshopOpen()) {
    renderSystem?.draw?.(0);
    workshopSystem.draw();
    return;
  }

  // Story dialog overlay — shown once at start of a game session
  if (storyDialogActive) {
    renderSystem?.draw?.(0);
    drawStoryDialog();
    return;
  }

  if (pauseMenuSystem && pauseMenuSystem.isPaused()) {
    // Render last frame + pause overlay only
    pauseMenuSystem.draw();
  } else {
    accumulator += deltaTime / 1000;
    // if accumulator gained enough frames
    while (accumulator >= TIME.fixedDeltaTime) {
      engine.update();
      accumulator -= TIME.fixedDeltaTime;
    }
    // Check power depletion BEFORE rendering so game over appears immediately
    if (player.power?.isEmpty()) {
      gameState = GAME_OVER_STATE;
    }
    //soundSystem.setMasterVolume(pauseMenuSystem.getSettings().volume);
    alpha = accumulator / TIME.fixedDeltaTime;
    renderSystem.draw(alpha);
  }

  // Controls overlay — shown on top of game when toggled (does not block gameplay)
  if (showControlsOverlay) {
    drawControlsOverlay();
  }
}

function tryUnlockAudioContext() {
  if (audioUnlocked) return;
  if (typeof userStartAudio !== "function") return;

  try {
    const startResult = userStartAudio();
    if (startResult && typeof startResult.then === "function") {
      startResult
        .then(() => {
          audioUnlocked = true;
        })
        .catch(() => {
          // Keep false; next user gesture can try again.
        });
      return;
    }
    audioUnlocked = true;
  } catch {
    // Keep false; next user gesture can try again.
  }
}

// TODO: input handling in inputsystem
function keyPressed() {
  tryUnlockAudioContext();

  // Fullscreen toggle — works from any game state
  if (keyCode === CONTROLS.MODES[CONTROLS.DEFAULT_MODE].TOGGLE_FULLSCREEN) {
    fullscreen(!fullscreen());
    return;
  }

  inputSystem?.onKeyPressed?.(key, keyCode);

  // Always process pause toggle (ESC)
  if (player?.actionIntent?.togglePause) {
    pauseMenuSystem?.togglePause();
    player.actionIntent.togglePause = false;
  }

  if (player?.actionIntent?.toggleWorkshop) {
    workshopSystem?.toggleWorkshop();
    player.actionIntent.toggleWorkshop = false;
  }

  if (player?.actionIntent?.toggleControls) {
    showControlsOverlay = !showControlsOverlay;
    player.actionIntent.toggleControls = false;
  }

  // Only process other actions if not paused
  if (pauseMenuSystem?.isPaused()) return;
}

function mousePressed() {
  tryUnlockAudioContext();

  // Workshop overlay blocks all clicks
  if (workshopSystem?.isWorkshopOpen()) {
    soundSystem?.play('buttonClick', 0.8);
    workshopSystem?.onMousePressed();
    return;
  }

  // Story dialog click — dismisses the dialog
  if (storyDialogActive) {
    const result = checkStoryDialogClick(mouseX, mouseY);
    if (result === 'dismiss') {
      storyDialogActive = false;
      showControlsOverlay = true;  // show controls before gameplay starts
    }
    return;
  }

  // Controls overlay — only the BACK button dismisses it
  if (showControlsOverlay) {
    if (controlsPageSystem.checkClick(true) === "BACK") {
      soundSystem?.play('buttonClick', 0.8);
      showControlsOverlay = false;
    }
    return;
  }

  if (gameState === "MAIN_PAGE") {
    const selection = mainPageSystem.checkClick(mouseX, mouseY);
    if (selection === "PLAY") {
      soundSystem?.play('buttonClick', 0.8);
      gameState = "STORY_PAGE";
    }
    return;
  }

  if (gameState === "STORY_PAGE") {
    const selection = storyPageSystem.checkClick(mouseX, mouseY);
    if (selection === "CONTINUE") {
      soundSystem?.play('buttonClick', 0.8);
      gameState = "CONTROLS";
    }
    return;
  }

  if (gameState === "CONTROLS") {
    const standalone = controlsReturnState !== null;
    const selection = controlsPageSystem.checkClick(standalone);
    if (selection === "BACK") {
      soundSystem?.play('buttonClick', 0.8);
      if (standalone) {
        const returnTo = controlsReturnState;
        controlsReturnState = null;
        pauseMenuSystem.openSettingsMenu(returnTo === "SETTINGS");
        gameState = returnTo;
      } else {
        gameState = "STORY_PAGE";
      }
    } else if (selection === "NEXT") {
      soundSystem?.play('buttonClick', 0.8);
      hasSeenIntro = true;
      gameState = "MENU";
    }
    return;
  }

  if (gameState === WIN_STATE) {
    const selection = winScreenSystem.checkClick(mouseX, mouseY);
    if (selection === "RESTART") {
      soundSystem?.play('buttonClick', 0.8);
      restartCurrentSession();
      gameState = "PLAYING";
    } else if (selection === "MENU") {
      soundSystem?.play('buttonClick', 0.8);
      gameState = "MENU";
    }
    return;
  }

  if (gameState === GAME_OVER_STATE) {
    const selection = gameOverSystem.checkClick(mouseX, mouseY);
    if (selection === "YES") {
      soundSystem?.play('buttonClick', 0.8);
      restartCurrentSession();
      gameState = "PLAYING";
    } else if (selection === "NO") {
      soundSystem?.play('buttonClick', 0.8);
      gameState = "MENU";
    } else if (selection === "SETTINGS") {
      soundSystem?.play('buttonClick', 0.8);
      settingsReturnState = GAME_OVER_STATE;
      gameState = "SETTINGS";
      pauseMenuSystem.openSettingsMenu(true);
    }
    return;
  }

  if (gameState === "MENU") {
    const selection = menuSystem.checkClick(mouseX, mouseY);

    if (selection === "EASY" || selection === "HARD") {
      soundSystem?.stop('introMusic');
      soundSystem?.play('buttonClick', 0.8);
      soundSystem?.play('waterSplash', 1.0);
      soundSystem?.loop('gamebg1', 0.7);
      sessionDifficulty = selection;
      applyDifficultyConfig(selection);
      resetGameToStart();
      storyDialogActive = !hasSeenIntro;
      gameState = "PLAYING";
    } else if (selection === "SETTINGS") {
      soundSystem?.play('buttonClick', 0.8);
      settingsReturnState = "MENU";
      gameState = "SETTINGS";
      pauseMenuSystem.openSettingsMenu(true);
    } else if (selection === "CONTROLS") {
      soundSystem?.play('buttonClick', 0.8);
      gameState = "CONTROLS";
    }
    return;
  }

  if (gameState === "SETTINGS") {
    soundSystem?.play('buttonClick', 0.8);
    pauseMenuSystem?.onMousePressed();
    return;
  }

  // Forward clicks to pause menu while game is paused mid-play
  if (pauseMenuSystem?.isPaused()) {
    soundSystem?.play('buttonClick', 0.8);
    pauseMenuSystem.onMousePressed();
    return;
  }
}

function applyDifficultyConfig(selection) {
  const diffLevel = selection === "EASY" ? "easy" : "hard";
  if (pauseMenuSystem) {
    pauseMenuSystem.setDifficulty(diffLevel);
  }
}

function mouseDragged() {
  pauseMenuSystem?.onMouseDragged();
}

function mouseReleased() {
  pauseMenuSystem?.onMouseReleased();
}

//--------------------------------------
// DISPLAY SCALING
//--------------------------------------
function applyDisplayScale() {
  const canvasEl = document.querySelector("canvas");
  if (!canvasEl) return;

  // Keep body clean: no scrollbars, black letterbox bars
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";

  if (useDevResolution) {
    // Dev mode: show canvas at its native pixel size, no CSS scaling
    canvasEl.style.width = "";
    canvasEl.style.height = "";
    canvasEl.style.position = "";
    canvasEl.style.left = "";
    canvasEl.style.top = "";
  } else {
    // Scale canvas to fit the current window while preserving 16:9
    const s = Math.min(window.innerWidth / width, window.innerHeight / height);
    const displayW = Math.floor(width * s);
    const displayH = Math.floor(height * s);
    canvasEl.style.width = displayW + "px";
    canvasEl.style.height = displayH + "px";
    // Center the canvas (letterbox black bars come from body background)
    canvasEl.style.position = "absolute";
    canvasEl.style.left = Math.floor((window.innerWidth - displayW) / 2) + "px";
    canvasEl.style.top = Math.floor((window.innerHeight - displayH) / 2) + "px";
  }
}

function restartCurrentSession() {
  if (sessionDifficulty) {
    applyDifficultyConfig(sessionDifficulty);
  }
  resetGameToStart();
}

function resetGameToStart() {
  // 1. Send the player back to the first room
  const startRoom = GAME_START_ROOM;
  roomSystem.goToRoom(startRoom, { spawnId: "default" });

  // 2. Snap the player's physical coordinates to the spawn point
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y);
  }

  // 3. Snap the camera back to the start
  if (playerStart) {
    cameraSystem.snapTo(playerStart.x, playerStart.y);
  }

  // 4. Reset Player stats
  if (player.power) {
    player.power.reset();
  }
  if (player.torch) {
    player.torch.isOn = false;
  }

  // 5. Reset upgrades, inventory, and scrap
  player.upgrades = { power: 1, torch: 1, sonar: 1 };
  player.missiles = 0;
  player.scrap = PLAYER.STARTING_SCRAP;

  // 6. Reset workshop internal state (costs, levels, open state)
  workshopSystem?.reset();

  // 7. Reset Collectables (requires a reset method in resourceManagementSystem)
  if (
    resourceManagementSystem &&
    typeof resourceManagementSystem.reset === "function"
  ) {
    resourceManagementSystem.reset();
  }
}

//======================================
// STORY DIALOG OVERLAY
// Shown once when a new game session starts, must be dismissed to play
//======================================
const STORY_DIALOG_TEXT = `
A deep sea expedition takes an unexpected turn when your submersible breaks down far below the surface

With limited power and a long journey ahead, you'll need to navigate carefully

Your sonar will guide you through the dark

Your torch will help you see, but "light comes at a cost"

Somewhere above the surface waits

Can you find your way back?
`;

function drawStoryDialog() {
  // Darken the game background
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);

  const boxW = width * 0.75;
  const boxH = height * 0.60;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 - boxH / 2;

  // Dialog box
  fill(10, 20, 35, 240);
  stroke(0, 180, 200);
  strokeWeight(3);
  rect(boxX, boxY, boxW, boxH, 16);

  // Title
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(36);
  text("THE ABYSS", width / 2, boxY + 45);

  // Story text
  fill(200, 220, 240);
  textStyle(NORMAL);
  textSize(20);
  textAlign(CENTER, TOP);
  const textPadding = 40;
  text(STORY_DIALOG_TEXT, boxX + textPadding, boxY + 95, boxW - textPadding * 2, boxH - 140);

  // Dismiss button
  const btnW = 200;
  const btnH = 55;
  const btnX = width / 2 - btnW / 2;
  const btnY = boxY + boxH - btnH - 30;

  const hovering = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  noStroke();
  fill(0, 0, 0, 100);
  rect(btnX + 3, btnY + 4, btnW, btnH, 10);
  fill(hovering ? color(0, 210, 190) : color(0, 140, 130));
  rect(btnX, btnY, btnW, btnH, 10);
  fill(255, 255, 255, 60);
  rect(btnX, btnY, btnW, btnH * 0.35, 10, 10, 0, 0);
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(22);
  text("BEGIN", width / 2, btnY + btnH / 2);
  textStyle(NORMAL);
}

function checkStoryDialogClick(mX, mY) {
  const boxW = width * 0.75;
  const boxH = height * 0.60;
  const boxX = width / 2 - boxW / 2;
  const boxY = height / 2 - boxH / 2;
  const btnW = 200;
  const btnH = 55;
  const btnX = width / 2 - btnW / 2;
  const btnY = boxY + boxH - btnH - 30;

  if (mX > btnX && mX < btnX + btnW && mY > btnY && mY < btnY + btnH) {
    soundSystem?.play('buttonClick', 0.8);
    return 'dismiss';
  }
  return null;
}

//======================================
// CONTROLS OVERLAY
// Toggled by C key — shows control bindings on top of gameplay
//======================================
function drawControlsOverlay() {
  fill(0, 0, 0, 160);
  noStroke();
  rect(0, 0, width, height);

  controlsPageSystem.draw(null, true);
}

function windowResized() {
  applyDisplayScale();
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.mousePressed = mousePressed;
window.mouseDragged = mouseDragged;
window.mouseReleased = mouseReleased;
window.windowResized = windowResized;
