/*
========================================
VERSION: 2.1
SYSTEM: RESOURCE MANAGEMENT SYSTEM
AUTHOR: Monal Gupta
DESCRIPTION:
- Handles player's resources and interactions with resource entities in the room.
- "resource" is the main superclass; specific types (power, health, etc) are resourceTypes.
- Extensible handler system for different resource types.
- Registers handlers that are called when items are collected.
- Does not directly handle specific game logic

HIERARCHY:
- type: "resource" (main category)
  - resourceType: "power" (specific resource)
  - resourceType: "health" (specific resource)

RULES:
- Runs in update(deltaTime)
- Only processes entities with type === "resource"
- Delegates to registered handlers based on resourceType
- Multiple systems can register handlers for different resource types

DESIGN GOALS:
- Decouple collision detection from item handling
- Allow any system to register handlers for resource types
- Support extensible resource types (power, health, ammo, collectables, etc)

USAGE:
const resourceMgmt = createResourceManagementSystem(player, roomSystem);
resourceMgmt.registerHandler('power', (player, item) => {
  player.power.current = Math.min(player.power.current + item.amount, player.power.maxPower);
});
resourceMgmt.registerHandler('health', (player, item) => {
  player.health.current = Math.min(player.health.current + item.amount, player.health.maxHealth);
});

========================================
*/

//======================================
// RESOURCE MANAGEMENT SYSTEM
//======================================

export function createResourceManagementSystem(player, roomSystem) {
  const collectedEntities = new Set();
  // Maps resource types (power, health, etc) to handler functions
  const handlers = {}; 

  function checkCollision(a, b) {
    return (
      // Collision detection (as of now) based on AABB (axis-aligned bounding boxes)
      a.x - a.w / 2 < b.x + b.width / 2 &&
      a.x + a.w / 2 > b.x - b.width / 2 &&
      a.y - a.h / 2 < b.y + b.height / 2 &&
      a.y + a.h / 2 > b.y - b.height / 2
    );
  }

  function handleCollectedItem(item) {
    // Calls handler for the specific resource type
    if (handlers[item.resourceType]) {
      handlers[item.resourceType](player, item);
    }
    
    collectedEntities.add(item);
  }

  return {
    /**
     * Registers a handler for a specific resource type
     * @param {string} resourceType - The resource type (e.g., 'power', 'health')
     * @param {Function} handler - Function called on collection: handler(player, item)
     */
    registerHandler(resourceType, handler) {
      if (typeof handler !== 'function') {
        console.error(`Handler for ${resourceType} must be a function`);
        return;
      }
      handlers[resourceType] = handler;
    },

    //Checks collisions and collects resources
    update() {
      const entities = roomSystem.getEntities();

      for (const e of entities) {
        if (collectedEntities.has(e)) continue;

        // Only processes items with type === "resource"
        if (e.type !== 'resource') continue;

        if (checkCollision(player, e)) {
          handleCollectedItem(e);
        }
      }
    },

    /**
     * Gets all uncollected resource entities
     * @param {string} filterResourceType - Optional: filter by specific resource type
     * @returns {Array} Uncollected resource entities
     */
    getUncollectedEntities(filterResourceType = null) {
      return roomSystem.getEntities().filter((e) => {
        if (collectedEntities.has(e)) return false;
        if (e.type !== 'resource') return false;
        
        if (filterResourceType) {
          return e.resourceType === filterResourceType;
        }
        
        return true;
      });
    },

    /**
     * Checks if an entity has been collected
     * @param {Object} entity - The entity to check
     * @returns {boolean} Whether the entity is collected
     */
    isCollected(entity) {
      return collectedEntities.has(entity);
    },

    /**
     * Manually marks an entity as collected
     * @param {Object} entity - The entity to collect
     */
    collectEntity(entity) {
      collectedEntities.add(entity);
    }
  };
}