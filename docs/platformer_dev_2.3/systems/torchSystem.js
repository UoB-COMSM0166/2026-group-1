/*
========================================
VERSION: 2.2
SYSTEM: TORCH SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Torch Class: Manages flicker, on/off state, and visibility
- Torch System: Updates player power and applies torch lighting
- Torch Instance: Creates torch object to use in system, injects
  into engine

RULES:
- No drawing in update functions
- No state changes in draw functions
- Torch system must remain ignorant of power implementation details
========================================
RESPONSIBILITIES:
- Update torch flicker timing
- Drain player power while torch is active
- Disable torch when power is depleted
- Determine whether torch light is visible

DEPENDENCIES:
- torch object (Torch class instance)
- player object (access to power system)
- applyTorchLight(x, y, radius) rendering helper

USAGE:
const torchSystem = createTorchSystem(torch, player);
engine.register(torchSystem);
========================================
NOTES:
- Torch visibility flickers when power is low
- Torch logic uses deltaTime for frame-rate independence
- Torch does not know what "power" is, only whether it exists
========================================
TODO / LIMITATIONS:
- Flicker behaviour is time-based only, using sin (no randomness)
- Torch radius is fixed per instance (want to upgrade this instance)

- No intensity (dimness) variation during flicker yet
- No gradient effect (falloff) on light yet
========================================
*/



//======================
// TORCH CLASS
//======================
import { TORCH } from '../config.js';

export class Torch {
  constructor(config) {
    // Config-driven defaults
    this.radius = config.RADIUS;

    // Runtime state
    this.flickerTimer = 0;
    this.isOn = false;

    // Runtime-only behavior tuning
    this.flickerSpeed = 0.01; // how fast flicker oscillates
    this.flickerThreshold = TORCH.FLICKER_POWER_THRESHOLD; // diff threshold
  }

  tryToggle(hasPower) {
    if (!this.isOn && hasPower) {
      this.isOn = true;
      this.flickerTimer = 0;
    } else {
      this.isOn = false;
      this.flickerTimer = 0;
    }
  }

  update(deltaTime) {
    if (!this.isOn) return;
    this.flickerTimer += deltaTime;
  }

  isVisible(powerPercent) {
    if (!this.isOn) return false;
    if (powerPercent > this.flickerThreshold) return true;

    const t = this.flickerTimer * this.flickerSpeed;
    return sin(t) > 0;
  }
}

//======================
// TORCH SYSTEM
//======================
export function createTorchSystem(torch, player, { drainRate = TORCH.DRAIN_RATE } = {}) {
  // returning object literals → commas between entries
  return {
    
    //---UPDATE---//
    update(deltaTime) {
      torch.update(deltaTime);

      if (player.intent?.toggleTorch) {
        torch.tryToggle(!player.power.isEmpty());
        player.intent.toggleTorch = false;
      }

      if (torch.isOn) {
        player.power.drain(drainRate, deltaTime);
        if (player.power.isEmpty()) torch.isOn = false;
      }
    },
    //---DRAW---//
    draw() {
      // lighting handled by render system
    }
  };
}

//======================================
// END
//======================================
