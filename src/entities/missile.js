/*
========================================
VERSION: 1.0
ENTITY: MISSILE
AUTHOR: Archie Brown
DESCRIPTION:
- Missile entity class: stores missile state and homing behavior
- Missiles track a target square and move towards it
- Handles self-removal when target is reached or out of bounds

RULES:
- Missile class does not handle rendering or collision
- Systems are responsible for managing missile lifecycle
- Missiles home in on target position with constant velocity

DESIGN GOALS:
- Keep missile logic separate from physics and rendering
- Enable simple homing behavior with target tracking
- Allow missiles to be fired from player position

RESPONSIBILITIES:
- Maintain missile positional and velocity data
- Track target position
- Calculate movement towards target
- Detect when target is reached

DEPENDENCIES:
- config object: defines MISSILE settings
- Hitbox class for spatial properties

USAGE:
import { Missile } from './entities/missile.js';
const missile = new Missile(startX, startY, targetX, targetY);
engine.register(missileSystem); // missileSystem manages missiles
========================================
*/

//======================
// MISSILE CLASS
//======================
import { MISSILE } from '../config.js';
import { Hitbox } from '../systems/hitboxSystem.js';

export class Missile extends Hitbox {
  constructor(startX, startY, targetX, targetY) {
    const width = MISSILE?.WIDTH ?? 8;
    const height = MISSILE?.HEIGHT ?? 8;
    
    // Hitbox expects corner coordinates
    const cornerX = startX - width / 2;
    const cornerY = startY - height / 2;

    super(cornerX, cornerY, width, height);

    this.targetX = targetX;
    this.targetY = targetY;
    this.velocity = createVector(0, 0);
    this.speed = MISSILE?.SPEED ?? 5;
    this.maxDistance = MISSILE?.MAX_DISTANCE ?? 2000;
    this.distanceTraveled = 0;

    // Calculate initial velocity towards target
    this.recalculateVelocity();
  }

  recalculateVelocity() {
    const dx = this.targetX - this.position.x;
    const dy = this.targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.velocity.x = (dx / distance) * this.speed;
      this.velocity.y = (dy / distance) * this.speed;
    }
  }

  update() {
    // Move towards target
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Track distance traveled
    const stepDistance = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.y * this.velocity.y
    );
    this.distanceTraveled += stepDistance;
  }

  isAtTarget(threshold = 15) {
    const dx = this.targetX - this.position.x;
    const dy = this.targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < threshold;
  }

  isOutOfBounds() {
    return this.distanceTraveled > this.maxDistance;
  }

  getXPosition() {
    return this.position.x;
  }

  getYPosition() {
    return this.position.y;
  }
}

//======================================
// END
//======================================
