//Author: Ben
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

      for (let wall of currentMap.walls) {
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
