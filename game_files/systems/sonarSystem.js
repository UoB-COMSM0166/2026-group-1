/*
========================================
VERSION: 1.0
SYSTEM: SONAR SYSTEM
AUTHOR: BEN MOUNCE
DESCRIPTION:
- Experimenting with the sonar system which creates a pulse from the
  point where the user has clicked on the screen. Within the sonar area
  it reveals and then fades out the walls to the maze so the player can
  use the pulse to see where to go.

RULES:
- Render system must not modify game state
- Render system must only read from entities and systems
- No timing or logic updates in draw functions
========================================
DESIGN GOALS:
========================================
RESPONSIBILITIES:

DEPENDENCIES:

USAGE:

========================================
NOTES:
========================================
TODO / LIMITATIONS:
========================================
*/

//======================================
// SONAR SYSTEM
//======================================

//This code makes a maze from the bottom of the screen to the top which emits a sonar pulse to uncover the route out the maze

let walls = [];
let pulses = [];

//size of each wall block
let resolution = 20;

function setup() {
  createCanvas(600, 600);

  let cols = width / resolution;
  let rows = height / resolution;

  let xOffset = 0;

  for (let y = 0; y < rows; y++) {
    let pathCentre = map(noise(xOffset), 0, 1, 1, width);

    for (let x = 0; x < cols; x++) {
      let xPos = x * resolution;
      let yPos = y * resolution;

      let d = dist(xPos, yPos, pathCentre, yPos);

      if (d > 70) {
        walls.push(new Wall(xPos, yPos, resolution, resolution));
      }
    }
    xOffset += 0.1;
  }
}

function draw() {
  background(10, 15, 25);

  // We loop backwards so we can delete finished pulses without errors
  for (let i = pulses.length - 1; i >= 0; i--) {
    let p = pulses[i];
    p.update();
    p.show();

    // Check if pulse hits any wall
    for (let wall of walls) {
      wall.checkPulse(p);
    }

    if (p.isFinished()) {
      // Remove pulse from array to save memory
      pulses.splice(i, 1);
    }
  }

  // 3. Handle Walls (Drawing and Fading)
  for (let wall of walls) {
    wall.update();
    wall.show();
  }

  // UI Instruction
  fill(255);
  noStroke();
  textSize(14);
  text("Click to Emit Sonar Pulse. Find the path out...", 10, 20);
}

function mousePressed() {
  // Spawn a new pulse at mouse location
  pulses.push(new Pulse(mouseX, mouseY));
}

class Pulse {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 1;
    // How fast sound travels
    this.speed = 5;
    // Opacity of the ring itself
    this.life = 255;
  }

  update() {
    this.radius += this.speed;
    // Fade the ring out slowly
    this.life -= 5;
  }

  show() {
    noFill();
    // Light blue sonar color
    stroke(100, 255, 100, this.life);
    strokeWeight(2);
    circle(this.x, this.y, this.radius * 2);
  }

  isFinished() {
    // Kill pulse if it's transparent or too huge
    return this.life <= 0;
  }
}

class Wall {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    // Starts invisible
    this.alpha = 0;
  }

  checkPulse(pulse) {
    // Calculate distance between Wall Center and Pulse Center
    let centreX = this.x + this.w / 2;
    let centreY = this.y + this.h / 2;
    let d = dist(pulse.x, pulse.y, centreX, centreY);

    // check if the distance is roughly equal to the radius
    // We use a "buffer" of 15 pixels so it doesn't have to be pixel perfect
    if (d < pulse.radius && d > pulse.radius - 20) {
      this.alpha = constrain(this.alpha + 50, 0, 255);
    }
  }

  update() {
    // Always fade to black
    if (this.alpha > 0) {
      // make walls stay visible longer/shorter
      this.alpha -= 5.5;
    }
  }

  show() {
    if (this.alpha > 1) {
      // Draw the rect with the current Alpha
      noStroke();
      // Colour of sea
      fill(40, 60, 80, this.alpha);
      rect(this.x, this.y, this.w, this.h);

      stroke(100, 200, 220, this.alpha);
      strokeWeight(1);
      noFill();
      rect(this.x, this.y, this.w, this.h);
    }
  }
}
//======================================
// END
//======================================