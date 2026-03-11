/*
========================================
MAIN (SKETCH CANVAS)
========================================
VERSION: 2.5
SYSTEM: Main / p5.js Canvas
AUTHOR: Georgia Sweeny


- declaration and init of camera and UI system added by jude

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
import { CANVAS, PLAYER, TORCH } from "./config.js";
import { Player } from "./entities/player.js";
import { createResourceManagementSystem } from "./systems/resourceManagementSystem.js";
import { createCameraSystem } from "./systems/cameraSystem.js";
import { createUISystem } from "./systems/uiSystem.js";
import { createMenuSystem } from "./systems/menuSystem.js";

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
let cameraSystem;
let uiSystem;
let lastEnsuredRoom = null;
let gameState = "START_MENU";
let titleImage;
let menuSystem;

let assets = {};
const INITIAL_ROOM_ID = "roomA";
const ROOM_IDS = ["roomA", "roomB"];
const roomData = {};
const FIT_CANVAS_TO_ROOM = false; // fixed canvas size to ask as the camera viewport
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

function tilesetSourceToImagePath(source) {
  if (!source) return null;
  // backgrounds.tsx is an image collection (no single .png atlas file to load).
  if (String(source).toLowerCase().endsWith("backgrounds.tsx")) return null;
  const pngSource = source.replace(/\.tsx$/i, ".png");
  return normalizeRelativePath("data/rooms", pngSource);
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

  for (const tileset of room?.tilesets ?? []) {
    const imagePath = tilesetSourceToImagePath(tileset?.source);
    if (!imagePath) continue;
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
}

function preload() {
  for (const roomId of ROOM_IDS) {
    roomData[roomId] = loadJSON(`data/rooms/${roomId}.json`);
  }

  const tilePropsBySourcePath = {};
  for (const room of Object.values(roomData)) {
    for (const tileset of room?.tilesets ?? []) {
      const sourcePath = normalizeRelativePath(
        "data/rooms",
        tileset?.source ?? "",
      );
      if (!sourcePath.toLowerCase().endsWith(".tsx")) continue;
      if (tilePropsBySourcePath[sourcePath]) continue;

      const tsxLines = loadStrings(sourcePath) ?? [];
      tilePropsBySourcePath[sourcePath] = parseTsxTileProperties(
        tsxLines.join("\n"),
      );
    }
  }

  for (const room of Object.values(roomData)) {
    for (const tileset of room?.tilesets ?? []) {
      const sourcePath = normalizeRelativePath(
        "data/rooms",
        tileset?.source ?? "",
      );
      tileset.tilePropertiesById = tilePropsBySourcePath[sourcePath] ?? {};
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
  for (const room of Object.values(roomData)) {
    for (const tileset of room?.tilesets ?? []) {
      const imagePath = tilesetSourceToImagePath(tileset?.source);
      if (imagePath) tilesetImagePaths.add(imagePath);
    }
  }

  for (const imagePath of tilesetImagePaths) {
    assets[`tileset:${imagePath}`] = loadImage(imagePath);
  }

  titleImage = loadImage("assets/titleImage.png");
}

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  // rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);

  darknessLayer = createGraphics(CANVAS.WIDTH, CANVAS.HEIGHT);

  player = new Player(
    PLAYER.START_X,
    PLAYER.START_Y,
    PLAYER.WIDTH,
    PLAYER.HEIGHT,
  );

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
  });
  roomSystem.goToRoom(initialRoom, { spawnId: "default" });
  syncCanvasToCurrentRoom();
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y);
  }

  // darknessLayer = createGraphics(width, height);

  darknessLayer = createGraphics(width, height);

  // init the camera system
  cameraSystem = createCameraSystem(player, () => {
    const currentRoom = roomSystem.getCurrentRoom();
    return getRoomPixelSize(currentRoom);
  });

  menuSystem = createMenuSystem();
  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player);
  physicsSystem = createPhysicsSystem(player, () => roomSystem.getRoomState());
  torchSystem = createTorchSystem(player.torch, player, {
    drainRate: TORCH.DRAIN_RATE,
  });

  sonarSystem = createSonarSystem(
    player,
    () => roomSystem.getPlatforms(),
    () => roomSystem.getHazards(),
    () => roomSystem.getCollectables(),
  );

  lightingSystem = createLightingSystem(player);

  resourceManagementSystem = createResourceManagementSystem(player, roomSystem);

  uiSystem = createUISystem(player);

  //handlers for different item types
  resourceManagementSystem.registerHandler("power", (player, item) => {
    player.power.current = Math.max(
      0,
      Math.min(player.power.current + item.amount, player.power.maxPower),
    );
  });

  renderSystem = createRenderSystem({
    player,
    getCamera: () => cameraSystem.getCamera(),
    getUIData: () => uiSystem.getUIData(),
    getPlatforms: () => roomSystem.getPlatforms(),
    getHazards: () => roomSystem.getHazards(),
    getCollectables: () => roomSystem.getCollectables(),
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
    getActivePulses: () => sonarSystem.getActivePulses(),
    getRevealedWalls: () => sonarSystem.getRevealedWalls(),
  });

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(sonarSystem);
  engine.register(torchSystem);
  engine.register(roomSystem);
  engine.register(cameraSystem);
  engine.register(uiSystem);
  engine.register(renderSystem);
  engine.register(resourceManagementSystem);
}

function draw() {
  if (gameState === "START_MENU") {
    // Only draw the menu, do NOT run the engine
    menuSystem.draw(titleImage);
  } else if (gameState === "PLAYING") {
    // Run the actual game
    const currentRoom = roomSystem?.getCurrentRoom?.();
    if (currentRoom && currentRoom !== lastEnsuredRoom) {
      ensureRoomAssetsLoaded(currentRoom);
      lastEnsuredRoom = currentRoom;
    }
    syncCanvasToCurrentRoom();
    engine.update(deltaTime);
  }
}

function keyPressed() {
  inputSystem.onKeyPressed?.(key, keyCode);
}

function mousePressed() {
  if (gameState === "START_MENU") {
    const clickedButton = menuSystem.checkClick(mouseX, mouseY);

    if (clickedButton === "EASY") {
      // Load the easy map and start!
      roomSystem.goToRoom("roomA", { spawnId: "default" });
      gameState = "PLAYING";
    } else if (clickedButton === "HARD") {
      // Load the hard map and start!
      roomSystem.goToRoom("roomB", { spawnId: "default" });
      gameState = "PLAYING";
    }
  }
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.mousePressed = mousePressed;
