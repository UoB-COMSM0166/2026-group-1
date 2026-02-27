/*
========================================
VERSION: 2.7
SYSTEM: RENDER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Draws room background, platforms, player (hand-drawn submarine),
  bubbles, sonar effects, lighting overlay, and UI.

RULES:
- No state changes in draw functions (read-only)
- No deltaTime usage
- All drawing lives here
========================================
*/


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
   getActivePulses,
   getRevealedWalls,
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

      // Periscope
      fill(120);
      noStroke();
      rect(-2, -player.size * 0.9, 4, player.size * 0.6);
      rect(-2, -player.size * 0.9, 8, 4);

      // Tail fin
      fill(150);
      noStroke();
      triangle(
         -player.size / 2, 0,
         -player.size, -player.size / 3,
         -player.size, player.size / 3
      );

      // Body
      fill(255, 200, 50);
      ellipse(0, 0, player.size * 1.2, player.size * 0.8);

      // Porthole window
      fill(100, 220, 255);
      circle(player.size * 0.2, 0, player.size * 0.4);

      pop();
   }

   function drawBubbles() {
      const bubbleList = player.bubbles ?? [];
      noStroke();
      for (const b of bubbleList) {
         if (b.life > 0) {
            fill(150, 220, 255, b.life);
            circle(b.x, b.y, b.size);
         }
      }
   }
      

      function drawUI() {
         fill(255);
         noStroke();
         text(`Power: ${Math.round(player.power.current)}`, 20, 30);
      }

      function drawSonarPulses() {
         const pulses = getActivePulses?.() ?? [];
         strokeWeight(2);
         for (const pulse of pulses) {
            for (const p of pulse.particles) {
               if (p.life > 0) {
                  stroke(0, 220, 0, p.life);
                  point(p.x, p.y);
               }
            }
         }
      }

      function drawSonarWalls() {
         const walls = getRevealedWalls?.() ?? [];
         for (const wall of walls) {
            if (wall.alpha > 1) {
               // Dark background rect
               noStroke();
               fill(20, 25, 35, wall.alpha);
               rect(wall.x, wall.y, wall.w, wall.h, 3);

               // Rocky texture overlay
               fill(40, 50, 65, wall.alpha);
               beginShape();
               for (const pt of wall.rockPoints) {
                  vertex(pt.px, pt.py);
               }
               endShape(CLOSE);
            }
         }
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
            drawSonarWalls();
            drawSonarPulses();
            drawBubbles();
            drawPlayer();
            drawLighting(lightSources);
            drawUI();
         }
      };  
   }
      
      
//========================================================================
// END
//======================================

