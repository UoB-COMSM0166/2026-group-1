/*
========================================
VERSION: 3.0
SYSTEM: LIGHTING SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Computes dynamic light sources for the game world
- Provides data for renderSystem to draw lighting effects
- Handles intensity and visibility of lights (e.g., player torch)

RULES:
- Lighting system does not perform actual drawing
- Lighting system does not modify game state
- Purely read-only: calculates light data for consumption by renderer
========================================
DESIGN GOALS:
- Centralize light source computation
- Support multiple light sources (player, enemies, etc.)
- Allow intensity and flicker effects without side effects
========================================
RESPONSIBILITIES:
- Provide a method to get current light sources
- Compute positions, radius, and intensity of each light
- Include flicker and intensity adjustments based on entity state

DEPENDENCIES:
- Player object with torch and power properties
- Optional array of enemies with light sources
- Uses torch.getIntensity(powerPercent) for smooth light intensity

USAGE:
const lightingSystem = createLightingSystem(player, enemies, etc. = []);
const lightSources = lightingSystem.getLightSources();
========================================
NOTES:
- Designed to be called each frame before rendering
- Can easily be extended to include enemy or environmental lights
- Returns array of objects: {x, y, radius, intensity}
========================================
TODO / LIMITATIONS:
- Currently only player torch implemented
- No ambient or environmental light sources yet
========================================
*/

//======================================
// LIGHTING SYSTEM
//======================================
import { LIGHTING } from '../config.js';

export function createLightingSystem(player = [], getSonarLights = () => []) {
   return {

      //--- GET LIGHT SOURCES ---//
      getLightSources() {
         if (!player) return [];
         const x = player.position?.x ?? player.x ?? 0;
         const y = player.position?.y ?? player.y ?? 0;

         // Player torch
         if (player.torch?.isOn) {
            const intensity = player.torch.getIntensity(player.power?.getPercent?.() ?? 0);
            if (intensity > 0) {
               return [{
                  kind: 'torch',
                  x,
                  y,
                  radius: player.torch.radius,
                  intensity
               }];
            }
         }

         const ambientRadius = LIGHTING?.PLAYER_AMBIENT?.radius ?? 0;
         const ambientIntensity = LIGHTING?.PLAYER_AMBIENT?.brightness ?? 0;
         if (ambientRadius > 0 && ambientIntensity > 0) {
            return [{
               kind: 'ambient',
               x,
               y,
               radius: ambientRadius,
               intensity: ambientIntensity
            }];
         }
         return [];
      }
   };
}
//======================================
// END
//======================================
