/*
========================================
VERSION: 2.6
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Draws room background, platforms, player, UI.
  and ligthing
========================================
*/

import { PLAYER } from '../config.js';
import { CANVAS } from '../config.js';
import { BUBBLES } from './AmbientEffects.js';


//======================================
// RENDER SYSTEM
//======================================
export function createRenderSystem({
   player,
   getPlatforms,
   getBackground,
   getPlatformColor,
   assets,
   darknessLayer,
   getLightSources,
   playerSprite,
}) {
   function drawBackground() {
      const bg = getBackground?.();

      if (bg?.image && assets?.[bg.image]) {
         image(assets[bg.image], 0, 0, width, height);
      } else if (bg?.color) {
         background(bg.color);
      } else {
         background(0);
      }

   }

   function drawPlatforms() {
      const platforms = getPlatforms?.() ?? [];
      const platformColor = getPlatformColor?.() ?? '#5a6e82';

      noStroke();
      fill(platformColor);

      for (const p of platforms) {
         rect(p.x, p.y, p.w, p.h);
      }
   }

   function drawPlayer() {
      push();
      translate(player.x, player.y);
      scale(player.facing, 1);
      
      fill(120);
      noStroke();
      rect(-2, -player.size * 0.4, 4, player.size * 0.6);
      rect(0.1, -player.size * 0.8, 8, 4);
      
      fill(150);
      noStroke();
      triangle(
         -player.size / 2,0,
         -player.size,
         -player.size / 3,
         -player.size,
         player.size / 3
      );
      fill(255, 200, 50);
      ellipse(0, 0, player.size * 1.2, player.size * 0.8);
      
      fill(100, 220, 255);
      circle(player.size * 0.2, 0, player.size * 0.4);

      pop();
      const w = PLAYER.WIDTH * 5;
      const h = PLAYER.HEIGHT * 5;
      push();
      translate(player.x, player.y);

      // Flip horizontally if facing left
      if (player.facing < 0) {
         scale(-1, 1);
      }
      pop();
   }
   show()
      noStroke();
      fill(150, 220, 255, this.life);
      circle(this.x, this.y, this.size);
      
      function drawBubbles(){
         for (let i = bubbles.length - 1; i >= 0; i--) {
            let b = bubbles[i];
            b.update(deltaTime);
            b.show();
            if (b.life <= 0) {
               bubbles.splice(i, 1);
            }
         }
         player.update(deltaTime);
         player.show();
      }
      
   }
      


   function drawUI() {
      fill(255);
      noStroke();
      text(`Power: ${Math.round(player.power.current)}`, 20, 30);
   }

   function drawLighting(lightSources = []) {
      darknessLayer.clear();
      darknessLayer.background(0);

      const ctx = darknessLayer.drawingContext;
      ctx.globalCompositeOperation = 'destination-out';

      for (const light of lightSources) {
         const { x, y, radius, intensity = 1 } = light;
         const scaledRadius = radius * (0.8 + 0.2 * intensity);

         const gradient = ctx.createRadialGradient(
            x, y, scaledRadius * 0.1,
            x, y, scaledRadius
         );
         gradient.addColorStop(0, 'rgba(255,255,255,1)');
         gradient.addColorStop(1, 'rgba(0,0,0,0)');

         ctx.fillStyle = gradient;
         ctx.beginPath();
         ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
         ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      image(darknessLayer, 0, 0);
   }

   return {
      draw() {
         const lightSources = getLightSources?.() ?? [];

         drawBackground();
         drawPlatforms();
         drawPlayer();
         drawLighting(lightSources);
         drawUI();
      }
   };

//========================================================================
// END
//======================================

