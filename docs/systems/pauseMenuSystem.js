/*
========================================
VERSION: 1.0
SYSTEM: PAUSE MENU SYSTEM
DESCRIPTION:
- Manages pause state, settings UI, and difficulty toggle
- Draws overlay menu on the p5 canvas when paused
- Settings page has volume slider and UI-only QOL toggles
- Difficulty toggle: Normal (torch + sonar) vs Hard (sonar only)

RULES:
- Does not modify other systems directly
- Only reads/writes pause and difficulty state
- All drawing happens in draw(), all state in update()
========================================
*/

//======================================
// PAUSE MENU SYSTEM
//======================================

import { CONTROLS, keyLabel } from '../config.js';

export function createPauseMenuSystem({
  onResolutionChange,
  onControlModeChange,
  onVolumeChange,
  onOpenControls,
  initialControlMode = 'wasd',
} = {}) {
  let paused = false;
  let currentPage = "main"; // 'main' | 'settings' | 'debug'

  // Difficulty: 'normal' | 'hard'
  let difficulty = "easy";

  // Settings (UI only — values stored but not wired to audio etc.)
  let volume = 80; // 0–100
  let showFPS = false;
  let screenShake = true;

  // Control mode: 'wasd' | 'arrows'
  let controlMode = initialControlMode;

  // Debug settings
  let devResolution = false; // false = 1920x1080, true = dev (640x360)

  // Button layout constants
  const BUTTON_W = 180;
  const BUTTON_H = 40;
  const SLIDER_W = 160;
  const SLIDER_H = 8;

  // Track mouse interaction state
  let draggingVolume = false;

  let returnToMainMenu = false;

  //--------------------------------------
  // HIT TESTING
  //--------------------------------------
  function isOver(bx, by, bw, bh) {
    return (
      mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh
    );
  }

  //--------------------------------------
  // DRAWING HELPERS
  //--------------------------------------
  function drawButton(label, x, y, w, h, hovered) {
    noStroke();
    fill(hovered ? color(80, 130, 200) : color(50, 60, 80));
    rect(x, y, w, h, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(label, x + w / 2, y + h / 2);
  }

  function drawToggle(label, value, x, y, labelX = x) {
    textAlign(LEFT, CENTER);
    textSize(14);
    fill(200);
    noStroke();
    text(label, labelX, y);

    const toggleX = x + 160;
    const toggleW = 48;
    const toggleH = 24;
    fill(value ? color(60, 180, 100) : color(80, 80, 80));
    rect(toggleX, y - toggleH / 2, toggleW, toggleH, toggleH / 2);
    fill(255);
    const knobX = value ? toggleX + toggleW - toggleH + 4 : toggleX + 4;
    circle(knobX + (toggleH - 8) / 2, y, toggleH - 8);
  }

  function drawSlider(label, value, min, max, x, y) {
    textAlign(LEFT, CENTER);
    textSize(14);
    fill(200);
    noStroke();
    text(`${label}: ${Math.round(value)}`, x, y);

    const sliderX = x;
    const sliderY = y + 18;
    // Track
    fill(60);
    rect(sliderX, sliderY, SLIDER_W, SLIDER_H, 4);
    // Fill
    const pct = (value - min) / (max - min);
    fill(80, 160, 220);
    rect(sliderX, sliderY, SLIDER_W * pct, SLIDER_H, 4);
    // Knob
    fill(255);
    circle(sliderX + SLIDER_W * pct, sliderY + SLIDER_H / 2, 14);
  }

  //--------------------------------------
  // MAIN MENU PAGE
  //--------------------------------------
  function drawMainPage() {
    const cx = width / 2;
    const baseY = height / 2 - 80;

    // Title
    textAlign(CENTER, CENTER);
    textSize(28);
    fill(255);
    noStroke();
    text("PAUSED", cx, baseY);

    // Resume
    const resumeY = baseY + 50;
    drawButton(
      "Resume",
      cx - BUTTON_W / 2,
      resumeY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, resumeY, BUTTON_W, BUTTON_H),
    );

    // Settings
    const settingsY = resumeY + 55;
    drawButton(
      "Settings",
      cx - BUTTON_W / 2,
      settingsY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, settingsY, BUTTON_W, BUTTON_H),
    );

    // Difficulty
    const diffY = settingsY + 55;
    const diffLabel = `Difficulty: ${difficulty.toUpperCase()}`;
    const diffColor =
      difficulty === "hard" ? color(200, 80, 80) : color(60, 160, 90);
    const hovered = isOver(cx - BUTTON_W / 2, diffY, BUTTON_W, BUTTON_H);
    noStroke();
    fill(hovered ? diffColor : lerpColor(color(50, 60, 80), diffColor, 0.6));
    rect(cx - BUTTON_W / 2, diffY, BUTTON_W, BUTTON_H, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(diffLabel, cx, diffY + BUTTON_H / 2);
  }

  //--------------------------------------
  // SETTINGS PAGE
  //--------------------------------------
  function drawSettingsPage() {
    const cx = width / 2;
    const leftX = cx - 120;
    const baseY = height / 2 - 100;

    // Title
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    noStroke();
    text("SETTINGS", cx, baseY);

    // Volume slider
    drawSlider("Volume", volume, 0, 100, leftX, baseY + 50);

    // Toggles (UI only)
    drawToggle("Show FPS", showFPS, leftX + 30, baseY + 110, leftX);
    drawToggle("Screen Shake", screenShake, leftX + 30, baseY + 150, leftX);

    // Control mode toggle
    const controlLabel = `Movement: ${controlMode === 'wasd' ? 'WASD' : 'Arrow Keys'}`;
    drawToggle(controlLabel, controlMode === 'arrows', leftX + 30, baseY + 190, leftX);

    // Binding reference — shows all keys for the active mode
    const map = CONTROLS.MODES[controlMode] ?? CONTROLS.MODES[CONTROLS.DEFAULT_MODE];
    const moveStr = [map.MOVE_UP, map.MOVE_LEFT, map.MOVE_DOWN, map.MOVE_RIGHT].map(keyLabel).join('');
    textAlign(LEFT, TOP);
    textSize(11);
    fill(140);
    noStroke();
    text(
      `Move: ${moveStr}   Move Slow: ${keyLabel(map.SNEAK)}   Sonar: ${keyLabel(map.SONAR)}   Torch: ${keyLabel(map.TOGGLE_TORCH)}`,
      leftX, baseY + 207,
    );
    text(
      `Missile: ${keyLabel(map.LAUNCH_MISSILE)}   Workshop: ${keyLabel(map.TOGGLE_WORKSHOP)}   Pause: ${keyLabel(map.TOGGLE_PAUSE)}`,
      leftX, baseY + 221,
    );
    text(
      `Fullscreen: ${keyLabel(map.TOGGLE_FULLSCREEN)}`,
      leftX, baseY + 235,
    );

    // Controls button
    const controlsY = baseY + 260;
    drawButton(
      "Controls",
      cx - BUTTON_W / 2,
      controlsY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, controlsY, BUTTON_W, BUTTON_H),
    );

    // Debug button
    const debugY = controlsY + 55;
    drawButton(
      "Debug",
      cx - BUTTON_W / 2,
      debugY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, debugY, BUTTON_W, BUTTON_H),
    );

    // Back button
    const backY = debugY + 55;
    drawButton(
      "Back",
      cx - BUTTON_W / 2,
      backY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, backY, BUTTON_W, BUTTON_H),
    );
  }

  //--------------------------------------
  // DEBUG PAGE
  //--------------------------------------
  function drawDebugPage() {
    const cx = width / 2;
    const leftX = cx - 120;
    const baseY = height / 2 - 100;

    // Title
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    noStroke();
    text("DEBUG", cx, baseY);

    // Dev Resolution toggle — x offset pushes switch right of the long label
    drawToggle("Dev Resolution (640x360)", devResolution, leftX + 40, baseY + 60, leftX);

    // Info text
    textAlign(LEFT, TOP);
    textSize(11);
    fill(150);
    const modeLabel = devResolution
      ? "640x360 (dev)"
      : "1920x1080 (production)";
    text(`Current: ${modeLabel}`, leftX, baseY + 90);

    // Back button
    const backY = baseY + 150;
    drawButton(
      "Back",
      cx - BUTTON_W / 2,
      backY,
      BUTTON_W,
      BUTTON_H,
      isOver(cx - BUTTON_W / 2, backY, BUTTON_W, BUTTON_H),
    );
  }

  //--------------------------------------
  // CLICK HANDLING
  //--------------------------------------
  function handleClick() {
    if (!paused) return;

    const cx = width / 2;

    if (currentPage === "main") {
      const baseY = height / 2 - 80;
      const resumeY = baseY + 50;
      const settingsY = resumeY + 55;
      const diffY = settingsY + 55;

      if (isOver(cx - BUTTON_W / 2, resumeY, BUTTON_W, BUTTON_H)) {
        paused = false;
        currentPage = "main";
      } else if (isOver(cx - BUTTON_W / 2, settingsY, BUTTON_W, BUTTON_H)) {
        currentPage = "settings";
      } else if (isOver(cx - BUTTON_W / 2, diffY, BUTTON_W, BUTTON_H)) {
        difficulty = difficulty === "easy" ? "hard" : "easy";
      }
    } else if (currentPage === "settings") {
      const baseY = height / 2 - 100;
      const leftX = cx - 120;

      const togglesX = leftX + 190; // leftX + 30 (draw offset) + 160 (toggleX offset in drawToggle)

      // Show FPS toggle hit area
      if (isOver(togglesX, baseY + 110 - 12, 48, 24)) {
        showFPS = !showFPS;
      }

      // Screen Shake toggle hit area
      if (isOver(togglesX, baseY + 150 - 12, 48, 24)) {
        screenShake = !screenShake;
      }

      // Control mode toggle hit area
      if (isOver(togglesX, baseY + 190 - 12, 48, 24)) {
        controlMode = controlMode === 'wasd' ? 'arrows' : 'wasd';
        onControlModeChange?.(controlMode);
      }

      // Controls button
      const controlsY = baseY + 260;
      if (isOver(cx - BUTTON_W / 2, controlsY, BUTTON_W, BUTTON_H)) {
        onOpenControls?.();
      }

      // Debug button
      const debugY = controlsY + 55;
      if (isOver(cx - BUTTON_W / 2, debugY, BUTTON_W, BUTTON_H)) {
        currentPage = "debug";
      }

      // Back button
      const backY = debugY + 55;
      if (isOver(cx - BUTTON_W / 2, backY, BUTTON_W, BUTTON_H)) {
        if (returnToMainMenu) {
          paused = false;
          currentPage = "main";
          returnToMainMenu = false;
        } else {
          currentPage = "main"; // Normal pause menu behavior
        }
      }
    } else if (currentPage === "debug") {
      const baseY = height / 2 - 100;
      const leftX = cx - 120;

      // Dev Resolution toggle hit area
      const toggleX = leftX + 200; // leftX + 40 (draw offset) + 160 (toggleX offset in drawToggle)
      if (isOver(toggleX, baseY + 60 - 12, 48, 24)) {
        devResolution = !devResolution;
        onResolutionChange?.(devResolution);
      }

      // Back button
      const backY = baseY + 150;
      if (isOver(cx - BUTTON_W / 2, backY, BUTTON_W, BUTTON_H)) {
        currentPage = "settings";
      }
    }
  }

  //--------------------------------------
  // VOLUME SLIDER DRAG
  //--------------------------------------
  function handleMousePressed() {
    if (!paused || currentPage !== "settings") return;
    const cx = width / 2;
    const leftX = cx - 120;
    const sliderY = height / 2 - 100 + 50 + 18;
    if (isOver(leftX - 10, sliderY - 10, SLIDER_W + 20, SLIDER_H + 20)) {
      draggingVolume = true;
    }
  }

  function handleMouseDragged() {
    if (!draggingVolume) return;
    const cx = width / 2;
    const leftX = cx - 120;
    const pct = constrain((mouseX - leftX) / SLIDER_W, 0, 1);
    volume = pct * 100;
    onVolumeChange?.(volume);
  }

  function handleMouseReleased() {
    draggingVolume = false;
  }

  //--------------------------------------
  // SYSTEM INTERFACE
  //--------------------------------------
  return {
    isPaused() {
      return paused;
    },

    getDifficulty() {
      return difficulty;
    },

    setDifficulty(level) {
      difficulty = level.toLowerCase();
    },

    getSettings() {
      return { volume, showFPS, screenShake, devResolution, controlMode };
    },

    togglePause() {
      paused = !paused;
      currentPage = "main";
      returnToMainMenu = false;
    },

    onMousePressed() {
      handleMousePressed();
      handleClick();
    },

    onMouseDragged() {
      handleMouseDragged();
    },

    onMouseReleased() {
      handleMouseReleased();
    },

    // draw() is called by the engine but we only render when paused
    draw() {
      if (!paused) return;

      // Semi-transparent overlay
      noStroke();
      fill(0, 0, 0, 160);
      rect(0, 0, width, height);

      if (currentPage === "main") {
        drawMainPage();
      } else if (currentPage === "settings") {
        drawSettingsPage();
      } else if (currentPage === "debug") {
        drawDebugPage();
      }
    },

    openSettingsMenu(fromMain = false) {
      paused = true;
      currentPage = "settings";
      returnToMainMenu = fromMain;
    },
  };
}
//======================================
// END
//======================================
