// Wall class be Ben
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
      // let r = (this.w / 2) * random(0.7, 1.6);
      let r = 5 * random(0.7, 1.6);
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
