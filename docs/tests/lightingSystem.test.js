//======================================
// UNIT TESTS - LIGHTING SYSTEM
//======================================
/*
Tests for lightingSystem.js — verifies light source aggregation,
torch on/off, ambient fallback, sonar and glow lights.
*/

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config.js', () => ({
  LIGHTING: {
    PLAYER_AMBIENT: { RADIUS: 40, BRIGHTNESS: 0.3 },
  },
  TORCH: { RADIUS: 120 },
}));

const { createLightingSystem } = await import('../systems/lightingSystem.js');

describe('LightingSystem', () => {
  function makePlayer(overrides = {}) {
    return {
      position: { x: 100, y: 100 },
      torch: { isOn: false, getIntensity: jest.fn(() => 0.8) },
      power: { getPercent: jest.fn(() => 0.75) },
      ...overrides,
    };
  }

  //======================================
  // TORCH LIGHT SOURCE
  //======================================

  describe('torch light source', () => {
    it('returns torch light source when torch is on', () => {
      const player = makePlayer({ torch: { isOn: true, getIntensity: () => 0.8, radius: 100 } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const torchLight = sources.find(s => s.kind === 'torch');
      expect(torchLight).toBeDefined();
      expect(torchLight.x).toBe(100);
      expect(torchLight.y).toBe(100);
      expect(torchLight.radius).toBe(100);  // base radius = TORCH.RADIUS
      expect(torchLight.intensity).toBe(0.8);
    });

    it('torch light source radius reflects torch.upgradeLevel (base = level 1)', () => {
      const player = makePlayer({ torch: { isOn: true, getIntensity: () => 0.8, radius: 100 } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const torchLight = sources.find(s => s.kind === 'torch');
      expect(torchLight.radius).toBe(100);
    });

    it('torch light source radius scales with upgraded torch radius', () => {
      // Level 2: base 100 + UPGRADE_RADIUS_BONUS 22 = 122
      const player = makePlayer({ torch: { isOn: true, getIntensity: () => 0.8, radius: 122 } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const torchLight = sources.find(s => s.kind === 'torch');
      expect(torchLight.radius).toBe(122);
    });

    it('torch light source uses player.torch.radius not a fixed constant', () => {
      // Confirm the light source radius comes from the torch object's radius,
      // not from any internal fixed value — two different torch radii give two results
      const base = 100;
      const upgraded = 200;
      const ls1 = createLightingSystem(makePlayer({ torch: { isOn: true, getIntensity: () => 0.8, radius: base } }));
      const ls2 = createLightingSystem(makePlayer({ torch: { isOn: true, getIntensity: () => 0.8, radius: upgraded } }));
      const r1 = ls1.getLightSources().find(s => s.kind === 'torch').radius;
      const r2 = ls2.getLightSources().find(s => s.kind === 'torch').radius;
      expect(r1).not.toBe(r2);
      expect(r1).toBe(base);
      expect(r2).toBe(upgraded);
    });

    it('does not include torch light when torch is off', () => {
      const player = makePlayer({ torch: { isOn: false } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const torchLight = sources.find(s => s.kind === 'torch');
      expect(torchLight).toBeUndefined();
    });

    it('torch intensity uses power percentage from player.power', () => {
      const player = makePlayer({
        torch: { isOn: true, getIntensity: jest.fn((p) => p * 0.8) },
        power: { getPercent: jest.fn(() => 0.5) },
      });
      const ls = createLightingSystem(player);
      ls.getLightSources();
      expect(player.torch.getIntensity).toHaveBeenCalledWith(0.5);
    });

    it('torch with zero intensity is excluded', () => {
      const player = makePlayer({ torch: { isOn: true, getIntensity: () => 0 } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const torchLight = sources.find(s => s.kind === 'torch');
      expect(torchLight).toBeUndefined();
    });
  });

  //======================================
  // AMBIENT FALLBACK
  //======================================

  describe('ambient fallback when torch off', () => {
    it('returns ambient light source when torch is off', () => {
      const player = makePlayer({ torch: { isOn: false } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const ambient = sources.find(s => s.kind === 'ambient');
      expect(ambient).toBeDefined();
      expect(ambient.radius).toBe(40);
      expect(ambient.intensity).toBe(0.3);
    });

    it('torch off uses player position for ambient light', () => {
      const player = makePlayer({ torch: { isOn: false }, position: { x: 250, y: 180 } });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const ambient = sources.find(s => s.kind === 'ambient');
      expect(ambient.x).toBe(250);
      expect(ambient.y).toBe(180);
    });
  });

  //======================================
  // SONAR LIGHTS
  //======================================

  describe('sonar lights', () => {
    it('includes sonar lights from getSonarLights callback', () => {
      const player = makePlayer({ torch: { isOn: false } });
      const sonarLights = [
        { kind: 'sonar', x: 200, y: 150, radius: 80, intensity: 0.6 },
        { kind: 'sonar', x: 300, y: 200, radius: 60, intensity: 0.4 },
      ];
      const ls = createLightingSystem(player, () => sonarLights);
      const sources = ls.getLightSources();
      expect(sources.filter(s => s.kind === 'sonar').length).toBe(2);
    });

    it('handles empty sonar lights array', () => {
      const player = makePlayer();
      const ls = createLightingSystem(player, () => []);
      const sources = ls.getLightSources();
      expect(sources.filter(s => s.kind === 'sonar').length).toBe(0);
    });

    it('handles null/undefined getSonarLights', () => {
      const player = makePlayer();
      const ls = createLightingSystem(player, null);
      expect(() => ls.getLightSources()).not.toThrow();
    });
  });

  //======================================
  // GLOW LIGHTS
  //======================================

  describe('glow lights', () => {
    it('includes glow lights from getGlowLights callback', () => {
      const player = makePlayer({ torch: { isOn: false } });
      const glowLights = [
        { kind: 'glow', x: 150, y: 120, radius: 50, intensity: 0.9 },
      ];
      const ls = createLightingSystem(player, () => [], () => glowLights);
      const sources = ls.getLightSources();
      expect(sources.filter(s => s.kind === 'glow').length).toBe(1);
    });

    it('handles null/undefined getGlowLights', () => {
      const player = makePlayer();
      const ls = createLightingSystem(player, () => [], null);
      expect(() => ls.getLightSources()).not.toThrow();
    });
  });

  //======================================
  // EDGE CASES
  //======================================

  describe('edge cases', () => {
    it('returns empty array when player is null', () => {
      const ls = createLightingSystem(null);
      const sources = ls.getLightSources();
      expect(sources).toEqual([]);
    });

    it('uses position.x/y fallbacks when player.position is missing', () => {
      const player = { x: 77, y: 88, torch: { isOn: false } };
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      const ambient = sources.find(s => s.kind === 'ambient');
      expect(ambient.x).toBe(77);
      expect(ambient.y).toBe(88);
    });

    it('handles player with no torch object (torch-less mode)', () => {
      const player = makePlayer({ torch: undefined });
      const ls = createLightingSystem(player);
      const sources = ls.getLightSources();
      // Should fall back to ambient
      const ambient = sources.find(s => s.kind === 'ambient');
      expect(ambient).toBeDefined();
    });
  });

  //======================================
  // MULTIPLE LIGHT SOURCES
  //======================================

  describe('multiple light sources', () => {
    it('can return torch + sonar + glow simultaneously', () => {
      const player = makePlayer({ torch: { isOn: true, getIntensity: () => 0.8 } });
      const ls = createLightingSystem(
        player,
        () => [{ kind: 'sonar', x: 200, y: 150, radius: 80, intensity: 0.5 }],
        () => [{ kind: 'glow', x: 300, y: 200, radius: 40, intensity: 0.9 }]
      );
      const sources = ls.getLightSources();
      expect(sources.length).toBe(3);
      expect(sources.some(s => s.kind === 'torch')).toBe(true);
      expect(sources.some(s => s.kind === 'sonar')).toBe(true);
      expect(sources.some(s => s.kind === 'glow')).toBe(true);
    });
  });
});
