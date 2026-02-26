class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 0;
    this.y = 0;
    this.w = viewportWidth; 
    this.h = viewportHeight;
  }

  update(player, mapWidth, mapHeight) {
    let mapCenterX = mapWidth / 2;
    let mapCenterY = mapHeight / 2;
    let targetX, targetY;

    // 1. Distance check
    let d = dist(player.x, player.y, mapCenterX, mapCenterY);

    // 2. Determine what the camera should look at
    if (d < 100) {
      // Focus on the room center
      targetX = mapCenterX - (this.w / 2);
      targetY = mapCenterY - (this.h / 2);
    } else {
      // Focus on the player
      targetX = player.x - (this.w / 2);
      targetY = player.y - (this.h / 2);
    }

    // 3. Smoothly pan towards the chosen target (5% distance per frame)
    this.x = lerp(this.x, targetX, 0.05);
    this.y = lerp(this.y, targetY, 0.05);

    // 4. Clamp the camera so it still respects the room walls
    this.x = constrain(this.x, 0, mapWidth - this.w);
    this.y = constrain(this.y, 0, mapHeight - this.h);
  }
}