# Physics System Guide
Author: Archie Brown

## Overview

The game uses an **acceleration + drag** underwater physics model. There is no gravity — entities move freely in all four directions (up, down, left, right) and decelerate through drag when input stops.

The physics pipeline is split across three layers, each with a single responsibility:

| Layer | File | Responsibility |
|-------|------|----------------|
| **Movement System** | `systems/playerSystem.js` | Reads intent → applies acceleration, drag, clamping → writes to `velocity` |
| **Physics System** | `systems/physicsSystem.js` | Projects velocity into `nextPos`, resolves wall collisions, commits final position |
| **Hitbox System** | `systems/hitboxSystem.js` | Provides the `Hitbox` / `Wall` classes, AABB overlap test, and collision resolution |

They execute in this order every frame via the engine:

```
inputSystem → playerSystem → physicsSystem → ...
```

---

## How Player Movement Works

### 1. Intent (inputSystem)

The input system sets boolean flags on the player each frame:

```js
player.moveIntent.left = true;   // A or ←
player.moveIntent.right = true;  // D or →
player.moveIntent.up = true;     // W or ↑
player.moveIntent.down = true;   // S or ↓
```

These flags represent **what the player wants to do**, not direct position changes.

### 2. Velocity (playerSystem)

The player system reads the intent flags and converts them into velocity using three steps:

```
acceleration → drag → clamp
```

**Step-by-step each frame:**

```js
// 1. Accelerate in the direction of intent
if (player.moveIntent.right) player.velocity.x += ACCELERATION;
if (player.moveIntent.left)  player.velocity.x -= ACCELERATION;
if (player.moveIntent.up)    player.velocity.y -= ACCELERATION;
if (player.moveIntent.down)  player.velocity.y += ACCELERATION;

// 2. Apply drag (multiplied every frame — simulates water resistance)
player.velocity.x *= DRAG;
player.velocity.y *= DRAG;

// 3. Clamp to max speed
player.velocity.x = constrain(player.velocity.x, -MAX_SPEED, MAX_SPEED);
player.velocity.y = constrain(player.velocity.y, -MAX_SPEED, MAX_SPEED);
```

After processing, the intent flags are reset so they don't carry over to the next frame.

### 3. Collision Resolution (physicsSystem)

The physics system takes the computed velocity and resolves it against walls:

```
setNextPosition() → check collisions → movePlayer()
```

1. **`setNextPosition()`** — projects velocity onto a target position:
   ```js
   nextPos.x = position.x + velocity.x;
   nextPos.y = position.y + velocity.y;
   ```

2. **Collision loop** — for each wall:
   - `wall.updateZones(player)` — determines which side of the wall the player is approaching from (top, right, bottom, left)
   - `isColliding(wall, player)` — AABB overlap test between the wall and the player's `nextPos`
   - `resolveWallCollision(player, wall)` — pushes `nextPos` out of the wall based on the approach zone

3. **`movePlayer()`** — commits the resolved position:
   ```js
   position.x = nextPos.x;
   position.y = nextPos.y;
   ```

---

## Config Values

All tuning constants live in `config.js` under the `PLAYER` export:

| Constant | Default | Purpose |
|----------|---------|---------|
| `ACCELERATION` | `0.3` | Velocity added per frame when a direction is held. Higher = snappier response. |
| `DRAG` | `0.92` | Velocity multiplier per frame. Closer to `1` = more glide, closer to `0` = instant stop. |
| `MAX_SPEED` | `3` | Hard speed cap in pixels/frame. At 60 fps, `3` ≈ 180 px/sec. |

### Tuning Tips

- **Snappy, responsive movement**: High `ACCELERATION` (0.5+), low `DRAG` (0.85), moderate `MAX_SPEED` (3–4)
- **Floaty, drifting submarine**: Low `ACCELERATION` (0.1–0.2), high `DRAG` (0.96–0.98), moderate `MAX_SPEED` (2–3)
- **Tank-like, heavy feel**: Low `ACCELERATION` (0.1), low `DRAG` (0.88), low `MAX_SPEED` (1.5)

---

## Entity Architecture

All entities that participate in collision must extend the `Hitbox` class:

```js
class Hitbox {
  constructor(x, y, w, h)   // x, y = top-left corner input → stored as centre
  position                   // p5.Vector — centre of the hitbox
  w, h                       // width and height
  getCornerX() / getCornerY() // top-left corner (position - w/2, position - h/2)
  getWidth() / getHeight()    // dimensions
}
```

**Important**: `position` stores the **centre** of the entity, not the top-left corner. The constructor converts corner coordinates to centre internally: `position = (x + w/2, y + h/2)`.

The `Player` class extends `Hitbox` and adds:

- `velocity` — a `p5.Vector` storing current speed (written by playerSystem)
- `nextPos` — a `p5.Vector` used as the collision target (written by `setNextPosition()`, corrected by `resolveWallCollision()`)
- `moveIntent` — boolean flags consumed by playerSystem each frame
- `facing` — `1` (right) or `-1` (left), updated from velocity direction

---

## Implementing Physics for Non-Player Characters (NPCs)

The physics pipeline is designed so that any entity following the same contract can reuse the collision system. Here is how to add an NPC with physics:

### Step 1: Create the NPC Entity

The NPC must extend `Hitbox` and include the same movement properties the physics system expects:

```js
// entities/npc.js
import { Hitbox } from '../systems/hitboxSystem.js';

export class NPC extends Hitbox {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.velocity = createVector(0, 0);
    this.nextPos = createVector(this.position.x, this.position.y);
    this.facing = 1;
  }

  setNextPosition() {
    this.nextPos.x = this.position.x + this.velocity.x;
    this.nextPos.y = this.position.y + this.velocity.y;
  }

  movePlayer() {  // name must match — used by resolveWallCollision
    this.position.x = this.nextPos.x;
    this.position.y = this.nextPos.y;
  }
}
```

> **Note**: `resolveWallCollision()` and `isColliding()` in `hitboxSystem.js` read from `entity.nextPos` and write to `entity.nextPos`. The methods `setNextPosition()` and `movePlayer()` are called by the physics system. Your NPC must implement both.

### Step 2: Create an NPC Movement System

Instead of reading keyboard input, an NPC movement system reads from AI behaviour (patrol, chase, flee, etc.) and writes to `velocity`:

```js
// systems/npcMovementSystem.js
export function createNPCMovementSystem(npc, config) {
  const { ACCELERATION, DRAG, MAX_SPEED } = config;

  return {
    update(deltaTime) {
      // Example: simple patrol — move right, reverse at bounds
      const intent = getPatrolIntent(npc); // your AI logic here

      if (intent.right) npc.velocity.x += ACCELERATION;
      if (intent.left)  npc.velocity.x -= ACCELERATION;
      if (intent.up)    npc.velocity.y -= ACCELERATION;
      if (intent.down)  npc.velocity.y += ACCELERATION;

      npc.velocity.x *= DRAG;
      npc.velocity.y *= DRAG;
      npc.velocity.x = constrain(npc.velocity.x, -MAX_SPEED, MAX_SPEED);
      npc.velocity.y = constrain(npc.velocity.y, -MAX_SPEED, MAX_SPEED);

      if (npc.velocity.x > 0.01) npc.facing = 1;
      else if (npc.velocity.x < -0.01) npc.facing = -1;
    },
  };
}
```

NPCs can have their own `ACCELERATION`, `DRAG`, and `MAX_SPEED` values defined in `config.js` (e.g. under an `NPC` or entity-specific section) to give different creatures different movement feels.

### Step 3: Create or Reuse a Physics System for the NPC

You can either reuse `createPhysicsSystem` directly (it just needs an entity with `setNextPosition`, `nextPos`, and `movePlayer`) or create a shared version:

```js
// In sketch.js setup()
const npcPhysicsSystem = createPhysicsSystem(npc, () => roomSystem.getPlatforms());
engine.register(npcPhysicsSystem);
```

This works because `createPhysicsSystem` only depends on:
- `entity.setNextPosition()` — project velocity
- `entity.nextPos` — collision target
- `entity.movePlayer()` — commit position
- `entity.position`, `entity.w`, `entity.h` — inherited from `Hitbox`

### Step 4: Register Systems in the Engine

```js
// sketch.js setup()
engine.register(npcMovementSystem);   // AI sets velocity
engine.register(npcPhysicsSystem);    // collision resolves position
engine.register(renderSystem);        // draws the NPC
```

The order matters: movement must run before physics, and physics must run before rendering.

### Summary: Minimum Entity Contract for Physics

Any entity that wants to use the collision pipeline must provide:

| Property / Method | Type | Purpose |
|-------------------|------|---------|
| `position` | `p5.Vector` | Centre position (inherited from `Hitbox`) |
| `w`, `h` | `number` | Dimensions (inherited from `Hitbox`) |
| `velocity` | `p5.Vector` | Current speed, set by movement system |
| `nextPos` | `p5.Vector` | Projected position for collision testing |
| `setNextPosition()` | method | `nextPos = position + velocity` |
| `movePlayer()` | method | `position = nextPos` |

If your entity has these, it works with `createPhysicsSystem`, `isColliding`, and `resolveWallCollision` out of the box.
