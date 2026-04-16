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
import { LIGHTING, TORCH } from '../config.js';

export function createLightingSystem(player = null, getSonarLights = () => []) {
   return {

      //--- GET LIGHT SOURCES ---//
      getLightSources() {
         if (!player) return [];
         const x = player.position?.x ?? player.x ?? 0;
         const y = player.position?.y ?? player.y ?? 0;
         const lightSources = [];

         // Player torch
         if (player.torch?.isOn) {
            const intensity = player.torch.getIntensity(player.power?.getPercent?.() ?? 0);
            if (intensity > 0) {
               lightSources.push({
                  kind: 'torch',
                  x,
                  y,
                  radius: TORCH.RADIUS, // if upgrades added replace with player.torch.radius
                  intensity
               });
            }
         } else {
            // Torch off — ambient only
            lightSources.push({
               kind: 'ambient',
               x,
               y,
               radius: LIGHTING.PLAYER_AMBIENT.radius,
               intensity: LIGHTING.PLAYER_AMBIENT.brightness
            });
         }

         // Sonar lights
         const sonarLights = getSonarLights?.() ?? [];
         for (const light of sonarLights) {
            lightSources.push(light);
         }

         return lightSources;
      }
   };
}
//======================================
// END
//======================================
