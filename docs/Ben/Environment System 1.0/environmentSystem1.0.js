/**
 * EnvironmentSystem handles static hazards and resources for the submarine.
 *
 * I have tried to implement the Environment system to handle static interactable
 * hazards, resources, and secret rooms. It will parse object layers from the Tiled
 * JSON map. It has AABB collision detection with a 1-second damage cooldown for the
 * hazards, and single-use collection for the resources. It should also integrate
 * directly with the sonar system so that hidden objects can remain invisible until
 * hit by a sonar pulse, which will then trigger a fading glow effect and permanently
 * reveals them. Finally, I wrapped it in a factory function to seamlessly integrate 
 * with the existing engine architecture and coordinate system.
 *
 * Author: Ben
*/

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
