class GameMap {
  // 1. Constructor: Sets up the initial state
  constructor(mapWidth, mapHeight, resolution) {
    this.width = mapWidth;
    this.height = mapHeight;
    this.resolution = resolution;
    this.walls = [];
    this.spawnX = 0;
    this.goalX = 0;
    this.goalY = 0;
  }

  // 2. Logic: The map calculates its own procedural generation
  generate() {
    let cols = this.width / this.resolution;
    let rows = this.height / this.resolution;
    let xOffset = 0;

    for (let y = 0; y < rows; y++) {
      let spineX = map(y, 0, rows, this.width - 400, 400);
      let slither = sin(y * 0.15) * 400;
      let wiggle = map(noise(xOffset), 0, 1, -100, 100);

      // 1. Calculate the center of the tunnel FIRST
      let pathCentre = spineX + slither + wiggle;

      if (y > 10 && y < rows - 10) {
        // 2. A 5% chance to spawn an item on this row
        if (random(1) < 0.5) {
          // 3. Wiggle it slightly left or right so they aren't in a perfect straight line
          let itemX = pathCentre + random(-80, 80);
          let itemY = y * this.resolution;

          // 4. A 50/50 chance for it to be a positive (+5) or negative (-5) item
          if (random(1) < 0.5) {
            items.push(new Item(itemX, itemY, 5)); // Push a green battery
          } else {
            items.push(new Item(itemX, itemY, -5)); // Push a red hazard
          }
        }
      }

      if (y === 2) {
        this.goalX = pathCentre;
        this.goalY = y * this.resolution;
      }

      // (This is your submarine spawn)
      if (y === rows - 1) {
        this.spawnX = pathCentre;
      }

      for (let x = 0; x < cols; x++) {
        let xPos = x * this.resolution;
        let yPos = y * this.resolution;
        let d = abs(xPos - pathCentre);

        if (d > 150) {
          this.walls.push(
            new Wall(xPos, yPos, this.resolution, this.resolution)
          );
        }
      }
      xOffset += 0.04;
    }
  }

  // 3. Rendering: The map draws itself
  show() {
    for (let wall of this.walls) {
      wall.update(deltaTime);
      wall.show();
    }
  }
}
