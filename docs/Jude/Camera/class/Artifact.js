class Artifact {
  // 1. ACCEPT THE IMAGE HERE
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    // 2. SAVE IT HERE
    this.img = img; 
    this.size = 30; // Adjusted size slightly for the image
    this.glowPhase = 0; 
  }

  update(dt) {
    this.glowPhase += 0.005 * dt; 
  }

  show() {
    push();
    translate(this.x, this.y);

    // 1. Draw the glowing aura (Keep this!)
    noStroke();
    let pulseAlpha = map(sin(this.glowPhase), -1, 1, 50, 150);
    fill(0, 255, 200, pulseAlpha); // Cyan glow
    // Make the glow slightly larger than the image
    circle(0, 0, this.size * 1.5); 

    // --- OLD CIRCLES COMMENTED OUT ---
    // fill(255, 220, 50); 
    // circle(0, 0, this.size);
    // fill(255);
    // circle(0, 0, this.size * 0.4);
    // ---------------------------------

    // 2. Draw the actual image
    imageMode(CENTER);
    // Now 'this.img' exists!
    image(this.img, 0, 0, this.size, this.size); 
    
    pop();
  }

  checkCollision(player) {
    // Use a slightly smaller hitbox for the image feel
    let hitboxSize = this.size * 0.8;
    let d = dist(this.x, this.y, player.x, player.y);
    let combinedRadii = (hitboxSize / 2) + (player.size / 2);
    
    if (d < combinedRadii) {
      return true; 
    }
    return false;
  }
}