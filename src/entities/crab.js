/*
========================================
VERSION: 1.0
ENTITY: CRAB
AUTHOR: Monal Gupta
DESCRIPTION:
- Crab enemy entity
- patrols left/right or up/down between boundaries
- Extends Hitbox so isColliding works directly
========================================
*/

import { Hitbox } from '../systems/hitboxSystem.js';

export class Crab extends Hitbox {
  constructor(x, y, w = 20, h = 14, patrolDistance = 64, speed = 0.8) {
    //Note: Hitbox expects top-left corner, x/y from roomSystem are already center-based
    super(x - w / 2, y - h / 2, w, h);

    this.spawnX = x;
    this.patrolDistance = patrolDistance;
    this.speed = speed;
    this.direction = 1;   // 1 = right, -1 = left
    this.facing = 1;

    //for isColliding
    this.nextPos = createVector(this.position.x, this.position.y);
    this.previousPos = createVector(this.position.x, this.position.y);
  }
}