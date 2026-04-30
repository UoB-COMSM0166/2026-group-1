/*
========================================
VERSION: 2.4
COMPONENT: POWER
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Tracks the player's energy resource (power)
- Frame-rate independent draining and utility checks
- Exposes percentage-based values for UI and other systems

RULES:
- No rendering logic inside this component
- No knowledge of other systems or entities
- Power depletion must be consistent across frame rates

DEPENDENCIES:
- TIME.fixedDeltaTime from config (constant, not passed as parameter)

USAGE:
import { PowerSystem } from './entities/components/power.js';
const power = new PowerSystem(POWER);
========================================
*/

import { POWER, TIME } from '../../config.js';

export class PowerSystem {
   constructor(config = POWER) {
      this.maxPower = config.MAX_POWER;
      this.baseMaxPower = config.MAX_POWER;  // original cap, never changed after construction
      this.initialPower = config.CURRENT_POWER;
      this.current = config.CURRENT_POWER;  // overridden to maxPower after Player/createPowerSystem init
      this.lowPowerThreshold = config.LOW_POWER_THRESHOLD;
      this.drainRate = config.DRAIN_RATE;
      this.upgradeBonusPerLevel = config.UPGRADE_MAX_POWER_BONUS ?? 20;
      this.currentUpgradeLevel = 1;           // tracks applied upgrade level for setMaxPower
   }

   reset() {
      this.current = this.maxPower;  // always start full
   }

   // Scales maxPower based on upgrade level. Level 1 = base, higher = more capacity.
   // Called every frame so level changes are picked up immediately.
   setMaxPower(level) {
      const safeLevel = Math.max(1, level);
      const prevLevel = this.currentUpgradeLevel;
      const prevBonus = (Math.max(1, prevLevel) - 1) * this.upgradeBonusPerLevel;
      const newBonus = (safeLevel - 1) * this.upgradeBonusPerLevel;
      this.maxPower = this.baseMaxPower + newBonus;
      this.currentUpgradeLevel = safeLevel;
      // On upgrade, boost current power — gives player a meaningful reward
      if (safeLevel > prevLevel) {
         this.current = Math.min(this.current + this.upgradeBonusPerLevel, this.maxPower);
      } else {
         this.current = Math.min(this.current, this.maxPower);
      }
   }

   drain(rate = this.drainRate) {
      this.current = Math.max(0, Math.min(this.current - rate * TIME.fixedDeltaTime, this.maxPower));
   }

   charge(rate) {
      this.current = Math.min(this.maxPower, this.current + rate * TIME.fixedDeltaTime);
   }

   isEmpty() {
      return this.current <= 0;
   }

   isLow(threshold = this.lowPowerThreshold) {
      return this.current <= this.maxPower * threshold;
   }

   // Returns fill ratio for the power bar UI (0 = empty, 1 = full).
   getPercent() {
      return Math.max(0, Math.min(1, this.current / this.maxPower));
   }
}
