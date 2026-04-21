/*
========================================
VERSION: 3.0
SYSTEM: TORCH SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Updates the Torch instance held by the player
- Manages flicker timing, on/off state, and power drain
- Integrates Torch logic into the engine update loop

RULES:
- No drawing in update functions
- No state changes in draw functions
- Torch system does not directly manipulate rendering
- Torch system only interacts with power via a simple isEmpty() check
========================================
DESIGN GOALS:
- Keep torch logic modular and separate from rendering
- Ensure frame-rate independent updates using TIME.fixedDeltaTime
- Maintain clear boundaries between systems
========================================
RESPONSIBILITIES:
- Update torch flicker timer
- Drain player power while torch is active
- Automatically turn off torch if power depletes
- Respond to player input for toggling torch

DEPENDENCIES:
- torch object (instance of Torch)
- player object with a power system
- Config object for drain rate (TORCH.DRAIN_RATE)

USAGE:
import { createTorchSystem } from './torchSystem.js';
const torchSystem = createTorchSystem(torch, player);
engine.register(torchSystem);
========================================
NOTES:
- Torch visibility flickers when power is low (handled in Torch class)
- Torch system relies on TIME.fixedDeltaTime (config constant) for frame-rate independence
- Torch does not know the internal details of PowerSystem
========================================
TODO / LIMITATIONS:
- Flicker behavior is time-based using sin (no randomness)
- Torch radius is fixed per instance
- Intensity variation (dimness) handled by Torch class
- Rendering (gradient/falloff) handled externally
========================================
*/

//======================
// TORCH SYSTEM
//======================
import { TORCH } from '../config.js';

export function createTorchSystem(torch, player, { getDifficulty = () => 'normal' } = {}) {
   const baseRadius = TORCH.RADIUS;
   const upgradeBonusPerLevel = TORCH.UPGRADE_RADIUS_BONUS ?? 20;
   const reducedRadius = TORCH.MIN_RADIUS_WHEN_DRAINED ?? 50;

   function getUpgradedRadius() {
      const torchLevel = Math.max(1, player?.upgrades?.torch ?? 1);
      return baseRadius + (torchLevel - 1) * upgradeBonusPerLevel;
   }

   return {
      //---UPDATE---//
      update() {
         // Hard difficulty: force torch off, reduce radius
         if (getDifficulty() === 'hard') {
            if (torch.isOn) torch.isOn = false;
            player.toggleTorchIntent = false;
            torch.radius = reducedRadius;
            return;
         }

         // Update internal flicker timer
         torch.update();

         // Handle player intent to toggle torch
         if (player.actionIntent?.toggleTorch) {
            torch.tryToggle(!player.power.isEmpty());
            player.actionIntent.toggleTorch = false;
         }

         // Update radius based on power state (drain is handled by powerSystem)
         if (torch.isOn) {
            if (player.power.isEmpty()) {
               torch.isOn = false;
               //torch.radius = reducedRadius;
            } else {
               torch.radius = getUpgradedRadius();
            }
         }
      }
   };
}
//======================================
// END
//======================================
