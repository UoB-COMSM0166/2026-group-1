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
import { createRenderSystem } from "./systems/renderSystem.js";
import { createLightingSystem } from "./systems/lightingSystem.js";
import { createSonarSystem } from "./systems/sonarSystem.js";
import { createRoomSystem } from "./systems/roomSystem.js";
import { createPauseMenuSystem } from "./systems/pauseMenuSystem.js";
import { createCameraSystem } from "./systems/cameraSystem.js";
import { CANVAS, DISPLAY, PLAYER, TORCH, TIME, GAME } from "./config.js";
import { Player } from "./entities/player.js";
import { createResourceManagementSystem } from "./systems/resourceManagementSystem.js";
import { createMenuSystem } from "./systems/menuSystem.js";
import { createEnemySystem } from './systems/enemySystem.js';
import { createWinScreenSystem } from "./systems/winScreenSystem.js";

let accumulator = 0;
let alpha;

let engine;
let darknessLayer;
let player;

let inputSystem;
let playerSystem;
let physicsSystem;
let torchSystem;
let sonarSystem;
let renderSystem;
let lightingSystem;
let roomSystem;
let resourceManagementSystem;
let enemySystem;
let pauseMenuSystem;
let cameraSystem;
let lastEnsuredRoom = null;
let gameState = "MENU";
let menuSystem;
let winScreenSystem;
const WIN_STATE = "WIN";

let assets = {};
const INITIAL_ROOM_ID = "startArea";
// NOTE: Some rooms are placeholders (see docs/data/rooms/*.json) so the build runs end-to-end.
const ROOM_IDS = ["roomA", "roomB", "startArea", "spikeMaze", "tunnel", "crabCaverns", "deepCaverns",
                  "theDrop", "endlessAbyss", "theBiolume", "jellyfishAtrium", "theSurface"];
const roomData = {};
const FIT_CANVAS_TO_ROOM = false;
let useDevResolution = false;
const BACKGROUND_FILE_MAP = {
  "bg-atmosphere": "bg-atmosphere.jpg",
  "bg-atmosphere.jpg": "bg-atmosphere.jpg",
};

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

function tilesetSourceToImagePath(source, mapDir = "data/rooms") {
  if (!source) return null;
  // backgrounds.tsx is an image collection (no single .png atlas file to load).
  if (String(source).toLowerCase().endsWith("backgrounds.tsx")) return null;
  const pngSource = source.replace(/\.tsx$/i, ".png");
  return normalizeRelativePath(mapDir, pngSource);
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
    const imagePath = tilesetSourceToImagePath(tileset?.source, mapDir);
    if (!imagePath) continue;
    tileset.resolvedImagePath = imagePath;
    const key = `tileset:${imagePath}`;
    if (!assets[key]) {
      assets[key] = loadImage(imagePath);
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
  for (const roomId of ROOM_IDS) {
    roomData[roomId] = loadJSON(`data/rooms/${roomId}.json`);
  }

  const tilePropsBySourcePath = {};
  for (const [roomId, room] of Object.entries(roomData)) {
    const mapDir = roomMapDir(roomId);
    for (const tileset of room?.tilesets ?? []) {
      const sourcePath = normalizeRelativePath(mapDir, tileset?.source ?? "");
      if (!sourcePath.toLowerCase().endsWith(".tsx")) continue;
      if (tilePropsBySourcePath[sourcePath]) continue;

      const tsxLines = loadStrings(sourcePath) ?? [];
      tilePropsBySourcePath[sourcePath] = parseTsxTileProperties(
        tsxLines.join("\n"),
      );
    }
  }

  for (const [roomId, room] of Object.entries(roomData)) {
    const mapDir = roomMapDir(roomId);
    for (const tileset of room?.tilesets ?? []) {
      const sourcePath = normalizeRelativePath(mapDir, tileset?.source ?? "");
      tileset.tilePropertiesById = tilePropsBySourcePath[sourcePath] ?? {};
      // Attach the resolved image path so the render system can look it up
      // without needing to re-derive the map directory at draw time.
      tileset.resolvedImagePath = tilesetSourceToImagePath(tileset?.source, mapDir);
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
      const imagePath = tilesetSourceToImagePath(tileset?.source, mapDir);
      if (imagePath) tilesetImagePaths.add(imagePath);
    }
  }

  for (const imagePath of tilesetImagePaths) {
    assets[`tileset:${imagePath}`] = loadImage(imagePath);
  }
}

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  textSize(20);
  textAlign(LEFT);
  applyDisplayScale();

  menuSystem = createMenuSystem();
  winScreenSystem = createWinScreenSystem();

  player = new Player(PLAYER);

  const initialRoom = INITIAL_ROOM_ID;
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
      gameState = WIN_STATE;
    },
  });
  roomSystem.goToRoom(initialRoom, { spawnId: "default" });
  syncCanvasToCurrentRoom();
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y);
  }

  darknessLayer = createGraphics(width, height);

  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player);
  physicsSystem = createPhysicsSystem(player, () => roomSystem.getRoomState());
  cameraSystem = createCameraSystem(player, CANVAS.WIDTH, CANVAS.HEIGHT);
  // Snap camera to player's initial position
  cameraSystem.snapTo(player.position.x, player.position.y);
  torchSystem = createTorchSystem(player.torch, player, {
    drainRate: TORCH.DRAIN_RATE,
    getDifficulty: () =>
      pauseMenuSystem ? pauseMenuSystem.getDifficulty() : "normal",
  });

  sonarSystem = createSonarSystem(
    player,
    () => roomSystem.getPlatforms(),
    () => roomSystem.getHazards(),
    () => roomSystem.getCollectables(),
  );

  lightingSystem = createLightingSystem(
    player,
    () => sonarSystem?.getSonarLights?.() ?? [],
  );

  resourceManagementSystem = createResourceManagementSystem(
    player,
    roomSystem,
    () => roomSystem.getCollectables(),
    () => roomSystem.getHazards(),
    () => pauseMenuSystem.getDifficulty(),
  );

  enemySystem = createEnemySystem(
    player,
    () => roomSystem.getEnemies()
  );
  
  renderSystem = createRenderSystem({
    player,
    getPlatforms: () => roomSystem.getPlatforms(),
    getHazards: () => roomSystem.getHazards(),
    getCollectables: () =>
      roomSystem
        .getCollectables()
        .filter((c) => !resourceManagementSystem.isCollected(c)),
    getEnemies: () => enemySystem.getCrabs(),
    getTriggers: () => roomSystem.getTriggers(),
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
    assets,
    darknessLayer,
    getLightSources: () => lightingSystem.getLightSources(),
    getActivePulses: () => sonarSystem?.getActivePulses?.() ?? [],
    getRevealedWalls: () => sonarSystem?.getRevealedWalls?.() ?? [],
    getCameraOffset: () => cameraSystem.getOffset(),
    getOldCamPosition: () => cameraSystem.getOldCamPosition(),
    getCameraScale: () => cameraSystem.getScale(),
  });

  pauseMenuSystem = createPauseMenuSystem({
    onDifficultyChange: (diff) => {},
    onResolutionChange: (isDev) => {
      useDevResolution = isDev;
      applyDisplayScale();
    },
  });

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(sonarSystem);
  engine.register(cameraSystem);
  engine.register(torchSystem);
  engine.register(roomSystem);
  engine.register(resourceManagementSystem);
  engine.register(enemySystem);
  engine.register(pauseMenuSystem);
}

function draw() {
  frameRate(GAME.FPS);
  // Draw-loop health check — remove once confirmed stable
  if (frameCount % 60 === 0) console.log('[draw] frame', frameCount, '| fps:', Math.round(frameRate()));
  if (gameState === "MENU") {
    menuSystem.draw(null);
    return;
  } else if (gameState === "SETTINGS") {
    // Use pauseMenuSystem to render the settings
    pauseMenuSystem.draw();

    // If the back button closed it, return to the start menu
    if (!pauseMenuSystem.isPaused()) {
      gameState = "MENU";
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

  const currentRoom = roomSystem?.getCurrentRoom?.();
  if (currentRoom && currentRoom !== lastEnsuredRoom) {
    ensureRoomAssetsLoaded(currentRoom);
    lastEnsuredRoom = currentRoom;
  }

  accumulator += deltaTime / 1000;

  if (pauseMenuSystem && pauseMenuSystem.isPaused()) {
    // Render last frame + pause overlay only
    pauseMenuSystem.draw();
  } else {
    while (accumulator >= TIME.fixedDeltaTime) {
      engine.update(TIME.fixedDeltaTime);
      accumulator -= TIME.fixedDeltaTime;
    }
    alpha = accumulator / TIME.fixedDeltaTime;
    renderSystem?.draw?.(alpha);
  }
}

function keyPressed() {
  if (keyCode === 27) {
    // ESC
    pauseMenuSystem?.togglePause();
    return;
  }
  if (pauseMenuSystem?.isPaused()) return;
  inputSystem?.onKeyPressed?.(key, keyCode);
}

function mousePressed() {
  // 1. check win screen
  if (gameState === WIN_STATE) {
    const selection = winScreenSystem.checkClick(mouseX, mouseY);
    if (selection === "MENU") {
      resetGameToStart();
      gameState = "MENU";
    }
    // return;
  }
  // 2. Check Start Menu
  else if (gameState === "MENU") {
    const selection = menuSystem.checkClick(mouseX, mouseY);

    if (selection === "EASY" || selection === "HARD") {
      applyDifficultyConfig(selection);
      gameState = "PLAYING";
    } else if (selection === "SETTINGS") {
      gameState = "SETTINGS";
      pauseMenuSystem.openSettingsMenu(true);
    }
    // return;
  }
  // 3. check settings
  else if (gameState === "SETTINGS") {
    pauseMenuSystem?.onMousePressed();
    // return;
  }
}

function applyDifficultyConfig(selection) {
  const diffLevel = selection === "EASY" ? "normal" : "hard";

  if (pauseMenuSystem) {
    pauseMenuSystem.setDifficulty(diffLevel);
    console.log(`Game started on ${diffLevel} difficulty.`);
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

  if (useDevResolution) {
    // Dev mode: native resolution, no CSS scaling
    canvasEl.style.width = "";
    canvasEl.style.height = "";
  } else {
    // Production mode: scale canvas to fit 1920x1080
    const scaleX = DISPLAY.WIDTH / width;
    const scaleY = DISPLAY.HEIGHT / height;
    const s = Math.min(scaleX, scaleY);
    canvasEl.style.width = width * s + "px";
    canvasEl.style.height = height * s + "px";
  }
}

function resetGameToStart() {
  // 1. Send the player back to the first room
  roomSystem.goToRoom(INITIAL_ROOM_ID, { spawnId: "default" });

  // 2. Snap the player's physical coordinates to the spawn point
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y);
  }

  // 3. Snap the camera back to the start
  cameraSystem.snapTo(playerStart.x, playerStart.y);

  // 4. Reset Player stats
  if (player.power) {
    player.power.current = player.power.max || 100;
  }
  if (player.torch) {
    player.torch.isOn = false;
  }

  // 5. Reset Collectables (requires a reset method in resourceManagementSystem)
  if (
    resourceManagementSystem &&
    typeof resourceManagementSystem.reset === "function"
  ) {
    resourceManagementSystem.reset();
  }
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.mousePressed = mousePressed;
window.mouseDragged = mouseDragged;
window.mouseReleased = mouseReleased;
