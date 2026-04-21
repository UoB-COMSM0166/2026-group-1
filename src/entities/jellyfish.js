/*
=============================
VERSION: 1.0
ENTITY: JELLYFISH
AUTHOR: Monal Gupta
DESCRIPTION:
- Basic Jellyfish enemy entity
- floats with sin-wave vertical motion ( up - down as well as side)
- Extends Hitbox so isColliding works directly
==================================
*/

import { Hitbox } from '../systems/hitboxSystem.js';

export class Jellyfish extends Hitbox {
  constructor(x, y, w = 18, h = 22, amplitude = 32, frequency = 1, driftSpeed = 0.3) {
    super(x - w / 2, y - h / 2, w, h);

    this.spawnX = x;
    this.spawnY = y;

    this.amplitude = amplitude;    //up - down distance    
    this.frequency = frequency;    //  pulse speed  
    this.driftSpeed = driftSpeed;      // Horizontal drift speed
    
    this.time = Math.random() * Math.PI * 2;  // Random phase offset so jellies don't sync
    this.driftDirection = Math.random() < 0.5 ? 1 : -1; 
    this.driftDistance = 0;
    this.maxDrift = 48; 
    this.pulsePhase = 0;  // For animation sync
    
    this.nextPos = createVector(this.position.x, this.position.y);
    this.previousPos = createVector(this.position.x, this.position.y);
  }

  // Optional: Add variant types
  static createVariant(type, x, y) {
    switch(type) {
      case 'slow':
        return new Jellyfish(x, y, 18, 22, 24, 1.0, 0.2);
      case 'fast':
        return new Jellyfish(x, y, 16, 20, 40, 2.5, 0.5);
      case 'stationary':
        return new Jellyfish(x, y, 20, 24, 28, 1.2, 0);
      default:
        return new Jellyfish(x, y);
    }
  }
}