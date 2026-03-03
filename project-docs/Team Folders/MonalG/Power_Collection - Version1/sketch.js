/*
VERSION: 1.0
SYSTEM: Power Collection / Collision
AUTHOR: Monal
DESCRIPTION:
- ARROW KEYS MOVES THE PLAYER(UP, DOWN, RIGHT, LEFT)
- Player is Blue Square
- Positive = +5 power (green circles)
- Negative = -5 power (red circles)
- Player collects positive and negative elements
- Power is clamped between 0 and maxPower(100)

*/

//======================================
// GLOBAL DATA
//======================================

//---PLAYER---//
var player = {
  x: 300,
  y: 200,
  size: 30,
  speed: 3,

  maxPower: 100,
  power: 100
};

//---ITEMS---//
var positives = [];
var negatives = [];

//======================================
// SETUP
//======================================

function setup() {
  createCanvas(600, 400);
  rectMode(CENTER);
  textSize(16);

  //spawn elements
  for (let i = 0; i < 5; i++) positives.push(createItem());
  for (let i = 0; i < 5; i++) negatives.push(createItem());
}

//======================================
// MAIN LOOP
//======================================

function draw() {
  //UPDATE
  handleMovementInput();
  handleCollisions();

  //DRAW
  drawBackground();
  drawItems();
  drawPlayer();
  drawPowerMeter();
}

//======================================
// UPDATE LOGIC
//======================================

function handleMovementInput() {
  if (keyIsDown(LEFT_ARROW)) player.x -= player.speed;
  if (keyIsDown(RIGHT_ARROW)) player.x += player.speed;
  if (keyIsDown(UP_ARROW)) player.y -= player.speed;
  if (keyIsDown(DOWN_ARROW)) player.y += player.speed;

  //keep inside canvas
  player.x = constrain(player.x, player.size / 2, width - player.size / 2);
  player.y = constrain(player.y, player.size / 2, height - player.size / 2);
}

function handleCollisions() {
  checkItemArray(positives, true);
  checkItemArray(negatives, false);
}

function checkItemArray(arr, isPositive) {
  for (let i = arr.length - 1; i >= 0; i--) {
    let item = arr[i];

    let d = dist(player.x, player.y, item.x, item.y);
    if (d < (player.size + item.size) / 2) {

      if (isPositive) {
        player.power += 5;
      } else {
        player.power -= 5;
      }

      //clamp power
      player.power = constrain(player.power, 0, player.maxPower);

      //respawn item
      arr[i] = createItem();
    }
  }
}

//======================================
// ITEM CREATION
//======================================

function createItem() {
  return {
    x: random(20, width - 20),
    y: random(20, height - 20),
    size: 20
  };
}

//======================================
// DRAW FUNCTIONS
//======================================

function drawBackground() {
  background(30);
}

function drawItems() {
  //positives
  fill(0, 255, 100);
  noStroke();
  for (let p of positives) {
    ellipse(p.x, p.y, p.size);
  }

  //negatives
  fill(255, 60, 60);
  for (let n of negatives) {
    ellipse(n.x, n.y, n.size);
  }
}

function drawPlayer() {
  stroke(0);
  fill(0, 150, 255);
  rect(player.x, player.y, player.size, player.size);
}

function drawPowerMeter() {
  let percent = Math.round((player.power / player.maxPower) * 100);

  fill(255);
  noStroke();
  textAlign(LEFT);
  text(`Power: ${percent}%`, 20, 30);

  //bar background
  fill(80);
  rectMode(CORNER);
  rect(20, 40, 200, 16);

  //bar fill
  fill(0, 255, 150);
  let w = map(player.power, 0, player.maxPower, 0, 200);
  rect(20, 40, w, 16);

  rectMode(CENTER);
}
