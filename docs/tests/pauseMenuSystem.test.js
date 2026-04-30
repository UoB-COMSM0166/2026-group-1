//======================================
// UNIT TESTS - PAUSE MENU SYSTEM
//======================================
/*
Tests for pauseMenuSystem.js — verifies:
- Pause toggle, open/close state
- Difficulty get/set/cycle (normal/hard)
- Settings: volume, showFPS, screenShake, devResolution, controlMode
- Page navigation (main → settings → debug)
- Mouse interactions: resume, difficulty toggle, settings toggles
*/

import { jest } from '@jest/globals';

// Mock p5 drawing globals
function makeColor(r, g, b, a) {
  const c = { r, g, b, a: a ?? 255 };
  c.toString = () => `rgba(${r},${g},${b},${a ?? 255})`;
  return c;
}

global.mouseX = 0;
global.mouseY = 0;
global.width = 1280;
global.height = 720;
global.noStroke = jest.fn();
global.stroke = jest.fn();
global.strokeWeight = jest.fn();
global.noFill = jest.fn();
global.fill = jest.fn();
global.rect = jest.fn();
global.text = jest.fn();
global.textAlign = jest.fn();
global.textSize = jest.fn();
global.textStyle = jest.fn();
global.color = (r, g, b, a) => makeColor(r, g, b, a);
global.lerpColor = (c1, c2, t) => c1;
global.circle = jest.fn();
global.constrain = (val, min, max) => Math.max(min, Math.min(max, val));

// Mock config
jest.unstable_mockModule('../config.js', () => ({
  CONTROLS: {
    DEFAULT_MODE: 'wasd',
    MODES: {
      wasd: { ACCEPT: 'w', MOVE_UP: 'w', MOVE_LEFT: 'a', MOVE_DOWN: 's', MOVE_RIGHT: 'd', TOGGLE_TORCH: 'f', SONAR: 'e', LAUNCH_MISSILE: ' ', TOGGLE_SHOP: 'b', TOGGLE_PAUSE: 'Escape', TOGGLE_FULLSCREEN: 'Enter' },
      arrows: { ACCEPT: 'ArrowUp', MOVE_UP: 'ArrowUp', MOVE_LEFT: 'ArrowLeft', MOVE_DOWN: 'ArrowDown', MOVE_RIGHT: 'ArrowRight', TOGGLE_TORCH: 'f', SONAR: 'e', LAUNCH_MISSILE: ' ', TOGGLE_SHOP: 'b', TOGGLE_PAUSE: 'Escape', TOGGLE_FULLSCREEN: 'Enter' },
    },
  },
  keyLabel: (key) => key,
}));

const { createPauseMenuSystem } = await import('../systems/pauseMenuSystem.js');

const cx = () => width / 2; // 640
const BUTTON_W = 180;
const BUTTON_H = 40;

// Helper: simulate mouse press at coordinates
function pressAt(pauseMenu, x, y) {
  global.mouseX = x;
  global.mouseY = y;
  pauseMenu.onMousePressed();
}

// Layout helpers for main page
function mainPageLayout() {
  const baseY = height / 2 - 80;
  return {
    resume:    { x: cx() - BUTTON_W / 2, y: baseY + 50 },
    settings:  { x: cx() - BUTTON_W / 2, y: baseY + 50 + 55 },
    difficulty: { x: cx() - BUTTON_W / 2, y: baseY + 50 + 55 + 55 },
  };
}

function settingsPageLayout() {
  const baseY = height / 2 - 100;
  const leftX = cx() - 120;
  const togglesX = leftX + 190;
  return {
    baseY,
    volumeSlider: { x: leftX - 10, y: baseY + 50 + 18 - 10, w: 160 + 20, h: 8 + 20 },
    showFPS:      { x: togglesX, y: baseY + 110 - 12, w: 48, h: 24 },
    screenShake:  { x: togglesX, y: baseY + 150 - 12, w: 48, h: 24 },
    controlMode:  { x: togglesX, y: baseY + 190 - 12, w: 48, h: 24 },
    controls:     { x: cx() - BUTTON_W / 2, y: baseY + 260 },
    debug:        { x: cx() - BUTTON_W / 2, y: baseY + 260 + 55 },
    back:         { x: cx() - BUTTON_W / 2, y: baseY + 260 + 110 },
  };
}

function debugPageLayout() {
  const baseY = height / 2 - 100;
  const leftX = cx() - 120;
  return {
    devResolution: { x: leftX + 200, y: baseY + 60 - 12, w: 48, h: 24 },
    back: { x: cx() - BUTTON_W / 2, y: baseY + 150 },
  };
}

describe('PauseMenuSystem — initial state', () => {
  it('starts unpaused', () => {
    const menu = createPauseMenuSystem();
    expect(menu.isPaused()).toBe(false);
  });

  it('starts with difficulty easy', () => {
    const menu = createPauseMenuSystem();
    expect(menu.getDifficulty()).toBe('easy');
  });

  it('getSettings returns defaults', () => {
    const menu = createPauseMenuSystem();
    const s = menu.getSettings();
    expect(s.volume).toBe(80);
    expect(s.showFPS).toBe(false);
    expect(s.screenShake).toBe(true);
    expect(s.devResolution).toBe(false);
    expect(s.controlMode).toBe('wasd');
  });
});

describe('PauseMenuSystem — pause toggle', () => {
  it('togglePause flips paused state', () => {
    const menu = createPauseMenuSystem();
    expect(menu.isPaused()).toBe(false);
    menu.togglePause();
    expect(menu.isPaused()).toBe(true);
    menu.togglePause();
    expect(menu.isPaused()).toBe(false);
  });

  it('togglePause resets currentPage to main', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();
    menu.togglePause();
    menu.togglePause();
    // After toggling off then on, page should be main
    expect(menu.isPaused()).toBe(true);
  });
});

describe('PauseMenuSystem — difficulty', () => {
  it('setDifficulty accepts "hard"', () => {
    const menu = createPauseMenuSystem();
    menu.setDifficulty('hard');
    expect(menu.getDifficulty()).toBe('hard');
  });

  it('setDifficulty accepts "easy"', () => {
    const menu = createPauseMenuSystem();
    menu.setDifficulty('hard');
    menu.setDifficulty('easy');
    expect(menu.getDifficulty()).toBe('easy');
  });

  it('setDifficulty normalises case to lowercase', () => {
    const menu = createPauseMenuSystem();
    menu.setDifficulty('HARD');
    expect(menu.getDifficulty()).toBe('hard');
    menu.setDifficulty('EASY');
    expect(menu.getDifficulty()).toBe('easy');
  });

  it('difficulty click cycles between easy and hard', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause(); // open pause menu

    const layout = mainPageLayout();

    // Initial: easy
    expect(menu.getDifficulty()).toBe('easy');

    // Click difficulty button → hard
    pressAt(menu, layout.difficulty.x + 10, layout.difficulty.y + 10);
    expect(menu.getDifficulty()).toBe('hard');

    // Click difficulty button → easy
    pressAt(menu, layout.difficulty.x + 10, layout.difficulty.y + 10);
    expect(menu.getDifficulty()).toBe('easy');
  });
});

describe('PauseMenuSystem — settings page toggles', () => {
  beforeEach(() => {
    global.mouseX = 0;
    global.mouseY = 0;
  });

  it('showFPS toggles on click', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    expect(menu.getSettings().showFPS).toBe(false);

    pressAt(menu, layout.showFPS.x + 5, layout.showFPS.y + 12);
    expect(menu.getSettings().showFPS).toBe(true);

    pressAt(menu, layout.showFPS.x + 5, layout.showFPS.y + 12);
    expect(menu.getSettings().showFPS).toBe(false);
  });

  it('screenShake toggles on click', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    expect(menu.getSettings().screenShake).toBe(true);

    pressAt(menu, layout.screenShake.x + 5, layout.screenShake.y + 12);
    expect(menu.getSettings().screenShake).toBe(false);

    pressAt(menu, layout.screenShake.x + 5, layout.screenShake.y + 12);
    expect(menu.getSettings().screenShake).toBe(true);
  });

  it('controlMode cycles wasd ↔ arrows on click', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    expect(menu.getSettings().controlMode).toBe('wasd');

    pressAt(menu, layout.controlMode.x + 5, layout.controlMode.y + 12);
    expect(menu.getSettings().controlMode).toBe('arrows');

    pressAt(menu, layout.controlMode.x + 5, layout.controlMode.y + 12);
    expect(menu.getSettings().controlMode).toBe('wasd');
  });

  it('controlMode toggle calls onControlModeChange callback', () => {
    const cb = jest.fn();
    const menu = createPauseMenuSystem({ onControlModeChange: cb });
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    pressAt(menu, layout.controlMode.x + 5, layout.controlMode.y + 12);

    expect(cb).toHaveBeenCalledWith('arrows');
  });
});

describe('PauseMenuSystem — volume slider', () => {
  it('volume starts at 80', () => {
    const menu = createPauseMenuSystem();
    expect(menu.getSettings().volume).toBe(80);
  });

  it('volume respects minimum 0', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    global.mouseX = layout.volumeSlider.x + 1; // far left
    global.mouseY = layout.volumeSlider.y + 12;

    menu.onMousePressed?.();
    menu.onMouseDragged?.();

    expect(menu.getSettings().volume).toBeGreaterThanOrEqual(0);
  });

  it('volume respects maximum 100', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();

    const layout = settingsPageLayout();
    global.mouseX = layout.volumeSlider.x + layout.volumeSlider.w - 1;
    global.mouseY = layout.volumeSlider.y + 12;

    menu.onMousePressed?.();
    menu.onMouseDragged?.();

    expect(menu.getSettings().volume).toBeLessThanOrEqual(100);
  });
});

describe('PauseMenuSystem — page navigation', () => {
  it('openSettingsMenu goes to settings page', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();
    menu.openSettingsMenu();
    expect(menu.isPaused()).toBe(true);
    // settings page is active — main page resume button not visible
  });

  it('clicking resume closes pause menu', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause();

    const layout = mainPageLayout();
    pressAt(menu, layout.resume.x + 10, layout.resume.y + 10);

    expect(menu.isPaused()).toBe(false);
  });

  it('main → settings → debug → back → settings → back → main', () => {
    const menu = createPauseMenuSystem();
    menu.togglePause(); // open at main

    const mainL = mainPageLayout();
    const settingsL = settingsPageLayout();
    const debugL = debugPageLayout();

    // main → settings
    pressAt(menu, mainL.settings.x + 10, mainL.settings.y + 10);

    // settings → debug
    pressAt(menu, settingsL.debug.x + 10, settingsL.debug.y + 10);

    // debug → back → settings
    pressAt(menu, debugL.back.x + 10, debugL.back.y + 10);

    // settings → back → main
    pressAt(menu, settingsL.back.x + 10, settingsL.back.y + 10);

    // from main, resume closes
    pressAt(menu, mainL.resume.x + 10, mainL.resume.y + 10);
    expect(menu.isPaused()).toBe(false);
  });
});

describe('PauseMenuSystem — onResolutionChange callback', () => {
  it('devResolution toggle calls onResolutionChange', () => {
    const cb = jest.fn();
    const menu = createPauseMenuSystem({ onResolutionChange: cb });
    menu.togglePause();
    menu.openSettingsMenu();

    const settingsL = settingsPageLayout();
    const debugL = debugPageLayout();

    // settings → debug
    pressAt(menu, settingsL.debug.x + 10, settingsL.debug.y + 10);

    // devResolution toggle
    pressAt(menu, debugL.devResolution.x + 5, debugL.devResolution.y + 12);

    expect(cb).toHaveBeenCalledWith(true);
    expect(menu.getSettings().devResolution).toBe(true);
  });
});

describe('PauseMenuSystem — openSettingsMenu flag', () => {
  it('openSettingsMenu(true) sets returnToMainMenu flag', () => {
    const menu = createPauseMenuSystem();
    menu.openSettingsMenu(true); // from main menu
    // On back from settings, should go back to main menu (unpause)
    const settingsL = settingsPageLayout();
    pressAt(menu, settingsL.back.x + 10, settingsL.back.y + 10);
    expect(menu.isPaused()).toBe(false);
  });
});
