/*
========================================
VERSION: 2.4
SYSTEM: ENGINE
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Core engine loop responsible for orchestrating system updates and draws

RULES:
- Engine must not contain game logic
- Engine must not mutate game state directly
- Engine only calls system hooks (update / draw)
========================================
DESIGN GOALS:
- Modular and system-driven architecture
- Clear separation between logic and rendering
- Frame-rate independent updates
========================================
RESPONSIBILITIES:
- Maintain a registry of active systems
- Calculate deltaTime using requestAnimationFrame timestamps
- Call update hooks in a consistent order
- Call draw hooks after all updates complete

DEPENDENCIES:
- requestAnimationFrame (browser API)
- performance.now() for high-precision timing

SYSTEM INTERFACE:
- Systems may optionally implement:
    - update(deltaTime)
    - draw()

USAGE:
const engine = new Engine();
engine.register(physicsSystem);
engine.register(torchSystem);
engine.register(renderSystem);
requestAnimationFrame(engine.update.bind(engine));
========================================
NOTES:
- deltaTime is provided in milliseconds
- Engine uses optional chaining to safely call hooks
- Systems are executed in the order they are registered
========================================
TODO / LIMITATIONS:
- No system prioritisation (order is manual)
- No pause or time-scaling support yet
========================================
*/

//======================================
// ENGINE
//======================================
export class Engine {
  constructor() {
    this.systems = [];
  }

  register(system) {
    this.systems.push(system);
  }

  update(deltaTime) {
    for (const system of this.systems) {
      system.update?.(deltaTime);
    }

    for (const system of this.systems) {
      system.draw?.(deltaTime);
    }
  }
}

//======================================
// ENGINE - END
//======================================
