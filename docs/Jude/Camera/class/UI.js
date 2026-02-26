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
    // UI text
    textAlign(LEFT, TOP);
    fill(255);
    noStroke();
    textSize(14);
    text("WASD: Move | P: Sonar", 10, 15);

    // Power meter text
    let percent = Math.round((player.power / player.maxPower) * 100);
    text(`Power: ${percent}%`, 10, 40);

    // Bar background
    fill(80);
    rectMode(CORNER);
    rect(10, 60, 200, 15, 5); // The '5' adds rounded corners for polish

    // 4. Bar Fill (Dynamic Color)
    if (player.power > 50) {
      fill(0, 255, 150); // Green (Healthy)
    } else if (player.power > 25) {
      fill(255, 200, 50); // Yellow (Warning)
    } else {
      fill(255, 60, 60); // Red (Critical)
    }

    // 5. Calculate width and draw the active power
    let w = map(player.power, 0, player.maxPower, 0, 200);
    w = max(0, w); // Prevents the bar from drawing backwards if power hits 0
    rect(10, 60, w, 15, 5);
    
    // Reset rectMode back to CENTER for the rest of your game engine
    rectMode(CENTER); 
  }

  // Check if the user clicked the START button
  checkClick() {
    if (this.gameState === "START") {
      // Check if mouse is within the button rectangle
      if (mouseX > width/2 - 60 && mouseX < width/2 + 60 && 
          mouseY > height/2 + 50 && mouseY < height/2 + 90) {
        this.gameState = "PLAYING";
      }
    }
  }
}