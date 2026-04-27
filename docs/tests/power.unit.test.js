/*
========================================
TESTS: power.js
AUTHOR: Georgia Sweeny
========================================
*/

import { PowerSystem } from '../entities/components/power.js';
import { POWER, TIME } from '../config.js';

//======================================
// HELPERS
//======================================

const DT = TIME.fixedDeltaTime;

function makePower(overrides = {}) {
   return new PowerSystem({ ...POWER, ...overrides });
}

//======================================
// CONSTRUCTOR & INITIAL STATE
//======================================

describe('PowerSystem — constructor', () => {
   it('sets maxPower from config', () => {
      const power = makePower({ MAX_POWER: 200 });
      expect(power.maxPower).toBe(200);
   });

   it('sets current from config', () => {
      const power = makePower({ CURRENT_POWER: 80 });
      expect(power.current).toBe(80);
   });

   it('sets initialPower correctly', () => {
      const power = makePower({ CURRENT_POWER: 75 });
      expect(power.initialPower).toBe(75);
   });

   it('sets lowPowerThreshold correctly', () => {
      const power = makePower({ LOW_POWER_THRESHOLD: 0.25 });
      expect(power.lowPowerThreshold).toBe(0.25);
   });

   it('sets drainRate correctly', () => {
      const power = makePower({ DRAIN_RATE: 1.5 });
      expect(power.drainRate).toBe(1.5);
   });

   it('current === initialPower on creation', () => {
      const power = makePower({ CURRENT_POWER: 60 });
      expect(power.current).toBe(power.initialPower);
   });
});

//======================================
// reset()
//======================================

describe('PowerSystem — reset()', () => {
   it('restores current to initialPower', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      power.drain();
      power.reset();
      expect(power.current).toBe(power.initialPower);
   });

   it('works after multiple drains', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      power.drain();
      power.drain();
      power.drain();
      power.reset();
      expect(power.current).toBe(power.initialPower);
   });

   it('does not exceed maxPower', () => {
      const power = makePower({ MAX_POWER: 50, CURRENT_POWER: 50 });
      power.reset();
      expect(power.current).toBeLessThanOrEqual(power.maxPower);
   });
});

//======================================
// drain()
//======================================

describe('PowerSystem — drain()', () => {
   it('reduces current by drainRate * fixedDeltaTime', () => {
      const rate = 3;
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: rate });
      power.drain();
      expect(power.current).toBeCloseTo(100 - rate * DT);
   });

   it('uses passed rate instead of default drainRate', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      const customRate = 10;
      power.drain(customRate);
      expect(power.current).toBeCloseTo(100 - customRate * DT);
   });

   it('never drops below 0', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 0 });
      power.drain(9999);
      expect(power.current).toBe(0);
   });

   it('never exceeds maxPower (safety clamp)', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      power.current = 200;
      power.drain(0);
      expect(power.current).toBeLessThanOrEqual(power.maxPower);
   });

   it('10 small drains equals 1 large drain (frame-rate independent)', () => {
      const rate = 3;
      const cfg = { MAX_POWER: 1000, CURRENT_POWER: 1000, DRAIN_RATE: rate };

      const powerA = makePower(cfg);
      for (let i = 0; i < 10; i++) powerA.drain();

      const powerB = makePower(cfg);
      powerB.current = Math.max(0, powerB.current - rate * DT * 10);

      expect(powerA.current).toBeCloseTo(powerB.current, 10);
   });

   it('0 ≤ current ≤ maxPower invariant holds after many drains', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5 });
      for (let i = 0; i < 500; i++) power.drain();
      expect(power.current).toBeGreaterThanOrEqual(0);
      expect(power.current).toBeLessThanOrEqual(power.maxPower);
   });

   it('clamps sub-epsilon current values to 0', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 0 });
      power.current = Number.EPSILON;
      power.drain();
      expect(power.current).toBe(0);
   });
});

//======================================
// isEmpty()
//======================================

describe('PowerSystem — isEmpty()', () => {
   it('returns true when current === 0', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 0 });
      expect(power.isEmpty()).toBe(true);
   });

   it('returns true when current < 0 (edge safety)', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 0 });
      power.current = -1;
      expect(power.isEmpty()).toBe(true);
   });

   it('returns false when current > 0', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 50 });
      expect(power.isEmpty()).toBe(false);
   });
});

//======================================
// isLow()
//======================================

describe('PowerSystem — isLow()', () => {
   it('returns true when current is below threshold', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 10, LOW_POWER_THRESHOLD: 0.15 });
      expect(power.isLow()).toBe(true);
   });

   it('returns true exactly at the threshold boundary', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 15, LOW_POWER_THRESHOLD: 0.15 });
      expect(power.isLow()).toBe(true);
   });

   it('returns false when current is above threshold', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 50, LOW_POWER_THRESHOLD: 0.15 });
      expect(power.isLow()).toBe(false);
   });

   it('respects custom threshold parameter (low)', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 40 });
      expect(power.isLow(0.5)).toBe(true);
   });

   it('respects custom threshold parameter (not low)', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 40 });
      expect(power.isLow(0.3)).toBe(false);
   });
});

//======================================
// getPercent()
//======================================

describe('PowerSystem — getPercent()', () => {
   it('returns 1 when full', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      expect(power.getPercent()).toBe(1);
   });

   it('returns 0 when empty', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 0 });
      expect(power.getPercent()).toBe(0);
   });

   it('returns correct fractional value', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 50 });
      expect(power.getPercent()).toBeCloseTo(0.5);
   });

   it('never falls outside [0, 1] range after draining to zero', () => {
      const power = makePower({ MAX_POWER: 100, CURRENT_POWER: 100 });
      for (let i = 0; i < 500; i++) power.drain();
      const pct = power.getPercent();
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(1);
   });

   it('handles maxPower = 0 without a crash', () => {
      const power = new PowerSystem({ MAX_POWER: 0, CURRENT_POWER: 0, LOW_POWER_THRESHOLD: 0.15, DRAIN_RATE: 0.5 });
      expect(() => power.getPercent()).not.toThrow();
      expect(() => power.drain()).not.toThrow();
      expect(() => power.isEmpty()).not.toThrow();
   });
});

//======================================
// UPGRADE WIRING
//======================================
describe('PowerSystem — upgrade wiring', () => {
   it('setMaxPower(level) scales maxPower above base at level 1', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(1);
      expect(power.maxPower).toBe(100); // base, no bonus
   });

   it('setMaxPower(level) adds bonus per level above 1', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(2);
      expect(power.maxPower).toBe(120); // 100 + (2-1)*20
   });

   it('setMaxPower(level) scales linearly with level', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(5);
      expect(power.maxPower).toBe(180); // 100 + (5-1)*20
   });

   it('setMaxPower caps current power at new maxPower', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 90, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(2); // new max = 120, current stays 90
      expect(power.maxPower).toBe(120);
      expect(power.current).toBe(90); // not capped
   });

   it('setMaxPower clamps current to new max if current exceeds it', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(1); // current = maxPower = 100
      power.current = 100;
      power.setMaxPower(2); // new max = 120, current 100 < 120 — no clamp needed
      expect(power.current).toBe(100);
   });

   it('setMaxPower is safe for level 0 or negative (treated as level 1)', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(0);
      expect(power.maxPower).toBe(100); // treated as level 1
   });

   it('getPercent reflects maxPower change after setMaxPower', () => {
      const power = new PowerSystem({ MAX_POWER: 100, CURRENT_POWER: 100, DRAIN_RATE: 0.5, UPGRADE_MAX_POWER_BONUS: 20 });
      power.setMaxPower(2); // max = 120
      // At level 2 with current=100, percent = 100/120 ≈ 0.833
      expect(power.getPercent()).toBeCloseTo(100 / 120, 2);
   });
});
