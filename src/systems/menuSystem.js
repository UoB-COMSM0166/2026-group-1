/*
========================================
VERSION: 1.0
SYSTEM: MENU SYSTEM
AUTHOR: jude
DESCRIPTION:
- Handles the landing page rendering and logic
- Operates outside the main ECS engine loop

========================================
*/

import { CANVAS } from "../config.js";

export function createMenuSystem() {
  const btnWidth = 160;
  const btnHeight = 60;
  const gap = 40; // Space between the two buttons

  // Calculate coordinates to perfectly center them side-by-side
  const totalWidth = btnWidth * 2 + gap;
  const startX = CANVAS.WIDTH / 2 - totalWidth / 2;

  const btnEasyX = startX;
  const btnHardX = startX + btnWidth + gap;

  const btnY = CANVAS.HEIGHT / 2;
  const settingsY = btnY + btnHeight + 20;
  const hoverSettings =
    mouseX > startX &&
    mouseX < startX + totalWidth &&
    mouseY > settingsY &&
    mouseY < settingsY + btnHeight;

  fill(hoverSettings ? color(60, 140, 220) : color(30, 100, 180));
  rect(startX, settingsY, totalWidth, btnHeight, 10);

  fill(255);
  text("SETTINGS", startX + totalWidth / 2, settingsY + btnHeight / 2);

  return {
    draw(titleImage) {
      // 1. Draw Background & Overlay
      if (titleImage) {
        image(titleImage, 0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
      } else {
        background(30);
      }
      fill(0, 0, 0, 150);
      rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      // 2. Game Title
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(48);
      text("The Abyss", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 3 - 40);

      textSize(20);
      text("Select Difficulty", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 3 + 10);

      // 3. EASY Button
      const hoverEasy =
        mouseX > btnEasyX &&
        mouseX < btnEasyX + btnWidth &&
        mouseY > btnY &&
        mouseY < btnY + btnHeight;
      if (hoverEasy)
        fill(60, 100, 180); // Lighter deep blue
      else fill(25, 50, 120); // Deep ocean blue

      rect(btnEasyX, btnY, btnWidth, btnHeight, 10);

      fill(255);
      textSize(24);
      text("EASY", btnEasyX + btnWidth / 2, btnY + btnHeight / 2);

      // 4. HARD Button
      const hoverHard =
        mouseX > btnHardX &&
        mouseX < btnHardX + btnWidth &&
        mouseY > btnY &&
        mouseY < btnY + btnHeight;
      if (hoverHard)
        fill(180, 60, 60); // Lighter red for hard mode hover
      else fill(120, 25, 25); // Deep red for hard mode normal

      rect(btnHardX, btnY, btnWidth, btnHeight, 10);
      fill(255);
      text("HARD", btnHardX + btnWidth / 2, btnY + btnHeight / 2);

      const hoverSettings =
        mouseX > startX &&
        mouseX < startX + totalWidth &&
        mouseY > settingsY &&
        mouseY < settingsY + btnHeight;
      fill(hoverSettings ? color(60, 140, 220) : color(30, 100, 180));
      rect(startX, settingsY, totalWidth, btnHeight, 10);

      fill(255);
      text("SETTINGS", startX + totalWidth / 2, settingsY + btnHeight / 2);
    },

    checkClick(mX, mY) {
      // Check if clicked inside EASY
      if (
        mX > btnEasyX &&
        mX < btnEasyX + btnWidth &&
        mY > btnY &&
        mY < btnY + btnHeight
      ) {
        return "EASY";
      }
      // Check if clicked inside HARD
      if (
        mX > btnHardX &&
        mX < btnHardX + btnWidth &&
        mY > btnY &&
        mY < btnY + btnHeight
      ) {
        return "HARD";
      }

      const settingsY = btnY + btnHeight + 20;
      if (
        mX > startX &&
        mX < startX + totalWidth &&
        mY > settingsY &&
        mY < settingsY + btnHeight
      ) {
        return "SETTINGS";
      }
      return null; // Clicked somewhere else on the screen
    },
  };
}
