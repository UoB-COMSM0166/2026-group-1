/*
========================================
MAIN (SKETCH CANVAS)
========================================
VERSION: 2.5
SYSTEM: Main / p5.js Canvas
AUTHOR: Georgia Sweeny
========================================
*/

//======================================
// MAIN
//======================================

import { Engine } from './gameEngine/engine.js';
import { createInputSystem } from './systems/inputSystem.js';
import { createPlayerSystem } from './systems/playerSystem.js';
import { createPhysicsSystem } from './systems/physicsSystem.js';
import { createTorchSystem } from './systems/torchSystem.js';
import { createRenderSystem } from './systems/renderSystem.js';
import { createLightingSystem } from './systems/lightingSystem.js';
import { createSonarSystem } from './systems/sonarSystem.js';
import { createRoomSystem } from './systems/roomSystem.js';
import { createEnvironmentSystem } from './systems/environmentSystem.js';
import { CANVAS, PLAYER, GAME, TORCH } from './config.js';
import { Player } from './entities/player.js';
import { createResourceManagementSystem } from './systems/resourceManagementSystem.js';

let engine;
let darknessLayer;
let player;

let inputSystem;
let playerSystem;
let physicsSystem;
let torchSystem;
let renderSystem;
let lightingSystem;
let sonarSystem;
let roomSystem;
let environmentSystem;
let resourceManagementSystem;
const ENABLE_LIGHTING = true; //lighitng toggle for debug & testing

let assets = {};
const roomData = {};
const INITIAL_ROOM_ID = 'roomA';
const ROOM_IDS = ['roomA', 'roomB'];
const BACKGROUND_FILE_MAP = {
  'bg-atmosphere': 'bg-atmosphere.jpg',
  'bg-atmosphere.jpg': 'bg-atmosphere.jpg',
};

function normalizeBackgroundImageName(name) {
  if (!name) return null;
  const raw = String(name).trim();
  if (!raw) return null;
  if (raw.includes('/')) return raw;
  if (BACKGROUND_FILE_MAP[raw]) return BACKGROUND_FILE_MAP[raw];
  if (/\.[a-z0-9]+$/i.test(raw)) return raw;
  return raw;
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

  // backgrounds.tsx is an image collection; map tile ids to known files.
  if (String(best.source ?? '').toLowerCase().endsWith('backgrounds.tsx')) {
    const localId = gid - best.firstgid;
    const byId = {
      0: 'bg-atmosphere.jpg',
      1: 'bg-atmosphere.jpg'
    };
    return byId[localId] ?? null;
  }
  return null;
}

function getMapProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function getBackgroundImageName(room) {
  const roomBg = normalizeBackgroundImageName(room?.background?.image);
  if (roomBg) return roomBg;

  const propImage = getMapProperty(room, 'backgroundImage', null);
  if (propImage) return propImage;

  const bgObjectLayer = (room?.layers ?? []).find(
    (l) => l?.type === 'objectgroup' && String(l?.name ?? '').toLowerCase().includes('background')
  );
  const bgObject = (bgObjectLayer?.objects ?? [])[0];
  const bgObjectProps = bgObject?.properties ?? [];
  const bgPropImage = bgObjectProps.find((p) => p?.name === 'backgroundImage' || p?.name === 'image')?.value;
  const propBg = normalizeBackgroundImageName(bgPropImage);
  if (propBg) return propBg;
  const bgGidImage = resolveBackgroundImageFromGid(room, bgObject?.gid ?? null);
  if (bgGidImage) return bgGidImage;
  const namedBg = normalizeBackgroundImageName(bgObject?.name);
  if (namedBg) return namedBg;

  const imageLayer = (room?.layers ?? []).find((l) => l?.type === 'imagelayer' && l?.image);
  if (imageLayer?.image) return imageLayer.image;

  return null;
}

function ensureRoomAssetsLoaded(roomId) {
  const room = roomData[roomId];
  if (!room) return;

  const backgroundImageName = getBackgroundImageName(room);
  if (backgroundImageName && !assets[backgroundImageName]) {
    const backgroundPath = backgroundImageName.includes('/')
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

function preload() {
  for (const roomId of ROOM_IDS) {
    roomData[roomId] = loadJSON(`data/rooms/${roomId}.json`);
  }

  const imageNames = new Set();
  for (const room of Object.values(roomData)) {
    const imageName = getBackgroundImageName(room);
    
    if (imageName) imageNames.add(imageName);
  }

  for (const imageName of imageNames) {
    const imagePath = imageName.includes('/') ? imageName : `assets/backgrounds/${imageName}`;
    assets[imageName] = loadImage(imagePath);
  }

  // Ensure known room backgrounds are always available even if room metadata is incomplete.
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
}

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
 // rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);

  player = new Player(PLAYER);

  const initialRoom = INITIAL_ROOM_ID;
  roomSystem = createRoomSystem({
    initialRoom,
    roomData,
    player,
    onRoomLoaded: ({ roomData: activeRoomData, width: roomWidth, height: roomHeight }) => {
      if (activeRoomData) {
        ensureRoomAssetsLoaded(activeRoomData);
        // Keep environment objects in sync with the active room.
        environmentSystem?.loadRoom(activeRoomData);
      }
      if (!roomWidth || !roomHeight) return;
      resizeCanvas(roomWidth, roomHeight);
      if (darknessLayer) {
        darknessLayer.resizeCanvas(roomWidth, roomHeight);
      }
      if (typeof window !== 'undefined' && Number.isFinite(player?.x) && Number.isFinite(player?.y)) {
        const targetX = Math.max(0, Math.round(player.x - window.innerWidth / 2));
        const targetY = Math.max(0, Math.round(player.y - window.innerHeight / 2));
        window.scrollTo(targetX, targetY);
      }
    }
  });
  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.setCurrentPosition(playerStart.x, playerStart.y); 
  }

  darknessLayer = createGraphics(width, height);

  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player);
  
  environmentSystem = createEnvironmentSystem(player, {
    modifyHealth: (amount) => {
      player.health = (player.health || 100) + amount;
      console.log(`Player health changed by ${amount}. Current health: ${player.health}`);
    }
  });
  environmentSystem.loadRoom(roomData[initialRoom]);

  physicsSystem = createPhysicsSystem(player, () => roomSystem.getPlatforms(), {
    fallSpeed: PLAYER.FALL_SPEED,
    groundY: GAME.GROUND_Y
  });
  physicsSystem = createPhysicsSystem(player, () => roomSystem.getRoomState());
  torchSystem = createTorchSystem(player.torch, player, {
    drainRate: TORCH.DRAIN_RATE
  });

  sonarSystem = createSonarSystem(player, () => roomSystem.getPlatforms());

  lightingSystem = createLightingSystem(() => [
    player,
    ...(roomSystem.getEntities?.() ?? [])
  ]);

  resourceManagementSystem = createResourceManagementSystem(player, roomSystem);

  //handlers for different item types
  resourceManagementSystem.registerHandler('power', (player, item) => {
    player.power.current = Math.max(
      0,
      Math.min(player.power.current + item.amount, player.power.maxPower)
    );
  });

  renderSystem = createRenderSystem({
    player,
    getPlatforms: () => roomSystem.getPlatforms(),
    getHazards: () => roomSystem.getHazards(),
    getCollectables: () => roomSystem.getCollectables(),
    getExits: () => roomSystem.getExits(),
    getSpawnPoints: () => roomSystem.getSpawnPoints(),
    getTilesets: () => roomSystem.getTilesets(),
    getTileSize: () => roomSystem.getTileSize(),
    getBackground: () => roomSystem.getBackground(),
    getPlatformColor: () => roomSystem.getPlatformColor(),
    getSonarCooldown: () => sonarSystem?.getCooldownPercent?.(),
    getSonarReveals: () => sonarSystem?.getRevealedWalls?.(),
    assets,
    darknessLayer,
    getLightSources: () => lightingSystem.getLightSources(),
    enableLighting: ENABLE_LIGHTING,
    getEnvironmentEntities: () => environmentSystem.getEntities()
  });

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(torchSystem);
  engine.register(roomSystem);
  engine.register(environmentSystem);
  engine.register(renderSystem);
  engine.register(sonarSystem);
  engine.register(resourceManagementSystem);
}

function draw() {
  engine.update(deltaTime);
}

function keyPressed() {
  inputSystem?.onKeyPressed?.(key, keyCode);
}

function keyReleased() {
  if (key === 'A' || key === 'a') player.moveIntent.left = false;
  if (key === 'D' || key === 'd') player.moveIntent.right = false;
}


window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.keyReleased = keyReleased;
