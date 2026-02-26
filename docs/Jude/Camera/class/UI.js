// Author: jude
class UI {
  constructor() {
    this.gameState = "START"; // Possible states: "START", "PLAYING"
  }

  // Method to draw the current screen based on game state
  render() {
    if (this.gameState === "START") {
      this.drawStartScreen();
    } else {
      this.drawHUD();
    }
  }

  drawStartScreen() {
    background(5, 10, 20, 200); // Slightly transparent dark background

    textAlign(CENTER, CENTER);
    fill(0, 255, 150);
    textSize(32);
    text("SUBMARINE SONAR", width / 2, height / 2 - 60);

    fill(255);
    textSize(16);
    text("WASD to Move\nPress 'P' for Sonar Ping", width / 2, height / 2);

    // Draw a visual "Button"
    fill(0, 200, 0);
    rectMode(CENTER);
    rect(width / 2, height / 2 + 70, 120, 40, 5);

    fill(255);
    text("START", width / 2, height / 2 + 70);
  }

  // integrated Mogal's draw power metre
  drawHUD() {
    push();
    // 1. Position and Styling
    let x = 30;
    let y = 50;
    let segW = 25; // Width of each segment
    let segH = 10; // Height of each segment
    let gap = 4; // Space between segments
    let totalSegments = 10;

    // 2. Draw the 75% Label
    textAlign(CENTER);
    textSize(12);
    fill(100, 220, 255);
    noStroke();
    text(Math.round(player.power) + "%", x + segW / 2, y - 10);

    // 3. Draw the Segments
    rectMode(CORNER);
    for (let i = 0; i < totalSegments; i++) {
      // We calculate the threshold from the bottom up
      // i=0 is the top segment (needs 90% power to light up)
      let threshold = (totalSegments - 1 - i) * (100 / totalSegments);

      if (player.power > threshold) {
        // --- ACTIVE SEGMENT ---
        fill(100, 220, 255);
        drawingContext.shadowBlur = 10; // The "Neon" glow
        drawingContext.shadowColor = color(100, 220, 255);
      } else {
        // --- INACTIVE SEGMENT ---
        fill(40);
        drawingContext.shadowBlur = 0;
      }

      // Draw the rounded segment
      rect(x, y + i * (segH + gap), segW, segH, 2);
    }

    // Always reset shadowBlur so it doesn't make the rest of the game blurry
    drawingContext.shadowBlur = 0;
    pop();
  }

  // Check if the user clicked the START button
  checkClick() {
    if (this.gameState === "START") {
      // Check if mouse is within the button rectangle
      if (
        mouseX > width / 2 - 60 &&
        mouseX < width / 2 + 60 &&
        mouseY > height / 2 + 50 &&
        mouseY < height / 2 + 90
      ) {
        this.gameState = "PLAYING";
      }
    }
  }
}
