let walls = [];
let pulses = [];
let bubbles = [];
let player;
let resolution = 10;
let artifactImg;
let items = [];

// Declare map, camera, and UI globally
let mapWidth = 2400;
let mapHeight = 2400;
let myCamera;
let currentMap;
let myUI;

function preload() {
  // Replace with your exact file name
  artifactImg = loadImage("artifact.png");
}

function setup() {
  createCanvas(800, 800);
  myUI = new UI();

  currentMap = new GameMap(2400, 2400, 40);
  currentMap.generate();

  player = new Player(currentMap.spawnX, 2400 - 80);
  goal = new Artifact(currentMap.goalX, currentMap.goalY, artifactImg);

  myCamera = new Camera(width, height);
  myCamera.x = player.x - width / 2;
  myCamera.y = player.y - height / 2;
}

function draw() {
  background(5, 10, 20);

  // 1. ONLY run the game physics if we hit start
  if (myUI.gameState === "PLAYING") {
    runGameLogic();
  }

  // 2. ALWAYS draw the UI last so it sits on top of everything
  myUI.render();
}

function keyPressed() {
  // Prevent firing sonar on the Start Screen
  if (myUI.gameState === "PLAYING") {
    if (key === "p" || key === "P") {
      pulses.push(new Pulse(player.x, player.y));
    }
  }
}

function mousePressed() {
  myUI.checkClick();
}

// game code
function runGameLogic() {
  myCamera.update(player, mapWidth, mapHeight);

  push();
  translate(-myCamera.x, -myCamera.y);

  player.update(deltaTime);
  player.show();

  goal.update(deltaTime);
  goal.show();

  if (goal.checkCollision(player)) {
    myUI.gameState = "LEVEL_COMPLETE";
  }

  for (let i = pulses.length - 1; i >= 0; i--) {
    let p = pulses[i];
    p.update(deltaTime);
    p.show();
    if (p.isFinished()) pulses.splice(i, 1);
  }

  currentMap.show();

  // --- AMBIENT BUBBLE SPAWNER ---
  if (random(1) < 0.01) {
    let spawnX = random(myCamera.x, myCamera.x + width);
    let spawnY = myCamera.y + height + 20;

    // Check if the spawn point is inside water (not in a wall)
    let insideWall = false;
    for (let wall of currentMap.walls) {
      if (
        spawnX > wall.x &&
        spawnX < wall.x + wall.w &&
        spawnY > wall.y &&
        spawnY < wall.y + wall.h
      ) {
        insideWall = true;
        break;
      }
    }

    // Only spawn if it's in the water!
    if (!insideWall) {
      bubbles.push(new AmbientBubble(spawnX, spawnY));
    }
  }

  // --- BUBBLE UPDATE & POPPING ---
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.update(deltaTime);
    b.show();

    // Check if bubble floated INTO a wall
    for (let wall of currentMap.walls) {
      if (
        b.x > wall.x &&
        b.x < wall.x + wall.w &&
        b.y > wall.y &&
        b.y < wall.y + wall.h
      ) {
        b.life = 0;
        break;
      }
    }

    if (b.life <= 0) {
      bubbles.splice(i, 1);
    }
  }

  // --- ITEMS (The Power Pickups) ---
  for (let item of items) {
    item.show();
  }
  player.collect(items);

  pop();
}
