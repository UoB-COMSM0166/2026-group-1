/*
========================================
VERSION: 2.4
ENTITY: TORCH
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Torch entity: represents a light source held by the player
- Handles flicker, intensity, and on/off state based on available power

RULES:
- Torch class does not handle player input directly
- Torch class does not perform physics or collisions
- Torch class does not render itself; rendering is handled by renderSystem
========================================
DESIGN GOALS:
- Simulate natural flicker and dying-light behavior
- Keep torch logic modular and independent from other systems
- Provide smooth intensity values for dynamic lighting
========================================
RESPONSIBILITIES:
- Maintain on/off state
- Track internal flicker timer
- Compute visible intensity based on power percentage
- Provide isVisible() and getIntensity() methods for lighting system

DEPENDENCIES:
- Config object with RADIUS and FLICKER_POWER_THRESHOLD
- PowerSystem (for external gating; passed as argument to toggle)

USAGE:
import { Torch } from './torch.js';
const torch = new Torch(TORCH_CONFIG);
torch.update(deltaTime);
const intensity = torch.getIntensity(player.power.getPercent());
========================================
*/


//======================
// TORCH CLASS
//======================
export class Torch {
   constructor(config) {
      // Config-driven defaults
      this.radius = config.RADIUS;

      // Runtime state
      this.flickerTimer = 0;
      this.isOn = false;

      // Flicker behavior tuning
      this.flickerSpeed = 0.01; // how fast flicker oscillates
      this.flickerThreshold = config.FLICKER_POWER_THRESHOLD; // power % trigger
   }

   // Toggle torch on/off
   tryToggle(hasPower) {
      if (this.isOn) {
         this.isOn = false;
      } else if (hasPower) {
         this.isOn = true;
      }

      this.flickerTimer = 0;
   }

   // Update internal flicker timer
   update(deltaTime) {
      if (!this.isOn) return;
      this.flickerTimer += deltaTime;
   }

   // Returns true/false
   isVisible(powerPercent) {
      return this.getIntensity(powerPercent) > 0;
   }

   // Returns smooth intensity between 0 (off) and 1 (full brightness)
   getIntensity(powerPercent) {
      if (!this.isOn) return 0;

      // If player has enough power, full brightness
      if (powerPercent > this.flickerThreshold) return 1;

      // Low power: "dying bulb" flicker with jitter and dropouts
      const safePower = Math.max(0, Math.min(powerPercent ?? 0, this.flickerThreshold));
      const lowPowerRatio = 1 - safePower / this.flickerThreshold; // 0..1, higher = lower power
      const flickerSpeed = this.flickerSpeed * (8 + lowPowerRatio * 20);
      const t = this.flickerTimer * flickerSpeed;
      const baseWave = (Math.sin(t) + 1) / 2;
      const jitterWave = (Math.sin(t * 2.7 + Math.sin(t * 0.31) * 1.8) + 1) / 2;
      const combined = 0.45 * baseWave + 0.55 * jitterWave;

      // Create blackout bursts that happen more often as power gets lower
      const burstGate = (Math.sin(t * 0.7 + Math.sin(t * 0.13) * 2.0) + 1) / 2;
      const burstThreshold = 0.18 + lowPowerRatio * 0.42;

      if (burstGate < burstThreshold) return 0;

      // Additional short micro-dropouts for a sputtering effect
      const sputterGate = (Math.sin(t * 5.9) + 1) / 2;
      if (sputterGate < 0.12 + lowPowerRatio * 0.18) return 0;

      // Uneven brightness when lit
      return 0.35 + 0.65 * combined;
   }
}
//======================================
// END
//======================================
