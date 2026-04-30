/*
========================================
VERSION: 2.4
SYSTEM: POWER SYSTEM
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Orchestrates the player's power component each game tick
- Applies torch drain multiplier when torch is active
- Enforces the no-power = no-torch invariant

RULES:
- No rendering logic inside the system
- Do not modify other systems directly

DEPENDENCIES:
- PowerSystem component (entities/components/power.js)
- TORCH.DRAIN_RATE from config

USAGE:
import { createPowerSystem } from './powerSystem.js';

const powerSystem = createPowerSystem(player);
engine.register(powerSystem);
========================================
*/

//======================================
// POWER SYSTEM
//======================================
import { POWER, DIFFICULTY } from '../config.js';
import { PowerSystem } from '../entities/components/power.js';

export { PowerSystem };

export function createPowerSystem(entity, { getDifficulty = () => "easy", config = POWER } = {}) {
   if (!entity.power) {
      entity.power = new PowerSystem(config);
      entity.power.current = entity.power.maxPower;  // start full
   }
   const power = entity.power;

   return {
      power,

      //---UPDATE HOOK---//
      update() {
         // Sync maxPower with current upgrade level
         const upgradeLevel = entity?.upgrades?.power ?? 1;
         power.setMaxPower(upgradeLevel);

         const diff = DIFFICULTY[getDifficulty()] ?? DIFFICULTY.easy;
         let rate = diff.POWER_DRAIN;

         if (entity.torch?.isOn) {
            rate *= diff.TORCH_DRAIN;
         }

         power.drain(rate);

         if (power.isEmpty() && entity.torch) {
            entity.torch.isOn = false;
         }
      }
   }
};
//======================================
// END
//======================================