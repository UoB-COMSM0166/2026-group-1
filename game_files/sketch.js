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
import { createRoomSystem } from './systems/roomSystem.js';
import { CANVAS, PLAYER, GAME, TORCH } from './config.js';
import { Player } from './entities/player.js';
import { room_test } from './data/rooms/room_test.js';

let engine;
let darknessLayer;
let player;

let inputSystem;
let playerSystem;
let physicsSystem;
let torchSystem;
let renderSystem;
let lightingSystem;
let roomSystem;

let assets = {};
const roomData = {
  [room_test.id]: room_test
};

function getMapProperty(mapData, key, fallback = null) {
  const props = mapData?.properties;
  if (!Array.isArray(props)) return fallback;
  const found = props.find((p) => p?.name === key);
  return found ? found.value : fallback;
}

function getBackgroundImageName(room) {
  if (room?.background?.image) return room.background.image;

  const propImage = getMapProperty(room, 'backgroundImage', null);
  if (propImage) return propImage;

  const imageLayer = (room?.layers ?? []).find((l) => l?.type === 'imagelayer' && l?.image);
  if (imageLayer?.image) return imageLayer.image;

  return null;
}

function preload() {
  const imageNames = new Set();
  for (const room of Object.values(roomData)) {
    const imageName = getBackgroundImageName(room);
    if (imageName) imageNames.add(imageName);
  }

  for (const imageName of imageNames) {
    const imagePath = imageName.includes('/') ? imageName : `assets/backgrounds/${imageName}`;
    assets[imageName] = loadImage(imagePath);
  }
}

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);

  darknessLayer = createGraphics(CANVAS.WIDTH, CANVAS.HEIGHT);

  player = new Player(PLAYER);

  const initialRoom = room_test.id;
  roomSystem = createRoomSystem({
    initialRoom,
    roomData
  });

  const playerStart = roomSystem.getPlayerStart();
  if (playerStart) {
    player.x = playerStart.x;
    player.y = playerStart.y;
  }

  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player);
  physicsSystem = createPhysicsSystem(player, () => roomSystem.getPlatforms(), {
    fallSpeed: PLAYER.FALL_SPEED,
    groundY: GAME.GROUND_Y
  });
  torchSystem = createTorchSystem(player.torch, player, {
    drainRate: TORCH.DRAIN_RATE
  });

  lightingSystem = createLightingSystem(player, []);

  renderSystem = createRenderSystem({
    player,
    getPlatforms: () => roomSystem.getPlatforms(),
    getBackground: () => roomSystem.getBackground(),
    getPlatformColor: () => roomSystem.getPlatformColor(),
    assets,
    darknessLayer,
    getLightSources: () => lightingSystem.getLightSources()
  });

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(torchSystem);
  engine.register(roomSystem);
  engine.register(renderSystem);
}

function draw() {
  engine.update(deltaTime);
}

function keyPressed() {
  inputSystem.onKeyPressed?.(key, keyCode);
}

function keyReleased() {
  if (key === 'A' || key === 'a') player.intent.left = false;
  if (key === 'D' || key === 'd') player.intent.right = false;
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.keyReleased = keyReleased;
