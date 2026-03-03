/*
========================================
VERSION: 2.2
SYSTEM: PowerSystem
AUTHOR: Georgia Sweeny
DESCRIPTION:
- UPDATED STRUCTURE
- Added powerSystem to manage resource more efficiently - owns power logic
- Player owns instance of power - has a powerSystem
- Future proofs structure compliance when other things are
  implemented that will effect or use power
- Updated torch.isVisible() to use sine instead of modulo for smoother flicker feel

RULES:
- No drawing in update functions
- No state changes in draw functions

- [POWER SYSTEM] = resource logic
- [PLAYER] = entity data + resources
- [TORCH] = behavior + timing
- [PHYSICS] = movement & collision resolution
- [RENDERER] = drawing only (read-only)
- [INPUT] = events & intent


- Maintain abstaction for function arguments inside classes
  - e.g. DO -> torch.tryToggle(!player.power.isEmpty()) 
    NOT -> torch.tryToggle(player.power)
  - torch remains ignorant of what power is, just knows it exists (name independent)
========================================
NOTES:
  deltaTime = time since last frame (ms)
    - / 1000 converts it to seconds
    - deltaTime makes behavior independent of FPS
    
    Power drain when the torch is on follows this pattern:
    ***value -= rate * deltaTimeInSeconds;*** 

    - deltaTime / 1000 = elapsed (seconds)
    - Subtracting that every frame adds up to 1 unit per second
    ***player.power -= deltaTime / 1000***
========================================
*/

//======================================
// GLOBAL DATA
//======================================

//---DEFAULT GAME STATE---//
var state = 0; //tracks game state to run

//---GRAVITY---//
var fallSpeed = 2;
var minHeight = 429; //height of ground

//======================================
// POWER SYSTEM (CLASS)
//======================================
// power system logic only

class PowerSystem {
  constructor() {
    this.maxPower = 100;
    this.current = 100;
  }
  
  drain(rate, deltaTime) {
    this.current -= rate * (deltaTime / 1000);
    this.current = constrain(this.current, 0, this.maxPower);
  }
  
  isEmpty() {
    return this.current <= 0;
  }

  isLow(threshold = 0.15) {
    return this.current <= this.maxPower * threshold;
  }

  getPercent() {
    return this.current / this.maxPower;
  }
}

//======================================
// POWER SYSTEM - END
//======================================

//======================================
// PLAYER (OBJECT)
//======================================
// things belonging to the player

var player = {
  //coordinates
  x: 400,
  y: 10,
  //dimensions
  w: 30,
  h: 70,
  
  //jump
  vy: 2,           //vertical velocity
  jumpPower: 25,   //max jump height ≈ (jumpPower²) / (2 * fallSpeed)
  jumpCounter: 0,
  
  //resources
  power: new PowerSystem(),
  
  //player states
  onGround: false
};
//======================================
// PLAYER - END
//======================================

//======================================
// TORCH (CLASS)
//======================================
// torch specific behaviour only

class Torch {
  constructor() {
    this.radius = 200;
    this.flickerTimer = 0;
    this.isOn = false;
  }

  tryToggle(hasPower) {
  if (!this.isOn && hasPower) {
    this.isOn = true;
    this.flickerTimer = 0;
  }
  else {
    this.isOn = false;
    this.flickerTimer = 0;
  }
}
  
  //updates torch flicker timing
  update(deltaTime) {
    if (!this.isOn) return;
    this.flickerTimer += deltaTime;
  }
  //low-power flicker logic (is light visable?)
  isVisible(powerPercent) {
    if (!this.isOn) return false;
    if (powerPercent > 0.15) return true;

    let t = this.flickerTimer * 0.01;
    let wave = sin(t);
    return wave > 0;
  }
}

// create torch object (instance of class)
let torch = new Torch();

//======================================
// TORCH - END
//======================================

//---PLATFORMS---//
// later on we should implement loading level/world data in
var platforms = [
  { x: 200, y: 400, w: 200, h: 32 },
  { x: 350, y: 256, w: 32, h: 32 }, 
  { x: 500, y: 156, w: 32, h: 32 }
];

//---IMPORTED ASSETS---//
let forrest;

//---GRAPHICS (CANVASES)---//
let darknessLayer;

//======================================
// PRELOAD ASSETS
//======================================

function preload() {
  forrest = loadImage('assets/forrest.png');
}

//======================================
// MAIN CANVAS SETUP & GRAPHICS
//======================================

function setup() {
  createCanvas(800, 512); //screen size
  rectMode(CENTER);
  textSize(20);
  textAlign(LEFT);
  
  darknessLayer = createGraphics(width, height);
}

//======================================
// DRAW DISPATCHER (STATE SELECTION)
//======================================

function draw() {
  switch (state) {
    case 0:
      game();
      break;
    case 1:
      menu();
      break;
    case 3:
      paused();
      break;
  }
}

//======================================
// GAME STATES & FUNCTIONS
//======================================

//======================================
// STATE 0: GAME
//======================================
/* 
UPDATE ORDER:
   - Physics
     - gravity
     - movement
   - Input
   - Resources
     - power
   - Systems
     - Torch
  
DRAW ORDER:
  Bottom layer
  |
  Top layer 
*/

function game() {
  
//---UPDATE---//
  //PHYSICS
  applyGravity();
  handleMovementInput();
  
  //RESOURCES
  if (torch.isOn) player.power.drain(1, deltaTime);
  
  //SYSTEMS
  torch.update(deltaTime);
  if (player.power.isEmpty()) torch.isOn = false;
  
//---DRAW---//
  drawBackground();
  drawPlatforms();
  drawLevelInstructions();
  drawPlayer();
  drawTorchMask();
  drawUI();
}

//======================================
// STATE 1: MENU
//======================================
function menu() {
  
  //---UPDATE---//
  let temp;
  
  //---DRAW---//
}

//======================================
// STATE 3: PAUSED
//======================================
function paused() {
  
  //---UPDATE---//
  let temp;
  
  //---DRAW---//
}

//======================================
// UPDATE LOGIC (GAME SYSTEMS)
//======================================
// jump, torch, power, timers, etc.

//---MOVEMENT---//

//---JUMP---//
function handleJump() {
  if((key === 'w' || key === 'W') && player.onGround) {
    player.vy = -player.jumpPower;
    player.jumpCounter = 0;
    player.onGround = false;
  }
}

//---TORCH---//
function handleTorchInput() {
  if (key === 'l' || key === 'L') {
    torch.tryToggle(!player.power.isEmpty());
  }
}

//======================================
// PHYSICS (MOVEMENT & COLLISION)
//======================================
// gravity, velocity, landing checks

//---VERTICAL LANDING COLLISION---//
function isLandingOnPlatform(player, platform) {
  return (
    player.x + player.w / 2 > platform.x - platform.w / 2 &&
    player.x - player.w / 2 < platform.x + platform.w / 2 &&
    player.y + player.h / 2 >= platform.y - platform.h / 2 &&
    player.y + player.h / 2 <= platform.y - platform.h / 2 + player.vy &&
    player.vy > 0
  )
}

//---GRAVITY---//
function applyGravity(){
  player.onGround = false;
  
  //apply gravity
  player.vy += fallSpeed;
  player.y += player.vy;

  //ground collision
  if (player.y >= minHeight) {
    player.y = minHeight;
    player.vy = 0;
    player.onGround = true;
  }
  
  //platform collisions
  for (let p of platforms) {
    if (isLandingOnPlatform(player, p)) {
      player.y = p.y - p.h / 2 - player.h / 2;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }
}

//======================================
// RENDERER (DRAW HELPERS)
//======================================

//======================================
// LEVEL/WORLD
//======================================

//---BACKGROUND---//
function drawBackground() {
  //appearence
  /* sky blue - should never be visable as bg
  image is preloaded, prevents delay. */
  background(150, 230, 240);
  image(forrest, 0, 0, width, height) //BG image
  //grass
  stroke(60, 100, 115);
  fill(90, 130, 145);
  rect(width/2, 512, width, 96);
  //window frame
  noFill();
  stroke(0);
  strokeWeight(15);
  rect(width/2, height/2, width, height);
}

//---PLATFORMS---//
function drawPlatforms() {
  //draw platforms
  stroke(130, 100, 60);
  strokeWeight(2);
  fill(160, 130, 90);
  for (let i = 0; i < platforms.length; i++) {
    rect(platforms[i].x, platforms[i].y, 
         platforms[i].w, platforms[i].h)
  }
}

//---LEVEL INSTRUCTIONS---//
function drawLevelInstructions() {
  //in-game text
  line(155, 250, 155, 375)
  strokeWeight(1);
  fill(255, 255, 255);
  text('Max jump height ->', 150, 240);
  text('<- GOAL\nThis one is tricky ;)', 550, 140);
}


//======================================
// WORLD/LEVEL - END
//======================================

//---PLAYER---//
function drawPlayer(){
  //draw player
  stroke(150, 0, 25);
  fill(225, 0, 50); //red
  rect(player.x, player.y, player.w, player.h);
}

//======================================
// GRAPHICS/EFFECTS
//======================================

//---DARKNESS LAYER---//
function drawDarknessBase() {
  darknessLayer.clear();
  darknessLayer.push(); //draw mode changes, push()/pop() stop data leaks
  darknessLayer.rectMode(CORNER);
  darknessLayer.noStroke();
  darknessLayer.fill(0, 255); // darkness strength
  darknessLayer.rect(0, 0, darknessLayer.width, darknessLayer.height);
  darknessLayer.pop();
}

//---TORCH---//
//canvas uses different draw modes from main setup -> wrap with push/pop()
function applyTorchLight(x, y, radius) {
  darknessLayer.push();
  darknessLayer.erase();
  darknessLayer.circle(x, y, radius);
  darknessLayer.noErase();
  darknessLayer.pop();
}

//---DRAW TORCH/DARKNESS---//
function drawTorchMask() {
  drawDarknessBase();

  if (torch.isVisible(player.power.getPercent())) {
    applyTorchLight(player.x, player.y, torch.radius);
  }

  image(darknessLayer, 0, 0);
}

//======================================
// GRAPHICS/EFFECTS - END
//======================================

//======================================
// USER INTERFACE
//======================================

//---INSTRUCTIONS---//
function drawInstructions() {
  //controls
  stroke(0);
  strokeWeight(2);
  fill(255);
  text('A/D: Left/Right\nW: Jump\nL: Toggle Torch', 16, 32);
  describe('The text "A/D: Left/Right, W: Jump, L: Toggle Torch" written in white');
}

//---POWER BAR---//
function drawPowerMeter() {
  let powerPercentage = Math.round(player.power.getPercent() * 100)
  
  push();
  textAlign(RIGHT);
  fill(0, 200, 0); //green
  text(`Power: ${powerPercentage}%`, 780, 32);
  pop();
}
//---DRAW UI---//
function drawUI() {
  drawInstructions();
  drawPowerMeter();
}

//======================================
// INPUT EVENTS
//======================================

//---playerControls---//

//events
function keyPressed() {
  handleJump();
  handleTorchInput();
}

//states
function handleMovementInput(){
  //movement: left/right
  if(keyIsDown(65)) { 
    player.x -= 5; //A: move left
  }
  if(keyIsDown(68)) {
    player.x += 5; //D: move right
  }
}
