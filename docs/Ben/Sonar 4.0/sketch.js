let walls = [];
let pulses = [];
let player;
let resolution = 10;

function setup() {
  createCanvas(800, 800);

  let cols = width / resolution;
  let rows = height / resolution;
  let xOffset = 0;

  //Generate maze
  for (let y = 0; y < rows; y++) {
    let pathCentre = map(noise(xOffset), 0, 1, 0, width);

    for (let x = 0; x < cols; x++) {
      let xPos = x * resolution;
      let yPos = y * resolution;
      let d = dist(xPos, yPos, pathCentre, yPos);

      if (d > 101) {
        walls.push(new Wall(xPos, yPos, resolution, resolution));
      }
    }
    xOffset += 0.1;
  }

  let startX = map(noise(xOffset - 0.1), 0, 1, 0, width);
  player = new Player(startX, height - 30);
}

function draw() {
  background(10, 15, 25);

  player.update(deltaTime);
  player.show();

  for (let i = pulses.length - 1; i >= 0; i--) {
    let p = pulses[i];
    p.update(deltaTime);
    p.show();

    if (p.isFinished()) {
      pulses.splice(i, 1);
    }
  }

  for (let wall of walls) {
    wall.update(deltaTime);
    wall.show();
  }

  fill(255);
  noStroke();
  textSize(14);
  text("WASD to Move. Press 'P' to Sonar.", 10, 20);
}

function keyPressed() {
  if (key === "p" || key === "P") {
    pulses.push(new Pulse(player.x, player.y));
  }
}

//Player class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 12;
    this.speed = 0.15;
  }

  update(dt) {
    let dx = 0;
    let dy = 0;

    if (keyIsDown(87)) dy -= 1; // W
    if (keyIsDown(83)) dy += 1; // S
    if (keyIsDown(65)) dx -= 1; // A
    if (keyIsDown(68)) dx += 1; // D

    if (dx !== 0 || dy !== 0) {
      let len = sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    let moveX = dx * this.speed * dt;
    this.x += moveX;
    this.checkCollisions(true);

    let moveY = dy * this.speed * dt;
    this.y += moveY;
    this.checkCollisions(false);

    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    this.y = constrain(this.y, this.size / 2, height - this.size / 2);
  }

  //AABB collisions
  checkCollisions(horizontal) {
    for (let wall of walls) {
      // Check if player bounding box overlaps wall
      if (
        this.x + this.size / 2 > wall.x &&
        this.x - this.size / 2 < wall.x + wall.w &&
        this.y + this.size / 2 > wall.y &&
        this.y - this.size / 2 < wall.y + wall.h
      ) {
        //For overlap
        if (horizontal) {
          if (this.x < wall.x) this.x = wall.x - this.size / 2;
          else this.x = wall.x + wall.w + this.size / 2;
        } else {
          if (this.y < wall.y) this.y = wall.y - this.size / 2;
          else this.y = wall.y + wall.h + this.size / 2;
        }
      }
    }
  }

  show() {
    fill(255, 100, 100);
    noStroke();
    circle(this.x, this.y, this.size);
  }
}

//Pulse class
class Pulse {
  constructor(x, y) {
    this.particles = [];
    let numRays = 360;
    this.speed = 0.2;

    for (let i = 0; i < numRays; i++) {
      let angle = radians(i);
      this.particles.push({
        pos: createVector(x, y),
        vel: p5.Vector.fromAngle(angle).mult(this.speed),
        life: 255,
      });
    }
  }

  update(dt) {
    for (let p of this.particles) {
      if (p.life <= 0) continue;

      p.life -= 0.2 * dt;

      let moveStep = p5.Vector.mult(p.vel, dt);
      let nextPos = p5.Vector.add(p.pos, moveStep);

      for (let wall of walls) {
        if (
          nextPos.x >= wall.x &&
          nextPos.x <= wall.x + wall.w &&
          nextPos.y >= wall.y &&
          nextPos.y <= wall.y + wall.h
        ) {
          wall.illuminate();

          p.life = 0;
          break;
        }
      }
      
      if (p.life > 0) {
        p.pos = nextPos;
      }
    }
  }

  show() {
    strokeWeight(2);
    for (let p of this.particles) {
      if (p.life > 0) {
        stroke(100, 255, 100, p.life);
        point(p.pos.x, p.pos.y);
      }
    }
  }

  isFinished() {
    return this.particles.every((p) => p.life <= 0);
  }
}
// Wall class
class Wall {
  constructor(x, y, w, h) {
    this.x = x;
    y = y;
    this.y = y;
    this.w = w;
    this.h = h;
    this.alpha = 0;
  }

  illuminate() {
    this.alpha = 255;
  }

  update(dt) {
    if (this.alpha > 0) this.alpha -= 0.1 * dt;
  }

  show() {
    if (this.alpha > 1) {
      noStroke();
      fill(40, 60, 80, this.alpha);
      rect(this.x, this.y, this.w, this.h);
      stroke(100, 200, 220, this.alpha);
      strokeWeight(1);
      noFill();
      rect(this.x, this.y, this.w, this.h);
    }
  }
}