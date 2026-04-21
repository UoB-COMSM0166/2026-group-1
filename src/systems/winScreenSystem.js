/*
========================================
SYSTEM: WIN SCREEN SYSTEM
AUTHOR: jude
DESCRIPTION:
- Handles the win screen rendering and logic
- Operates outside the main ECS engine loop
========================================
*/

import { CANVAS } from "../config.js";

export function createWinScreenSystem() {
  const btnWidth = 200;
  const btnHeight = 60;

  // Center the button horizontally
  const btnX = CANVAS.WIDTH / 2 - btnWidth / 2;
  const btnY = CANVAS.HEIGHT / 2 + 40;

  return {
    draw() {
      // 1. Dark Overlay (dims the final frame of the level)
      fill(0, 0, 0, 180);
      rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      // 2. Win Title
      fill(255, 215, 0); // Gold color for winning
      textAlign(CENTER, CENTER);
      textSize(64);
      text("Welcome back!", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 60);

      fill(200);
      textSize(20);
      text(
        "You have escaped the abyss!",
        CANVAS.WIDTH / 2,
        CANVAS.HEIGHT / 2 + 10,
      );

      // 3. Main Menu Button
      const hoverMenu =
        mouseX > btnX &&
        mouseX < btnX + btnWidth &&
        mouseY > btnY &&
        mouseY < btnY + btnHeight;

      if (hoverMenu) {
        fill(60, 140, 220); // Lighter blue hover
      } else {
        fill(30, 100, 180); // Standard blue
      }

      rect(btnX, btnY, btnWidth, btnHeight, 10);

      fill(255);
      textSize(24);
      text("Restart", CANVAS.WIDTH / 2, btnY + btnHeight / 2);
    },

    checkClick(mX, mY) {
      // Check if clicked inside the MAIN MENU button
      if (
        mX > btnX &&
        mX < btnX + btnWidth &&
        mY > btnY &&
        mY < btnY + btnHeight
      ) {
        return "MENU";
      }
      return null;
    },
  };
}
