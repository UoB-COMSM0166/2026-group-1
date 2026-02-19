let walls = [];
let pulses = [];
let resolution = 10;

function setup() {
  createCanvas(800, 800);

  let cols = width / resolution;
  let rows = height / resolution;
  let xOffset = 0;

  for (let y = 0; y < rows; y++) {
    let pathCentre = map(noise(xOffset), 0, 1, 1, width);

    for (let x = 0; x < cols; x++) {
      let xPos = x * resolution;
      let yPos = y * resolution;
      let d = dist(xPos, yPos, pathCentre, yPos);

      if (d > 120) {
        walls.push(new Wall(xPos, yPos, resolution, resolution));
      }
    }
    xOffset += 0.1;
  }
}

function draw() {
  background(10, 15, 25);

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
  text("Press 'F' to Emit Bouncing Sonar Pulse...", 10, 20);
}

function keyPressed() {
  if (key === "f" || key === "F") {
    // Spawns at mouse for testing but I will change this to player.x, player.y later
    pulses.push(new Pulse(mouseX, mouseY));
  }
}


//Creates the radar pulse
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

      // Calculate where the particle is trying to go next
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

//Show the particles spread
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

class Wall {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.alpha = 0;
  }

  illuminate() {
    this.alpha = min(this.alpha + 80, 255);
  }

  update(dt) {
    if (this.alpha > 0) {
      this.alpha -= 0.1 * dt;
    }
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
