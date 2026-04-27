//======================================
// UNIT TESTS - CAMERA SYSTEM
//======================================
/*
Tests for cameraSystem.js — verifies smooth lerp follow,
viewport scaling, snap-to, and offset computation.

Formula: camX = player.x - (viewportWidth / SCALE) / 2
With DEFAULT_SCALE = 2.0, viewportWidth = 640:
  camX = player.x - 320/2 = player.x - 160
*/

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config.js', () => ({
  CAMERA: { DEFAULT_SCALE: 2.0 },
}));

const { createCameraSystem } = await import('../systems/cameraSystem.js');

describe('CameraSystem', () => {
  let player;

  beforeEach(() => {
    player = { position: { x: 100, y: 50 } };
  });

  describe('initialization', () => {
    it('initializes camera to center on player position', () => {
      const cam = createCameraSystem(player, 640, 360);
      const offset = cam.getOffset();
      // camX = player.x - 160 = 100 - 160 = -60
      expect(offset.x).toBeCloseTo(-60, 0);
      // camY = player.y - 90 = 50 - 90 = -40
      expect(offset.y).toBeCloseTo(-40, 0);
    });

    it('uses player x and y as the center point', () => {
      player.position.x = 200;
      player.position.y = 100;
      const cam = createCameraSystem(player, 640, 360);
      const offset = cam.getOffset();
      expect(offset.x).toBeCloseTo(40, 0);  // 200 - 160
      expect(offset.y).toBeCloseTo(10, 0);  // 100 - 90
    });
  });

  describe('lerp follow', () => {
    it('camera moves toward player position over multiple updates', () => {
      const cam = createCameraSystem(player, 640, 360);
      const initial = cam.getOffset();

      // Move player significantly right and down
      player.position.x = 340;
      player.position.y = 250;

      // After one update, camera has moved partially toward target
      cam.update();
      const afterOne = cam.getOffset();
      expect(afterOne.x).not.toBe(initial.x);
      expect(afterOne.y).not.toBe(initial.y);

      // Camera is moving in the correct direction (toward target)
      // targetX = player.x - 160 = 180, targetY = player.y - 90 = 160
      // LERP_SPEED = 0.08: offset converges asymptotically as (1 - 0.92^n)
      // After 50 updates: offset ≈ 176 (98% of the way to target)
      // After 200 updates: offset ≈ 179.7 (99.8% of the way)
      for (let i = 0; i < 200; i++) cam.update();
      const later = cam.getOffset();
      expect(later.x).toBeGreaterThan(initial.x);  // moved right
      expect(later.y).toBeGreaterThan(initial.y);  // moved down
      // After 200 updates, should be very close to target (within 1 pixel)
      expect(Math.abs(later.x - 180)).toBeLessThan(1);
      expect(Math.abs(later.y - 160)).toBeLessThan(1);
    });

    it('camera lerp speed gradually reduces overshoot', () => {
      const cam = createCameraSystem(player, 640, 360);
      const offsets = [];
      player.position.x = 300;
      for (let i = 0; i < 10; i++) {
        cam.update();
        offsets.push(cam.getOffset().x);
      }
      // Each step should move less far (converging)
      const steps = [];
      for (let i = 1; i < offsets.length; i++) {
        steps.push(Math.abs(offsets[i] - offsets[i - 1]));
      }
      // Later steps should generally be smaller (lerp convergence)
      const earlyStep = steps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const lateStep = steps.slice(-3).reduce((a, b) => a + b, 0) / 3;
      expect(lateStep).toBeLessThan(earlyStep);
    });
  });

  describe('getOldCamPosition', () => {
    it('returns previous frame camera position', () => {
      const cam = createCameraSystem(player, 640, 360);
      cam.update();
      const oldPos = cam.getOldCamPosition();
      expect(typeof oldPos.x).toBe('number');
      expect(typeof oldPos.y).toBe('number');
    });
  });

  describe('scale', () => {
    it('defaults to CAMERA.DEFAULT_SCALE', () => {
      const cam = createCameraSystem(player, 640, 360);
      expect(cam.getScale()).toBe(2.0);
    });

    it('setScale() changes the scale', () => {
      const cam = createCameraSystem(player, 640, 360);
      cam.setScale(3.0);
      expect(cam.getScale()).toBe(3.0);
    });

    it('setScale() clamps to max of 4.0', () => {
      const cam = createCameraSystem(player, 640, 360);
      cam.setScale(10);
      expect(cam.getScale()).toBe(4.0);
    });

    it('setScale() clamps to min of 0.25', () => {
      const cam = createCameraSystem(player, 640, 360);
      cam.setScale(0.1);
      expect(cam.getScale()).toBe(0.25);
    });
  });

  describe('snapTo', () => {
    it('snaps camera to given world coordinates', () => {
      const cam = createCameraSystem(player, 640, 360);
      cam.snapTo(200, 150);
      const offset = cam.getOffset();
      // snapTo: camX = x - vw/2, camY = y - vh/2
      // with SCALE=2, vw=320, vh=180
      // camX = 200 - 160 = 40, camY = 150 - 90 = 60
      expect(offset.x).toBeCloseTo(40, 0);
      expect(offset.y).toBeCloseTo(60, 0);
    });
  });

  describe('edge cases', () => {
    it('handles player at origin', () => {
      player.position.x = 0;
      player.position.y = 0;
      const cam = createCameraSystem(player, 640, 360);
      const offset = cam.getOffset();
      expect(offset.x).toBeCloseTo(-160, 0);
      expect(offset.y).toBeCloseTo(-90, 0);
    });

    it('handles negative player positions', () => {
      player.position.x = -100;
      player.position.y = -50;
      const cam = createCameraSystem(player, 640, 360);
      const offset = cam.getOffset();
      expect(offset.x).toBeCloseTo(-260, 0);
      expect(offset.y).toBeCloseTo(-140, 0);
    });

    it('handles zero viewport dimensions gracefully', () => {
      player.position.x = 100;
      player.position.y = 50;
      const cam = createCameraSystem(player, 0, 0);
      expect(() => cam.update()).not.toThrow();
      expect(() => cam.getOffset()).not.toThrow();
    });
  });
});
