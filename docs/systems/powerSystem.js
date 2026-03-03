/*
========================================
VERSION: 2.4
SYSTEM: POWER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Manages the player's energy resource (power)
- Tracks current and maximum power levels
- Provides frame-rate independent draining and utility checks
- Exposes percentage-based values for UI and other systems

RULES:
- No rendering logic inside the system
- Do not modify other systems directly
- Power depletion must be consistent across frame rates
========================================
DESIGN GOALS:
- Keep power logic separate from player movement or rendering
- Provide simple, reusable interface for checking, draining, and querying power
- Ensure other systems (e.g., torch) interact only via methods
========================================
RESPONSIBILITIES:
- Track current and max power values
- Drain power using deltaTime
- Provide checks for empty or low power
- Return percentage of remaining power for UI or system logic

DEPENDENCIES:
- deltaTime provided by engine update loop
- Optional: entity object if interacting with components (e.g., torch)
- constrain() helper for value clamping

USAGE:
import { PowerSystem, createPowerSystem } from './powerSystem.js';

const powerSystem = createPowerSystem(player);
engine.register(powerSystem);
========================================
Notes:
- Power drain formula: current -= rate * (deltaTime / 1000)
- All interactions with power should use the provided methods
========================================
TODO / LIMITATIONS:
- No automatic regeneration yet
- Thresholds are currently fixed
- UI representation must be implemented separately
========================================
*/

//======================================
// POWER CLASS
//======================================
import { POWER } from '../config.js';

export class PowerSystem {
  constructor(config = POWER) {
    this.maxPower = config.MAX_POWER;
    this.current = config.CURRENT_POWER;
    this.lowPowerThreshold = config.LOW_POWER_THRESHOLD;
  }
  
  drain(rate, deltaTime) {
    this.current -= rate * (deltaTime / 1000);
    this.current = Math.max(0, Math.min(this.current, this.maxPower));
  }
  
  isEmpty() {
    return this.current <= 0;
  }

  isLow(threshold = this.lowPowerThreshold) {
    return this.current <= this.maxPower * threshold;
  }

  getPercent() {
    return this.current / this.maxPower;
  }
}
//======================================
// POWER SYSTEM
//======================================

export function createPowerSystem(entity, config = POWER) {
  const power = new PowerSystem(config);
  
  // returning object literals → commas between entries
  return {
    power,
    
    //---UPDATE HOOK---//
    update(deltaTime, drainRate = 0) {
      if (drainRate > 0) {
        power.drain(drainRate, deltaTime);
        // auto-handle power-empty state if needed
        if (power.isEmpty() && entity.torch) {
          entity.torch.isOn = false;
        }
      }
    },
    
    //---DRAW HOOK---//
    draw() {
      /* (optional: for UI representation)
         Could draw a power bar or other UI element here or
         call a separate drawPowerMeter(entity, power) helper */
    }
  };
}
//======================================
// END
//======================================
