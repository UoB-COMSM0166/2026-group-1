/*
========================================
MAIN (SKETCH CANVAS)
========================================
VERSION: 2.3
SYSTEM: Main Engine / p5.js Canvas
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Sets up p5 canvas and graphics layers
- Initializes entities and systems
- Wires Engine update loop
- Bridges p5 input to Input System

RULES:
- This file is the only one that knows about p5.js globals
  (createCanvas, keyPressed, etc.).
- Everything else — systems, entities — is pure logic / data / rendering.
========================================
RESPONSIBILITIES:

========================================
*/

//======================================
// MAIN
//======================================
//--------------------------------------
// IMPORTS
//--------------------------------------
import { Engine } from "./gameEngine/engine.js";
import { createInputSystem } from "./systems/inputSystem.js";
import { createPlayerSystem } from "./systems/playerSystem.js";
import { createPhysicsSystem } from "./systems/physicsSystem.js";
import { createTorchSystem } from "./systems/torchSystem.js";
import { createRenderSystem } from "./systems/renderSystem.js";
import { CANVAS, PLAYER, GAME, TORCH } from "./config.js";
import { createPowerSystem, PowerSystem } from "./systems/powerSystem.js"; //add createPowerSystem
import { Torch } from "./systems/torchSystem.js";

//--------------------------------------
// GLOBALS
//--------------------------------------
let engine;
let darknessLayer;

let player, torch;
let platforms = [
  { x: 200, y: 400, w: 200, h: 32 },
  { x: 350, y: 256, w: 32, h: 32 },
  { x: 500, y: 156, w: 32, h: 32 },
];

let inputSystem, playerSystem, physicsSystem, torchSystem, renderSystem;

//--------------------------------------
// SETUP
//--------------------------------------
window.setup = function () {
  //was function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);

  // Offscreen graphics layer for darkness / lighting
  darknessLayer = createGraphics(CANVAS.WIDTH, CANVAS.HEIGHT);

  //---Entities---//
  player = {
    x: PLAYER.START_X,
    y: PLAYER.START_Y,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
    vy: 0,
    jumpPower: PLAYER.JUMP_POWER,
    onGround: false,
    power: new PowerSystem(),
    intent: { left: false, right: false, jump: false, toggleTorch: false },
  };

  torch = new Torch(TORCH);

  //---Systems---//
  inputSystem = createInputSystem(player, torch);
  playerSystem = createPlayerSystem(player);
  physicsSystem = createPhysicsSystem(player, platforms, {
    fallSpeed: PLAYER.FALL_SPEED,
    groundY: GAME.GROUND_Y,
  });
  torchSystem = createTorchSystem(torch, player, {
    drainRate: TORCH.DRAIN_RATE,
  });
  renderSystem = createRenderSystem({
    player,
    platforms,
    torch,
    darknessLayer,
  });

  //---Engine---//
  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(torchSystem);
  engine.register(renderSystem);
  engine.register(PowerSystem); // added this line

  // Start the update loop
  requestAnimationFrame(engine.update.bind(engine));
};

//--------------------------------------
// p5.js INPUT BRIDGE
//--------------------------------------
window.keyPressed = function () {
  // was function keyPressed() {
  inputSystem.onKeyPressed?.(key);
};

// Optional: keyReleased() if you want to reset intent flags
window.keyReleased = function () {
  // was function keyReleased() {
  if (key === "A" || key === "a") player.intent.left = false;
  if (key === "D" || key === "d") player.intent.right = false;
  // toggleTorch and jump are handled as discrete actions
};
//======================================
// END
//======================================
