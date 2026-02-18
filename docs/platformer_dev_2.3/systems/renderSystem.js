/*
========================================
VERSION: 2.2
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Render System: Responsible for all visual output and drawing operations

RULES:
- Render system must not modify game state
- Render system must only read from entities and systems
- No timing or logic updates in draw functions
========================================
DESIGN GOALS:
- Strict separation of logic and rendering
- Centralise all drawing in one system
- Allow visual changes without affecting gameplay
========================================
RESPONSIBILITIES:
- Draw world and environment visuals
- Draw entities (player, platforms, effects)
- Draw UI and overlays (power meter, instructions)
- Apply visual effects (lighting, darkness masks)

DEPENDENCIES:
- p5.js drawing API
- Read-only access to player, world, and system state
- Preloaded assets (images, graphics layers)

USAGE:
const renderSystem = createRenderSystem({
  player,
  platforms,
  torch,
});
engine.register(renderSystem);
========================================
NOTES:
- Render order matters (background → world → entities → UI → effects)
- Darkness and lighting are visual-only and do not affect gameplay
- Rendering uses current game state snapshot only
========================================
TODO / LIMITATIONS:
- No camera or viewport system
- Render order is currently hard-coded
========================================
*/

//======================================
// RENDER SYSTEM
//======================================
/* Reads state only — no mutations */

export function createRenderSystem({
  player,
  platforms,
  torch,
  darknessLayer
}) {
  //---DRAW HELPERS---//
  function drawBackground() {
    background(20, 30, 40);
  }

  function drawPlatforms(platforms) {
    noStroke();
    fill(90, 110, 130);
    for (const p of platforms) {
      rect(p.x, p.y, p.w, p.h);
    }
  }
  
  //---WORLD DRAW---//
  function drawPlayer(player) {
    stroke(150, 0, 25);
    fill(225, 0, 50);
    rect(player.x, player.y, player.w, player.h);
  }
  
  //---UI DRAW---//
  function drawUI(player) {
    fill(255);
    noStroke();
    text(`Power: ${Math.round(player.power.current)}`, 20, 30);
  }

  function drawTorchMask(player, torch, darknessLayer) {
    darknessLayer.clear();
    darknessLayer.background(0, 180);

    if (torch.isVisible(player.power.getPercent())) {
      darknessLayer.erase();
      darknessLayer.circle(player.x, player.y, torch.radius * 2);
      darknessLayer.noErase();
    }

    image(darknessLayer, 0, 0);
  }
  
  //---DRAW HOOK---//
  return {
    draw() {
      drawBackground();
      drawPlatforms(platforms);
      drawPlayer(player);
      drawTorchMask(player, torch, darknessLayer);
      drawUI(player);
    }
  };
}
//======================================
// END
//======================================
