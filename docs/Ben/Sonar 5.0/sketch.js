let walls = [];
let pulses = [];
let bubbles = [];
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
      let d = abs(xPos - pathCentre);

      if (d > 90) {
        walls.push(new Wall(xPos, yPos, resolution, resolution));
      }
    }
    xOffset += 0.04;
  }

  let startX = map(noise(xOffset - 0.04), 0, 1, 0, width);
  player = new Player(startX, height - 30);
}

function draw() {
  background(5, 10, 20);

  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.update(deltaTime);
    b.show();
    if (b.life <= 0) {
      bubbles.splice(i, 1);
    }
  }

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
  text("WASD to Move. Press 'P' for Sonar Ping.", 10, 20);
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
    this.size = 20;
    this.speed = 0.15;
    this.facing = 1;
  }

  update(dt) {
    let dx = 0;
    let dy = 0;

    if (keyIsDown(87)) dy -= 1;
    if (keyIsDown(83)) dy += 1;
    if (keyIsDown(65)) dx -= 1;
    if (keyIsDown(68)) dx += 1;

    if (dx !== 0) {
      this.facing = dx > 0 ? 1 : -1;
    }

    if (dx !== 0 || dy !== 0) {
      let len = sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      if (random() < 0.4) {
        let backX = this.x - this.facing * this.size * 0.8;
        bubbles.push(new Bubble(backX, this.y));
      }
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
    push();
    translate(this.x, this.y);
    scale(this.facing, 1);

    fill(120);
    noStroke();
    rect(-2, -this.size * 0.9, 4, this.size * 0.6);
    rect(-2, -this.size * 0.9, 8, 4);

    fill(150);
    noStroke();
    triangle(
      -this.size / 2,
      0,
      -this.size,
      -this.size / 3,
      -this.size,
      this.size / 3
    );

    fill(255, 200, 50);
    ellipse(0, 0, this.size * 1.2, this.size * 0.8);

    fill(100, 220, 255);
    circle(this.size * 0.2, 0, this.size * 0.4);

    pop();
  }
}

//For bubbles following submarine
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y + random(-4, 4);
    this.size = random(2, 6);
    this.life = 200;

    this.vx = random(-0.02, 0.02);
    this.vy = random(-0.08, -0.03);
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= 0.15 * dt;
  }

  show() {
    noStroke();
    fill(150, 220, 255, this.life);
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
        stroke(0, 220, 0, p.life);
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
    this.y = y;
    this.w = w;
    this.h = h;
    this.alpha = 0;

    this.rockPoints = [];
    let cx = this.x + this.w / 2;
    let cy = this.y + this.h / 2;

    for (let a = 0; a < TWO_PI; a += PI / 4) {
      let r = (this.w / 2) * random(0.7, 1.6);
      this.rockPoints.push({
        px: cx + cos(a) * r,
        py: cy + sin(a) * r,
      });
    }
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
      fill(20, 25, 35, this.alpha);
      rect(this.x, this.y, this.w, this.h, 3);

      fill(40, 50, 65, this.alpha);
      beginShape();
      for (let pt of this.rockPoints) {
        vertex(pt.px, pt.py);
      }
      endShape(CLOSE);
    }
  }
}
