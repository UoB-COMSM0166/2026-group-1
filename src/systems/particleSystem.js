/*
========================================
VERSION: 1.0
SYSTEM: PARTICLE SYSTEM
AUTHOR: Archie Brown
DESCRIPTION:
- Creates ambient particle effects throughout the game world
- Particles avoid collision tiles for a natural effect
- Provides smooth, ambient atmospherics to enhance atmosphere

RULES:
- Particles do not spawn on solid collision tiles
- Rendering is handled by renderSystem
- No physics interaction with game objects

DESIGN GOALS:
- Create immersive ambient atmosphere
- Keep particle generation efficient
- Avoid spawning in solid areas

RESPONSIBILITIES:
- Generate new particles at intervals
- Update particle positions, velocity, and lifecycles
- Remove expired particles
- Provide particle data to renderSystem

DEPENDENCIES:
- Player position for reference
- Room collision data to avoid spawning in walls
- Camera for viewport calculations

USAGE:
import { createParticleSystem } from './particleSystem.js';
const particleSystem = createParticleSystem(player, () => roomSystem.getCollisionTileData());
engine.register(particleSystem);
========================================
*/

//======================================
// PARTICLE SYSTEM
//======================================
export function createParticleSystem(player, getCollisionData) {
  const particles = [];
  const maxParticles = 150;
  let spawnTimer = 0;
  const spawnInterval = 3; // frames between spawns

  // Collision tile ID that blocks particle spawning
  const COLLISION_TILE_ID = 23;

  function isCollisionTile(x, y, collisionData) {
    if (!collisionData) return false;

    // Get tile size from canvas
    const TILE_SIZE = 16;
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    // Check bounds
    if (tileX < 0 || tileY < 0 || tileX >= 50 || tileY >= 50) return false;

    // Get tile index from flattened array (50x50 grid)
    const tileIndex = tileY * 50 + tileX;

    if (tileIndex >= 0 && tileIndex < collisionData.length) {
      return collisionData[tileIndex] === COLLISION_TILE_ID;
    }

    return false;
  }

  function createParticle(x, y) {
    return {
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.3 - 0.1, // Drift upward
      life: 255,
      maxLife: 255,
      size: Math.random() * 2 + 1,
      type: Math.random() > 0.7 ? 'dust' : 'float' // Mostly float particles
    };
  }

  function getRandomSpawnPoint(collisionData) {
    const attempts = 5;
    const TILE_SIZE = 16;

    for (let i = 0; i < attempts; i++) {
      // Spawn around player with some offset
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 150;
      const spawnX = player.x + Math.cos(angle) * distance;
      const spawnY = player.y + Math.sin(angle) * distance;

      // Check if this is not a collision tile
      if (!isCollisionTile(spawnX, spawnY, collisionData)) {
        return { x: spawnX, y: spawnY };
      }
    }

    return null; // Could not find valid spawn point
  }

  return {
    update() {
      const collisionData = getCollisionData?.() ?? null;

      spawnTimer++;

      // Spawn new particles
      if (spawnTimer >= spawnInterval && particles.length < maxParticles) {
        const spawnPoint = getRandomSpawnPoint(collisionData);
        if (spawnPoint) {
          particles.push(createParticle(spawnPoint.x, spawnPoint.y));
          spawnTimer = 0;
          console.log(`[particles] spawned at (${Math.round(spawnPoint.x)}, ${Math.round(spawnPoint.y)}), total: ${particles.length}`);
        }
      }

      // Update existing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics
        p.x += p.vx;
        p.y += p.vy;

        // Fade out
        p.life -= 0.8;

        // Remove if dead
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    },

    getParticles() {
      return particles;
    },

    clearParticles() {
      particles.length = 0;
    }
  };
}

//======================================
// END
//======================================
