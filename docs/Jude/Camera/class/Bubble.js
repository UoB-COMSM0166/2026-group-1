// For bubbles following submarine
// Author: Ben
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
