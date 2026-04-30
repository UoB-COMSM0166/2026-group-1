/*
========================================
VERSION: 1.1
SYSTEM: MISSILE SYSTEM
AUTHOR: Ben Mounce
DESCRIPTION:
- Manages underwater missiles launched by the player
- Auto-targeting system for enemies and breakable walls
- Handles missile movement, collision, AoE destruction, and rendering

RULES:
- Missiles lock on to nearest valid target
- Missiles are destroyed on impact or timeout
- Destroys adjacent breakable walls in EASY mode
========================================
*/

import { MISSILE, GAME, TIME } from '../config.js';
import { isColliding, Hitbox } from './hitboxSystem.js';

class Missile extends Hitbox {
    constructor(x, y, target, facing = 1, speed = MISSILE.SPEED, turnSpeed = MISSILE.TURN_SPEED) {
        super(x, y, MISSILE.SIZE, MISSILE.SIZE);
        this.position = createVector(x, y);
        this.velocity = createVector(facing * speed, 0);
        this.target = target;
        this.speed = speed;
        this.turnSpeed = turnSpeed;
        this.lifetime = MISSILE.LIFETIME;
        this.pendingDestroy = false;
        this.nextPos = createVector(x, y);
        this.bubbles = [];
    }

    update() {
        const dt = TIME.fixedDeltaTime;
        this.lifetime -= dt * 1000;
        if (this.lifetime <= 0) {
            this.pendingDestroy = true;
            return;
        }

        if (random() < 0.4) {
            const angle = this.velocity.heading();
            const backDist = this.w;
            const bx = this.position.x - cos(angle) * backDist;
            const by = this.position.y - sin(angle) * backDist;
            this.bubbles.push({
                x: bx,
                y: by + (random(-2, 2)),
                size: random(2, 5),
                life: 255
            });
        }

        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.y -= 0.5;
            b.x += random(-0.2, 0.2);
            b.life -= 5;
            if (b.life <= 0) this.bubbles.splice(i, 1);
        }

        if (this.target && !this.target.pendingDestroy && !this.target.isDestroyed && this.target.position) {
            const targetPos = createVector(this.target.position.x, this.target.position.y);
            const missilePos = this.position;
            const dist = p5.Vector.dist(targetPos, missilePos);

            const desiredDirection = p5.Vector.sub(targetPos, missilePos).normalize();
            const currentDirection = this.velocity.copy().normalize();
            let effectiveTurnSpeed = this.turnSpeed;
            if (dist < 100) effectiveTurnSpeed *= 4;

            const steer = p5.Vector.lerp(currentDirection, desiredDirection, effectiveTurnSpeed * dt);
            steer.normalize();
            this.velocity = steer.mult(this.speed);
        }

        const step = p5.Vector.mult(this.velocity, dt);
        this.position.add(step);
        this.nextPos.set(this.position);
        this.x = this.position.x;
        this.y = this.position.y;
    }
}

export function createMissileSystem(player, getTargets, getWalls, soundSystem = null, particleSystem = null) {
    let missiles = [];
    let lastFireTime = 0;
    let currentTarget = null;
    let lastFiredTarget = null;
    let lastFiredTime = -1;
    let fireFeedbackTimer = 0;
    const FIRE_FEEDBACK_DURATION = 0.25;

    function findNearestTarget(px, py) {
        let nearest = null;
        let minDistSq = Infinity;

        const enemyList = typeof getTargets === 'function' ? getTargets() : (getTargets ?? []);
        const wallRes = typeof getWalls === 'function' ? getWalls() : (getWalls ?? []);
        const breakableWalls = (Array.isArray(wallRes) ? wallRes : []).filter(w => w.isBreakable);
        const allPotentialTargets = [...enemyList, ...breakableWalls];

        for (const target of allPotentialTargets) {
            if (target.pendingDestroy || target.isDestroyed) continue;
            const tx = target.position ? target.position.x : target.x;
            const ty = target.position ? target.position.y : target.y;
            if (tx === undefined || ty === undefined) continue;

            const halfW = (target.w || target.width || target.getWidth?.() || 0) / 2;
            
            //gets distance to centre
            let dx = tx - px;
            const dy = ty - py;

            //finds closest forward-facing edge
            if (halfW > 0) {
                if (player.facing > 0 && tx + halfW >= px) dx = Math.max(0.1, dx); 
                if (player.facing < 0 && tx - halfW <= px) dx = Math.min(-0.1, dx); 
            }

            // excludes if completely behind player
            if (dx * player.facing < 0) continue;

            const distSq = dx * dx + dy * dy;
            if (distSq > 400 * 400) continue;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = target;
            }
        }
        return nearest;
    }

    return {
        update() {
            const now = performance.now();

            if (fireFeedbackTimer > 0) {
                fireFeedbackTimer = Math.max(0, fireFeedbackTimer - TIME.fixedDeltaTime);
            }

            // Constantly track the nearest target every frame
            currentTarget = findNearestTarget(player.position.x, player.position.y);

            for (let i = missiles.length - 1; i >= 0; i--) {
                const missile = missiles[i];
                missile.update();

                if (missile.pendingDestroy) {
                    missiles.splice(i, 1);
                    continue;
                }

                const enemies = typeof getTargets === 'function' ? getTargets() : (getTargets ?? []);
                const walls = typeof getWalls === 'function' ? getWalls() : (getWalls ?? []);

                for (const entity of [...enemies, ...walls]) {
                    if (entity.pendingDestroy || entity.isDestroyed) continue;
                    if (!isColliding(missile, entity)) continue;

                    if (walls.includes(entity)) {
                        if (entity.isBreakable) {
                            entity.isDestroyed = true;
                            entity.damageFlashTime = millis();
                            const wx = entity.position?.x ?? 0;
                            const wy = entity.position?.y ?? 0;
                            particleSystem?.emitBurst(wx, wy, 'wall');
                            if (GAME.DIFFICULTY === 'EASY') {
                                const blastRadius = 64;
                                for (const w of walls) {
                                    if (w.isBreakable && w !== entity && p5.Vector.dist(entity.position, w.position) <= blastRadius) {
                                        w.isDestroyed = true;
                                        w.damageFlashTime = millis();
                                        const bwX = w.position?.x ?? 0;
                                        const bwY = w.position?.y ?? 0;
                                        particleSystem?.emitBurst(bwX, bwY, 'wall');
                                    }
                                }
                            }
                        }
                    } else {
                        entity.pendingDestroy = true;
                        entity.damageFlashTime = millis();
                        const ex = entity.position?.x ?? entity.x ?? 0;
                        const ey = entity.position?.y ?? entity.y ?? 0;
                        particleSystem?.emitBurst(ex, ey, 'enemy');
                    }

                    missile.pendingDestroy = true;
                    break;
                }
            }

            missiles = missiles.filter(m => !m.pendingDestroy);

            if (player.actionIntent.launchMissile) {
                if (now - lastFireTime > MISSILE.COOLDOWN && player.missiles > 0) {
                    missiles.push(new Missile(player.position.x, player.position.y, currentTarget, player.facing));
                    player.missiles--;
                    lastFireTime = now;
                    lastFiredTarget = currentTarget;
                    lastFiredTime = now;
                    if (currentTarget) fireFeedbackTimer = FIRE_FEEDBACK_DURATION;

                    soundSystem?.play('missileFired', 0.2);
                }
                player.actionIntent.launchMissile = false;
            }
        },

        getMissiles() {
            return missiles;
        },

        getCurrentTarget() {
            return currentTarget;
        },

        getLastFiredTarget() {
            return { target: lastFiredTarget, time: lastFiredTime };
        },

        getFireFeedbackTimer() {
            return fireFeedbackTimer;
        }
    };
}
