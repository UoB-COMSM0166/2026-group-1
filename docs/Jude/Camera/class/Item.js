// Author: Mogal -> edited by jude
class Item {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value; // e.g., 5 or -5
    this.size = 20; // Matches the radial collision math in your Player class
  }

  show() {
    push();
    noStroke();

    // Determine color based on the value passed into the constructor
    if (this.value > 0) {
      fill(0, 255, 100); // Green for positive energy
    } else {
      fill(255, 60, 60); // Red for negative energy/damage
    }

    circle(this.x, this.y, this.size);
    pop();
  }
}
