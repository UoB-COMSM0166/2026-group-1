/*
========================================
VERSION: 1.0
SYSTEM: SONAR SYSTEM
AUTHOR: Ben Mounce
DESCRIPTION:
- Manages sonar pulse emission, particle movement, and wall illumination
- Creates expanding ring of particle rays from player position
- Detects particle-wall collisions and illuminates walls temporarily
- Provides light source and visual data for lighting and render systems

RULES:
- No drawing in update functions
- No state changes in draw functions
- Input sets intent, sonarSystem consumes it
- Sonar system does not directly modify other systems

========================================
DESIGN GOALS:
- Port Sonar 5.0 prototype logic into modular architecture
- Separate pulse data (state) from rendering (renderSystem draws)
- Integrate with lightingSystem for darkness layer punch-through
========================================
RESPONSIBILITIES:
- Create sonar pulses when player triggers sonar intent
- Update pulse particle positions each frame (velocity * deltaTime)
- Detect particle collisions with room platforms/walls
- Illuminate walls on contact, fade wall alpha over time
- Expose active pulses for renderSystem to draw
- Expose revealed walls for renderSystem to draw
- Expose sonar light sources for lightingSystem

DEPENDENCIES:
- Player entity with intent.sonar, sonarPulses[], power
- Room platforms (getPlatforms callback)
- Config: SONAR constants (speed, rays, fade, cost, cooldown)

USAGE:
import { createSonarSystem } from './sonarSystem.js';
const sonarSystem = createSonarSystem(player, getPlatforms);
engine.register(sonarSystem);
========================================
NOTES:
- Pulse particles use plain {x, y, vx, vy} objects for directional movement
- Wall illumination uses alpha (0-255) with configurable fade rate
- Rock texture points are generated once per wall on first illumination
- deltaTime is in milliseconds (from p5.js)
========================================
TODO / LIMITATIONS:
- No camera offset support yet (assumes world-space coordinates)
========================================
*/

//======================================
// SONAR SYSTEM
//======================================
import { SONAR } from '../config.js';

export function createSonarSystem(player, getPlatforms) {
   // Track illumination state per wall (keyed by wall reference)
   const wallStates = new Map();

   // Cooldown tracker
   let lastPulseTime = 0;

   //--------------------------------------
   // WALL STATE HELPERS
   //--------------------------------------
   function getWallState(wall) {
      if (!wallStates.has(wall)) {
         const cx = wall.x + wall.w / 2;
         const cy = wall.y + wall.h / 2;

         // Generate rocky texture points (from Sonar 5.0 Wall class)
         const rockPoints = [];
         for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            const r = (wall.w / 2) * (0.7 + Math.random() * 0.9);
            rockPoints.push({
               px: cx + Math.cos(a) * r,
               py: cy + Math.sin(a) * r,
            });
         }

         wallStates.set(wall, { alpha: 0, rockPoints });
      }
      return wallStates.get(wall);
   }

   //--------------------------------------
   // PULSE CREATION
   //--------------------------------------
   function createPulse(x, y) {
      const particles = [];
      const numRays = SONAR.NUM_RAYS;
      const speed = SONAR.PULSE_SPEED;

      for (let i = 0; i < numRays; i++) {
         const angle = (i / numRays) * Math.PI * 2;
         particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 255,
         });
      }

      return { particles, originX: x, originY: y };
   }

   //--------------------------------------
   // PARTICLE UPDATE
   //--------------------------------------
   function updateParticles(pulse, dt, platforms) {
      for (const p of pulse.particles) {
         if (p.life <= 0) continue;

         // Decrease life
         p.life -= SONAR.PARTICLE_FADE * dt;

         // Calculate next position
         const nextX = p.x + p.vx * dt;
         const nextY = p.y + p.vy * dt;

         // Check collision with walls/platforms
         let hitWall = false;
         for (const wall of platforms) {
            if (
               nextX >= wall.x &&
               nextX <= wall.x + wall.w &&
               nextY >= wall.y &&
               nextY <= wall.y + wall.h
            ) {
               // Illuminate the wall
               const state = getWallState(wall);
               state.alpha = 255;
               p.life = 0;
               hitWall = true;
               break;
            }
         }

         // Move particle if no collision
         if (!hitWall && p.life > 0) {
            p.x = nextX;
            p.y = nextY;
         }
      }
   }

   //--------------------------------------
   // WALL FADE
   //--------------------------------------
   function fadeWalls(dt) {
      for (const [wall, state] of wallStates) {
         if (state.alpha > 0) {
            state.alpha -= SONAR.WALL_FADE_RATE * dt;
            if (state.alpha < 0) state.alpha = 0;
         }
      }
   }

   //--------------------------------------
   // PULSE CLEANUP
   //--------------------------------------
   function isFinished(pulse) {
      return pulse.particles.every((p) => p.life <= 0);
   }

   //--------------------------------------
   // SYSTEM INTERFACE
   //--------------------------------------
   return {
      update(deltaTime) {
         const platforms = getPlatforms?.() ?? [];

         // Consume sonar intent
         if (player.intent.sonar) {
            player.intent.sonar = false;

            // Cooldown check
            const now = performance.now();
            if (now - lastPulseTime >= SONAR.COOLDOWN) {
               // Power check
               if (player.power.current >= SONAR.POWER_COST) {
                  player.power.current -= SONAR.POWER_COST;
                  player.sonarPulses.push(createPulse(player.x, player.y));
                  lastPulseTime = now;
               }
            }
         }

         // Update all active pulses
         for (const pulse of player.sonarPulses) {
            updateParticles(pulse, deltaTime, platforms);
         }

         // Fade illuminated walls
         fadeWalls(deltaTime);

         // Cleanup finished pulses
         for (let i = player.sonarPulses.length - 1; i >= 0; i--) {
            if (isFinished(player.sonarPulses[i])) {
               player.sonarPulses.splice(i, 1);
            }
         }
      },

      //--- DATA GETTERS (read-only for render/lighting systems) ---//

      getActivePulses() {
         return player.sonarPulses;
      },

      getRevealedWalls() {
         const revealed = [];
         for (const [wall, state] of wallStates) {
            if (state.alpha > 1) {
               revealed.push({
                  x: wall.x,
                  y: wall.y,
                  w: wall.w,
                  h: wall.h,
                  alpha: state.alpha,
                  rockPoints: state.rockPoints,
               });
            }
         }
         return revealed;
      },

      getSonarLights() {
         const lights = [];

         // Light from each active pulse (expanding ring creates ambient light)
         for (const pulse of player.sonarPulses) {
            let liveCount = 0;
            let maxDist = 0;
            for (const p of pulse.particles) {
               if (p.life > 0) {
                  liveCount++;
                  const dx = p.x - pulse.originX;
                  const dy = p.y - pulse.originY;
                  const d = Math.sqrt(dx * dx + dy * dy);
                  if (d > maxDist) maxDist = d;
               }
            }
            if (liveCount > 0) {
               lights.push({
                  x: pulse.originX,
                  y: pulse.originY,
                  radius: maxDist + 20,
                  intensity: Math.min(liveCount / SONAR.NUM_RAYS, 1),
               });
            }
         }

         // Light from illuminated walls
         for (const [wall, state] of wallStates) {
            if (state.alpha > 10) {
               lights.push({
                  x: wall.x + wall.w / 2,
                  y: wall.y + wall.h / 2,
                  radius: SONAR.LIGHT_RADIUS,
                  intensity: state.alpha / 255,
               });
            }
         }

         return lights;
      },
   };
}
//======================================
// END
//======================================