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

// theSurface room vertical bounds (world-space pixels)
const SURFACE_BOTTOM_Y = 3184; // player spawn row — darkest point
const SURFACE_TOP_Y    = 320;  // win trigger row  — brightest point

function capitalize(s) {
   return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function createLightingSystem(player = null, getSonarLights = () => [], getGlowLights = () => [], getCurrentRoom = () => null, getJellyfishLights = () => [], getCollectables = () => [], getPiranhaLights = () => []) {
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
                  radius: player.torch.radius,  // reflects setUpgradeLevel — scales with torch upgrade
                  intensity
               });
            }
         } else {
            // Torch off — ambient only
            lightSources.push({
               kind: 'ambient',
               x,
               y,
               radius: LIGHTING.PLAYER_AMBIENT.RADIUS,
               intensity: LIGHTING.PLAYER_AMBIENT.BRIGHTNESS
            });
         }

         // Sonar lights
         const sonarLights = getSonarLights?.() ?? [];
         for (const light of sonarLights) {
            lightSources.push(light);
         }

         // Glow object lights
         const glowLights = getGlowLights?.() ?? [];
         for (const light of glowLights) {
            lightSources.push(light);
         }

         // Jellyfish bioluminescent lights
         const jellyfishLights = getJellyfishLights?.() ?? [];
         for (const light of jellyfishLights) {
            lightSources.push(light);
         }

         // Piranha chase glow
         const piranhaLights = getPiranhaLights?.() ?? [];
         for (const light of piranhaLights) {
            lightSources.push(light);
         }

         // Collectable lights — power cells and scrap glow faintly
         const collectables = getCollectables?.() ?? [];
         for (const c of collectables) {
            if (!c.visible) continue;
            const kind = c.collectableType;
            if (kind === 'power' || kind === 'scrap') {
               lightSources.push({
                  kind: 'collectable',
                  type: `collectable${capitalize(kind)}`,
                  x: c.x,
                  y: c.y,
                  radius: kind === 'power' ? 28 : 18,
                  intensity: kind === 'power' ? 0.7 : 0.4,
               });
            }
         }

         // Surface room: fixed-position ambient zones — brightness tied to world Y, not player Y
         if (getCurrentRoom?.() === 'theSurface') {
            lightSources.push({
               kind: 'surfaceAmbient',
               topY: SURFACE_TOP_Y,
               bottomY: SURFACE_BOTTOM_Y,
            });
         }

         return lightSources;
      },
   };
}
//======================================
// END
//======================================
