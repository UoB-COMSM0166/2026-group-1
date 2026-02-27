/*
========================================
VERSION: 1.5
SYSTEM: ENVIRONMENT SYSTEM
AUTHOR: Ben Mounce
DESCRIPTION:
- Loads hazard, resource, and special objects from Tiled 
    JSON map data
- Stores and manages environment entities for the active 
    room/sector
- Detects collisions between the player submarine and 
    environment objects
- Applies damage/healing via the provided resourceSystem 
    and exposes lightweight reveal/illumination behaviour for 
    sonar-discovered objects

RULES:
- No rendering logic inside this system
- Do not modify other systems directly; communicate via the 
    resourceSystem
- Damage cooldowns, glow fading must be consistent across 
    frame rates using the deltaTime supplied by the engine
========================================
DESIGN GOALS:
- Keep environment rules and interactions separated from 
    player movement and rendering
- Provide a clear, testable interface for loading rooms, 
    querying active environment entities, and handling 
    per-frame updates
- Minimise assumptions about entity shape/size: the system 
    uses AABB rectangles
========================================
RESPONSIBILITIES:
- Parse object layers from Tiled JSON and create an environment
    entities
- Track active/inactive state, hidden/revealed flags, and 
    glow state
- Apply damage to the player through resourceSystem.modifyHealth() 
    with a cooldown to avoid frame-rate dependent repeat damage
- Allow single-use resources to be collected and deactivated
- Provide getEntities() for rendering or other systems to 
    inspect active environment objects

DEPENDENCIES:
- deltaTime: provided by the engine update loop when calling
    update()
- resourceSystem: must expose modifyHealth(amount) for 
    damage/heal effects.
- An entity/player adapter with x,y,width,height used for 
    AABB checks.

USAGE:
import { createEnvironmentSystem } from './environmentSystem1.0.js';

const envSystem = createEnvironmentSystem(player, resourceSystem);
engine.register(envSystem);

Call envSystem.loadRoom(mapData) when entering a new map/sector and
envSystem.update(deltaTime) each frame
========================================
Notes:
- Damage application uses a millisecond cooldown to avoid 
    applying damage repeatedly within a single second; this is 
    driven by the currentTimeMs and should be stable across frame 
    rates
- Glow/reveal fading uses delta-time scaled decay, so the visual 
    alpha falls consistently regardless of frame rate
- The system intentionally exposes data shapes (x,y,width,height) 
    compatible with simple AABB checks
========================================
TODO / LIMITATIONS:
- No persistence of revealed state across sessions/sectors
- Hidden objects currently reveal permanently when illuminated, 
    optional re-hiding logic is commented in place
- Consider adding unit tests for collision handling and cooldown 
    timing.
========================================
*/

//======================================
// ENVIRONMENT SYSTEM
//======================================
export class EnvironmentSystem {
    constructor(resourceSystem) {
        this.entities = [];
        this.resourceSystem = resourceSystem; 
        
        this.damageCooldownMs = 1000;
        this.lastDamageTime = 0;
    }

    loadRoom(mapData) {
        this.cleanup();

        if (!mapData || !mapData.layers) {
            console.warn("No layers found in mapData for EnvironmentSystem.");
            return;
        }

        for (const layer of mapData.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                for (const obj of layer.objects) {
                    const entity = this.parseTiledObject(obj);
                    if (entity) {
                        this.entities.push(entity);
                    }
                }
            }
        }
        console.log(`Loaded ${this.entities.length} environment entities for the new sector.`);
    }

    parseTiledObject(obj) {
        if (!obj.properties) return null;

        let type = '';
        let damage = 0;
        let heal = 0;
        let isHidden = false;

        for (const prop of obj.properties) {
            if (prop.name === 'type') type = prop.value;
            if (prop.name === 'damage') damage = prop.value;
            if (prop.name === 'heal') heal = prop.value;
            if (prop.name === 'hidden') isHidden = prop.value;
        }

        if (type === 'hazard' || type === 'resource' || type === 'secret_passage') {
            return {
                id: obj.id,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                w: obj.width,
                h: obj.height,
                type: type,
                active: true,
                hidden: isHidden,
                revealed: !isHidden,
                damage: damage,
                heal: heal,
                isGlowing: false,
                glowAlpha: 0,

                illuminate: function() {
                    if (this.hidden && !this.revealed) {
                        this.revealed = true;
                        console.log(`Sonar revealed a hidden ${this.type}!`);
                    }

                    this.isGlowing = true;
                    this.glowAlpha = 255;
                }
            };
        }

        return null;
    }

    getEntities() {
        return this.entities.filter(e => e.active);
    }

    update(submarine, currentTimeMs, dt) {
        for (const entity of this.entities) {
            if (!entity.active) {
                continue
            }
            if (entity.isGlowing) {
                entity.glowAlpha -= 0.5 * (dt || 16);
                
                if (entity.glowAlpha <= 0) {
                    entity.glowAlpha = 0;
                    entity.isGlowing = false;
                    
                    // Optional: If you want hidden objects to hide again after the glow fades
                    // if (entity.hidden) {
                    //     entity.revealed = false;
                    // }
                }
            }
            if (this.checkCollision(submarine, entity)) {
                this.handleCollision(entity, currentTimeMs);
            }
        }
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    handleCollision(entity, currentTimeMs) {
        if (entity.type === 'hazard') {
            if (currentTimeMs - this.lastDamageTime >= this.damageCooldownMs) {
                this.resourceSystem.modifyHealth(-(entity.damage || 1));
                this.lastDamageTime = currentTimeMs;
                console.log(`Submarine hit a hazard! Hull took ${entity.damage || 1} damage.`);
            }
        } 
        else if (entity.type === 'resource') {
            if (entity.heal) {
                this.resourceSystem.modifyHealth(entity.heal);
            }

            entity.active = false;
            console.log(`Submarine collected a resource!`);
        }
        else if (entity.type === 'secret_passage') {
            console.log(`Submarine entered a secret passage!`);
        }
    }

    cleanup() {
        this.entities = [];
        this.lastDamageTime = 0;
    }
}

//======================================
// ENVIRONMENT SYSTEM FACTORY
//======================================
export function createEnvironmentSystem(player, resourceSystem) {
    const envSystem = new EnvironmentSystem(resourceSystem);
    
    return {
        loadRoom(mapData) {
            envSystem.loadRoom(mapData);
        },
        update(deltaTime) {
            const submarineAdapter = {
                x: player.x - player.w / 2,
                y: player.y - player.h / 2,
                width: player.w,
                height: player.h
            };
            envSystem.update(submarineAdapter, performance.now(), deltaTime);
        },
        getEntities() {
            return envSystem.getEntities();
        }
    };
}
//======================================
// END
//======================================
