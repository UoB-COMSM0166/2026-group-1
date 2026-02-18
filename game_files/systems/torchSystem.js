/*
========================================
VERSION: 2.4
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
- Ensure frame-rate independent updates using deltaTime
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
- Torch system relies on deltaTime for frame-rate independence
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

export function createTorchSystem(torch, player, { drainRate = TORCH.DRAIN_RATE } = {}) {
  return {
    //---UPDATE---//
    update(deltaTime) {
      // Update internal flicker timer
      torch.update(deltaTime);

      // Handle player intent to toggle torch
      if (player.intent?.toggleTorch) {
        torch.tryToggle(!player.power.isEmpty());
        player.intent.toggleTorch = false;
      }

      // Drain player power if torch is active
      if (torch.isOn) {
        player.power.drain(drainRate, deltaTime);

        // Turn off torch if power depleted
        if (player.power.isEmpty()) torch.isOn = false;
      }
    }
  };
}
//======================================
// END
//======================================
