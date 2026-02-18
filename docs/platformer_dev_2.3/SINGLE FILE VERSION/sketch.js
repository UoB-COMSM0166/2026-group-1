/*
========================================
PLATFORMER V2.3 (SINGLE-FILE)
AUTHOR: Georgia Sweeny
Refactored from modular version to run in p5.js Web Editor
========================================
*/

//======================
// CONFIG
//======================
const INPUT = {
  A_KEY: 65,
  D_KEY: 68,
  S_KEY: 83,
  ARROW_LEFT_KEY: 37,
  ARROW_RIGHT_KEY: 39,
  JUMP_KEY: ['W', 'w'],
  TOGGLE_TORCH_KEY: ['L', 'l']
};

const CANVAS = {
  WIDTH: 800,
  HEIGHT: 512
};

const PLAYER = {
  WIDTH: 30,
  HEIGHT: 70,
  START_X: 400,
  START_Y: 10,
  JUMP_POWER: 25,
  MOVE_SPEED: 5,
  FALL_SPEED: 2
};

const POWER = {
  MAX_POWER: 100,
  CURRENT_POWER: 100,
  LOW_POWER_THRESHOLD: 0.15
};

const TORCH = {
  RADIUS: 200,
  FLICKER_POWER_THRESHOLD: 0.15,
  DRAIN_RATE: 1
};

const GAME = {
  GROUND_Y: 429
};

//======================
// ENGINE (SINGLE LOOP)
//======================
class Engine {
  constructor() {
    this.systems = [];
  }

  register(system) {
    this.systems.push(system);
  }

  update(deltaTime) {
    for (const s of this.systems) {
      if (s.update) s.update(deltaTime);
    }

    for (const s of this.systems) {
      if (s.draw) s.draw();
    }
  }
}

//======================
// POWER SYSTEM
//======================
class PowerSystem {
  constructor(config = POWER) {
    this.maxPower = config.MAX_POWER;
    this.current = config.CURRENT_POWER;
    this.lowPowerThreshold = config.LOW_POWER_THRESHOLD;
  }

  drain(rate, deltaTime) {
    this.current -= rate * (deltaTime / 1000);
    this.current = Math.max(0, Math.min(this.current, this.maxPower));
  }

  isEmpty() {
    return this.current <= 0;
  }

  isLow(threshold = this.lowPowerThreshold) {
    return this.current <= this.maxPower * threshold;
  }

  getPercent() {
    return this.current / this.maxPower;
  }
}

//======================
// TORCH SYSTEM
//======================
class Torch {
  constructor(config) {
    this.radius = config.RADIUS;
    this.flickerTimer = 0;
    this.isOn = false;
    this.flickerSpeed = 0.01;
    this.flickerThreshold = config.FLICKER_POWER_THRESHOLD;
  }

  tryToggle(hasPower) {
    if (!this.isOn && hasPower) {
      this.isOn = true;
      this.flickerTimer = 0;
    } else {
      this.isOn = false;
      this.flickerTimer = 0;
    }
  }

  update(deltaTime) {
    if (!this.isOn) return;
    this.flickerTimer += deltaTime;
  }

  isVisible(powerPercent) {
    if (!this.isOn) return false;
    if (powerPercent > this.flickerThreshold) return true;

    const t = this.flickerTimer * this.flickerSpeed;
    return sin(t) > 0;
  }
}

function createTorchSystem(torch, player, { drainRate = TORCH.DRAIN_RATE } = {}) {
  return {
    update(deltaTime) {
      torch.update(deltaTime);

      if (player.intent && player.intent.toggleTorch) {
        torch.tryToggle(!player.power.isEmpty());
        player.intent.toggleTorch = false;
      }

      if (torch.isOn) {
        player.power.drain(drainRate, deltaTime);
        if (player.power.isEmpty()) torch.isOn = false;
      }
    }
  };
}

//======================
// INPUT SYSTEM
//======================
function createInputSystem(player) {
  return {
    update() {
      player.intent.left =
        keyIsDown(INPUT.A_KEY) || keyIsDown(INPUT.ARROW_LEFT_KEY);

      player.intent.right =
        keyIsDown(INPUT.D_KEY) || keyIsDown(INPUT.ARROW_RIGHT_KEY);
    },

    onKeyPressed(key) {
      if (INPUT.JUMP_KEY.includes(key) && player.onGround) {
        player.intent.jump = true;
      }

      if (INPUT.TOGGLE_TORCH_KEY.includes(key)) {
        player.intent.toggleTorch = true;
      }
    }
  };
}

//======================
// PLAYER SYSTEM
//======================
function createPlayerSystem(player) {
  return {
    update() {
      const speed = PLAYER.MOVE_SPEED;
      if (player.intent.left) player.x -= speed;
      if (player.intent.right) player.x += speed;

      if (player.intent.jump && player.onGround) {
        player.vy = -player.jumpPower;
        player.onGround = false;
      }
      player.intent.jump = false;
    }
  };
}

//======================
// PHYSICS SYSTEM
//======================
function createPhysicsSystem(player, platforms, { fallSpeed = PLAYER.FALL_SPEED, groundY = GAME.GROUND_Y } = {}) {
  function isLandingOnPlatform(player, platform) {
    return (
      player.x + player.w / 2 > platform.x - platform.w / 2 &&
      player.x - player.w / 2 < platform.x + platform.w / 2 &&
      player.y + player.h / 2 >= platform.y - platform.h / 2 &&
      player.y + player.h / 2 <= platform.y - platform.h / 2 + player.vy &&
      player.vy > 0
    );
  }

  function applyGravity() {
    player.onGround = false;
    player.vy += fallSpeed;
    player.y += player.vy;

    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }

    for (const p of platforms) {
      if (isLandingOnPlatform(player, p)) {
        player.y = p.y - p.h / 2 - player.h / 2;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  return {
    update() {
      applyGravity();
    }
  };
}

//======================
// RENDER SYSTEM
//======================
function createRenderSystem({ player, platforms, torch, darknessLayer }) {
  function drawBackground() {
    background(20, 30, 40);
    image(forrest, 0, 0, width, height); 
    //grass
    stroke(60, 100, 115);
    fill(90, 130, 145);
    rect(width/2, 512, width, 96);
  }

  function drawPlatforms(platforms) {
    stroke(130, 100, 60);
    strokeWeight(2);
    fill(160, 130, 90);
    for (let i = 0; i < platforms.length; i++) {
      rect(platforms[i].x, platforms[i].y, 
           platforms[i].w, platforms[i].h)
    }
  }

  function drawPlayer(player) {
    stroke(150, 0, 25);
    fill(225, 0, 50);
    rect(player.x, player.y, player.w, player.h);
  }

  function drawDarknessBase() {
  darknessLayer.clear();
  darknessLayer.push(); //draw mode changes, push()/pop() stop data leaks
  darknessLayer.rectMode(CORNER);
  darknessLayer.noStroke();
  darknessLayer.fill(0, 255); // darkness strength
  darknessLayer.rect(0, 0, darknessLayer.width, darknessLayer.height);
  darknessLayer.pop();
}

  function applyTorchLight(x, y, radius) {
  darknessLayer.push();
  darknessLayer.erase();
  darknessLayer.circle(x, y, radius);
  darknessLayer.noErase();
  darknessLayer.pop();
}
  function drawTorchMask(player, torch, darknessLayer) {
    drawDarknessBase();

    if (torch.isVisible(player.power.getPercent())) {
      applyTorchLight(player.x, player.y, torch.radius);
    }

    image(darknessLayer, 0, 0);
  }
  
  function drawPowerMeter() {
  let powerPercentage = Math.round(player.power.getPercent() * 100);
  
  push();
  textAlign(RIGHT);
  fill(0, 200, 0); //green
  text(`Power: ${powerPercentage}%`, 780, 32);
  pop();
}
  
  function drawInstructions() {
  //controls
  stroke(0);
  strokeWeight(2);
  fill(255);
  text('A/D: Left/Right\nW: Jump\nL: Toggle Torch', 16, 32);
  describe('The text "A/D: Left/Right, W: Jump, L: Toggle Torch" written in white');
}
  
  function drawUI(player) {
    drawInstructions();
    drawPowerMeter();
  }

  return {
    draw() {
      drawBackground();
      drawPlatforms(platforms);
      drawPlayer(player);
      drawTorchMask(player, torch, darknessLayer);
      drawUI(player);
    }
  };
}

//======================
// PRELOAD
//======================
let forrest;

function preload() {
  forrest = loadImage('assets/forrest.png');
}
//======================
// MAIN SETUP
//======================
let engine;
let darknessLayer;

let player;
let torch;
let platforms;

let inputSystem;
let playerSystem;
let physicsSystem;
let torchSystem;
let renderSystem;

function setup() {
  createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);

  darknessLayer = createGraphics(CANVAS.WIDTH, CANVAS.HEIGHT);

  platforms = [
    { x: 200, y: 400, w: 200, h: 32 },
    { x: 350, y: 256, w: 32, h: 32 },
    { x: 500, y: 156, w: 32, h: 32 }
  ];

  player = {
    x: PLAYER.START_X,
    y: PLAYER.START_Y,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
    vy: 0,
    jumpPower: PLAYER.JUMP_POWER,
    onGround: false,
    power: new PowerSystem(),
    intent: { left: false, right: false, jump: false, toggleTorch: false }
  };

  torch = new Torch(TORCH);

  inputSystem = createInputSystem(player);
  playerSystem = createPlayerSystem(player);
  physicsSystem = createPhysicsSystem(player, platforms, { fallSpeed: PLAYER.FALL_SPEED, groundY: GAME.GROUND_Y });
  torchSystem = createTorchSystem(torch, player, { drainRate: TORCH.DRAIN_RATE });
  renderSystem = createRenderSystem({ player, platforms, torch, darknessLayer });

  engine = new Engine();
  engine.register(inputSystem);
  engine.register(playerSystem);
  engine.register(physicsSystem);
  engine.register(torchSystem);
  engine.register(renderSystem);
}

function draw() {
  engine.update(deltaTime);
}

function keyPressed() {
  inputSystem.onKeyPressed(key);
}

function keyReleased() {
  if (key === 'A' || key === 'a') player.intent.left = false;
  if (key === 'D' || key === 'd') player.intent.right = false;
}
