//Author: Ben
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.speed = 0.15;
    this.facing = 1;
    this.power = 100;
    this.maxPower = 100;
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

    this.x = constrain(this.x, this.size / 2, mapWidth - this.size / 2);
    this.y = constrain(this.y, this.size / 2, mapHeight - this.size / 2);
  }

  //AABB collisions
  checkCollisions(horizontal) {
    for (let wall of currentMap.walls) {
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

  collect(items) {
    // Loop backwards whenever you plan to remove things from an array!
    for (let i = items.length - 1; i >= 0; i--) {
      let item = items[i];

      // Pythagorean radial collision check
      let d = dist(this.x, this.y, item.x, item.y);
      let combinedRadii = this.size / 2 + item.size / 2;

      if (d < combinedRadii) {
        this.power += item.value;

        this.power = constrain(this.power, 0, this.maxPower);

        items.splice(i, 1);
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
      this.size / 3,
    );

    fill(255, 200, 50);
    ellipse(0, 0, this.size * 1.2, this.size * 0.8);

    fill(100, 220, 255);
    circle(this.size * 0.2, 0, this.size * 0.4);

    pop();
  }
}
