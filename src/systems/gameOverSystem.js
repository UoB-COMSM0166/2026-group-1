/*
========================================
SYSTEM: GAME OVER SYSTEM
DESCRIPTION:
- Handles the game over screen when player power reaches zero
- Operates outside the main ECS engine loop
- Offers Try Again (restart same mode) and No (main menu) options
- Settings button opens the settings overlay

RULES:
- No game logic — only drawing and click detection
- Does not reset game state directly; returns action strings via checkClick
========================================
*/

import { CANVAS } from "../config.js";

export function createGameOverSystem() {
  const btnWidth  = 160;
  const btnHeight = 60;
  const gap       = 40;

  // YES / NO buttons — centred side by side
  const totalWidth = btnWidth * 2 + gap;
  const startX     = CANVAS.WIDTH  / 2 - totalWidth / 2;
  const btnYesX    = startX;
  const btnNoX     = startX + btnWidth + gap;
  const btnY       = CANVAS.HEIGHT / 2;

  // SETTINGS button — same width as YES+gap+NO, below
  const settingsY = btnY + btnHeight + 30;

  return {
    draw() {
      // Dark overlay
      fill(0, 0, 0, 200);
      rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      // Title
      textAlign(CENTER, CENTER);
      noStroke();
      fill(180, 40, 40);
      textSize(64);
      text("POWER DEPLETED", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 3 - 40);

      // Question
      fill(200);
      textSize(26);
      text("Try Again?", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 3 + 30);

      // YES button
      const hoverYes =
        mouseX > btnYesX && mouseX < btnYesX + btnWidth &&
        mouseY > btnY    && mouseY < btnY + btnHeight;
      fill(hoverYes ? color(50, 150, 110) : color(25, 100, 70));
      rect(btnYesX, btnY, btnWidth, btnHeight, 10);
      fill(255);
      textSize(24);
      text("YES", btnYesX + btnWidth / 2, btnY + btnHeight / 2);

      // NO button
      const hoverNo =
        mouseX > btnNoX && mouseX < btnNoX + btnWidth &&
        mouseY > btnY   && mouseY < btnY + btnHeight;
      fill(hoverNo ? color(180, 60, 60) : color(120, 25, 25));
      rect(btnNoX, btnY, btnWidth, btnHeight, 10);
      fill(255);
      text("NO", btnNoX + btnWidth / 2, btnY + btnHeight / 2);

      // SETTINGS button
      const hoverSettings =
        mouseX > startX          && mouseX < startX + totalWidth &&
        mouseY > settingsY       && mouseY < settingsY + btnHeight;
      fill(hoverSettings ? color(60, 140, 220) : color(30, 100, 180));
      rect(startX, settingsY, totalWidth, btnHeight, 10);
      fill(255);
      text("SETTINGS", CANVAS.WIDTH / 2, settingsY + btnHeight / 2);
    },

    checkClick(mX, mY) {
      if (mX > btnYesX && mX < btnYesX + btnWidth &&
          mY > btnY    && mY < btnY + btnHeight) {
        return "YES";
      }
      if (mX > btnNoX && mX < btnNoX + btnWidth &&
          mY > btnY   && mY < btnY + btnHeight) {
        return "NO";
      }
      if (mX > startX    && mX < startX + totalWidth &&
          mY > settingsY && mY < settingsY + btnHeight) {
        return "SETTINGS";
      }
      return null;
    },
  };
}
