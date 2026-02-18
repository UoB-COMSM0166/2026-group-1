/*
========================================
VERSION: 2.2
SYSTEM: POWER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Power System: Manages player resource logic and depletion over time

RULES:
- Power system contains no rendering logic
- Power values must be frame-rate independent
========================================
RESPONSIBILITIES:
- Track current and maximum power values
- Drain power over time using deltaTime
- Provide utility checks for empty / low power
- Expose power as a percentage for UI and systems

DEPENDENCIES:
- constrain() helper function
- deltaTime provided by engine update loop

USAGE:
player.power = new PowerSystem();
player.power.drain(1, deltaTime);
========================================
NOTES:
- Power drain follows pattern:
    value -= rate * (deltaTime / 1000)
- All systems interact with power via methods, not raw values
========================================
TODO / LIMITATIONS:
- No regeneration logic yet
- Power thresholds are hard-coded
========================================
*/

//======================================
// POWER CLASS
//======================================
/* Encapsulates power resource logic for an entity (e.g., player) */

import { POWER } from '../config.js';

export class PowerSystem {
  constructor(config = POWER) {
    this.maxPower = config.MAX_POWER;
    this.current = config.CURRENT_POWER;
    this.lowPowerThreshold = config.LOW_POWER_THRESHOLD ?? 0.15;
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
