/**
 * EnvironmentSystem handles static hazards (e.g., underwater mines, sharp rocks)
 * and resources (e.g., oxygen tanks, battery packs) for the submarine.
 */

/**
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
        // Manages hull integrity, energy, oxygen
        this.resourceSystem = resourceSystem; 
        
        // Damage cooldown
        this.damageCooldownMs = 1000; // 1 second
        this.lastDamageTime = 0;
    }

    // Loads environment objects from Tiled JSON map data
    loadRoom(mapData) {
        this.cleanup(); // Ensure previous room data is cleared before loading new ones

        if (!mapData || !mapData.layers) {
            console.warn("No layers found in mapData for EnvironmentSystem.");
            return;
        }

        for (const layer of mapData.layers) {
            // We look for Object layers in Tiled
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

    // Parses a Tiled object into our internal format based on custom properties.
    parseTiledObject(obj) {
        if (!obj.properties) return null;

        let type = '';
        let damage = 0;
        let heal = 0;
        let isHidden = false;

        // Extract properties defined in Tiled
        for (const prop of obj.properties) {
            if (prop.name === 'type') type = prop.value;
            if (prop.name === 'damage') damage = prop.value;
            if (prop.name === 'heal') heal = prop.value;
            if (prop.name === 'hidden') isHidden = prop.value;
        }

        // Track hazards, resources, and secret passages
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
                revealed: !isHidden, // starts revealed if not hidden
                damage: damage,
                heal: heal,
                
                // Glow effect properties
                isGlowing: false,
                glowAlpha: 0,
                
                // Called by the Pulse class when a sonar particle hits this entity
                illuminate: function() {
                    if (this.hidden && !this.revealed) {
                        this.revealed = true;
                        console.log(`Sonar revealed a hidden ${this.type}!`);
                    }
                    
                    // Trigger the glow effect
                    this.isGlowing = true;
                    this.glowAlpha = 255;
                }
            };
        }

        return null;
    }

    // Returns all active entities so the Pulse class can check collisions against them.
    getEntities() {
        return this.entities.filter(e => e.active);
    }

    // Checks collisions between the submarine and environment entities.
    update(submarine, currentTimeMs, dt) {
        for (const entity of this.entities) {
            if (!entity.active) continue;

            // Update glow effect fading
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

    // Simple AABB (Axis-Aligned Bounding Box) collision detection.
    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Applies effects via the ResourceSystem
    handleCollision(entity, currentTimeMs) {
        if (entity.type === 'hazard') {
            // Apply damage cooldown so the submarine doesn't explode in 1 frame
            if (currentTimeMs - this.lastDamageTime >= this.damageCooldownMs) {
                // Assuming resourceSystem has a method for hull damage
                this.resourceSystem.modifyHealth(-(entity.damage || 1));
                this.lastDamageTime = currentTimeMs;
                console.log(`Submarine hit a hazard! Hull took ${entity.damage || 1} damage.`);
            }
        } 
        else if (entity.type === 'resource') {
            // Apply resource benefits (e.g., repairing hull, restoring battery/oxygen)
            if (entity.heal) {
                this.resourceSystem.modifyHealth(entity.heal);
            }
            
            // 4. Mark as collected / inactive
            entity.active = false;
            console.log(`Submarine collected a resource!`);
        }
        else if (entity.type === 'secret_passage') {
            // Logic for entering a hidden room or area
            console.log(`Submarine entered a secret passage!`);
        }
    }

    // Cleans up environment data when leaving a sector.
    cleanup() {
        this.entities = [];
        this.lastDamageTime = 0;
    }
}

// Environment system factory

export function createEnvironmentSystem(player, resourceSystem) {
    const envSystem = new EnvironmentSystem(resourceSystem);
    
    return {
        loadRoom(mapData) {
            envSystem.loadRoom(mapData);
        },
        update(deltaTime) {
            // Adapt player center coordinates to top-left for collision
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
