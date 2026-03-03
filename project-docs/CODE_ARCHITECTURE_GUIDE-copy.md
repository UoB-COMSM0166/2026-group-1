# CODE ARCHITECTURE GUIDE

*(UPDATED: 11/02/26)*

The SonarSystem, RoomSystem, CameraSystem, and EnemySystem were added, and the LightingSystem was separated from the RenderSystem. These changes improve modularity, clarify system responsibilities, and allow independent development of sonar, lighting, and enemy mechanics without affecting core rendering or player movement logic.

## Overview

This project uses a **Modular** **state-driven architecture** with a **clear separation between logic, rendering, and input**. The goal of this structure is to make features easy to add without breaking existing systems. 

By separating **update** and **draw** **phases**, the code remains predictable, **frame-rate independent**, and easier to debug.

**IMPORTANT NOTE:**

The p5.js Web Editor does **not** support ES module imports → **switch to local development!**

The most up to date *non-modular* version of this project that will run on the web editor is v2.3 (SINGLE FILE VERSION): [https://github.com/UoB-COMSM0166/2026-group-1/blob/496a6811c6db81a47fa46beab3b390756c9f7b2c/docs/georgia/platformer_dev_2.3/SINGLE FILE VERSION/sketch.js](https://github.com/UoB-COMSM0166/2026-group-1/blob/496a6811c6db81a47fa46beab3b390756c9f7b2c/docs/georgia/platformer_dev_2.3/SINGLE%20FILE%20VERSION/sketch.js)

## 🏁 Final architecture snapshot

```

InputSystem        → intent
PlayerSystem       → apply intent (movement + jump)
PhysicsSystem      → resolve motion & collisions
ResourceSystem     → manage power drain & replenishment
TorchSystem        → torch state & power usage
SonarSystem        → pulse logic & detection + alerts
RoomSystem         → current room state & transitions
CameraSystem       → viewport tracking & clamping
LightingSystem     → visibility rules & masking
EnemySystem        → AI movement & reactions
RenderSystem       → draw visible state
Engine             → orchestrates

```
**Key Separation:**
**LightingSystem** decides what is visible this frame (torch + sonar).

**RenderSystem** decides how everything is drawn based on visibility and camera offset.

**CameraSystem** decides what portion of the world is in view.

**RoomSystem** decides which room/world data is currently active.

**SonarSystem** decides what tiles/entities are revealed and alerts enemies.

**EnemySystem** decides enemy movement, behaviour, and reactions to player actions.

This prevents:

- Lighting logic contaminating drawing logic.

- World / room logic interfering with rendering.

- Enemy AI / sonar logic interfering with core physics or player control.

---

# Game Project — Code Structure & Style Guide

## 1. Project Root

```
/project-root
│
├─ index.html             # HTML file that loads p5.js and sketch.js
├─ config.js              # Config file, for constants: gravity, jump power,
|                                                       canvas size
├─ sketch.js              # Main file: p5.js canvas, engine wiring,
|                                      darknessLayer, input bridge
├─ /gameEngine
│   └─ engine.js          # Engine class, runs update loop, registers systems
|
├─ /systems               # Modular game systems
│   ├─ inputSystem.js     # Handles input logic, sets player.intent
│   ├─ playerSystem.js    # Applies input intent to player (movement/jump)
│   ├─ physicsSystem.js   # Gravity, collisions, landing checks
│   ├─ torchSystem.js     # Torch behaviour, flicker, power drain
│   ├─ sonarSystem.js     # Handles sonar pulses & detection data
│   ├─ enemySystem.js     # Updates enemies and AI reactions
│   ├─ roomSystem.js      # Manages current room & transitions
│   ├─ cameraSystem.js    # Controls viewport follow & bounds clamp
│   ├─ lightingSystem.js  # Handles visibility rules & masking logic 
│   └─ renderSystem.js    # Draws background, platforms, player, torch, enemies, UI
|
├─ /entities              # Optional: reusable classes
│   ├─ player.js          # Player class / data structure
|   └─ torch.js           # Torch class
|
│                
├─ /data
│   └─ rooms              # Room objects
│       ├─ room1.js       # (or room1.json)
│       ├─ room2.js
│       └─ room3.js
|          
├─ /assets                # Images, sprites, sounds
│   ├─/images
|   | └─forrest.png
|   ├─/sprites
|   └─/sounds
| 	
└─ /utils                 # Optional: helper functions (e.g., constrain, lerp)
```

> Config answers “what should exist?”
> 

> Instances ( eg. const torch = new Torch() )answer “what exists right now?”
> 

> Systems answer “what happens each frame?”
> 

---

## 2. File Responsibilities

| File                   | Responsibility                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **sketch.js**          | Creates canvas; creates `darknessLayer`; initializes entities; registers systems; forwards input. |
| **engine.js**          | Runs update loop; calculates `deltaTime`; calls systems in order.                                 |
| **inputSystem.js**     | Sets player intent flags only. No direct state mutation.                                          |
| **playerSystem.js**    | Applies movement and jump logic based on intent.                                                  |
| **physicsSystem.js**   | Handles gravity and AABB collision resolution.                                                    |
| **resourceSystem.js**  | Manages power drain, replenishment, and game-over checks.                                         |
| **sonarSystem.js**     | Handles sonar pulse triggering, cooldown; tracks revealed areas and alerts enemies.               |
| **enemySystem.js**     | Updates enemy AI, movement, and reactions to sonar pulses.                                        |
| **torchSystem.js**     | Manages torch state, flicker timing, torch radius.                                                |
| **lightingSystem.js**  | Controls darkness overlay, torch and sonar masking, fade logic.                                   |
| **roomSystem.js**      | Loads and stores current room; manages exits and transitions.                                     |
| **cameraSystem.js**    | Follows player; clamps to room bounds; exposes camera offset.                                     |
| **renderSystem.js**    | Draws background, platforms, player, enemies, and composites `darknessLayer`; draws UI.           |
| **entities/player.js** | Player class definition and default stats.                                                        |
| **entities/torch.js**  | Torch configuration and radius defaults.                                                          |

---

## 3. System Interaction & Update Flow

```

p5.js runtime
│
▼
Engine.update(deltaTime)
│
▼
SYSTEM UPDATES (in order)

1. InputSystem
   → sets player.intent
   → reads key states / discrete actions

2. PlayerSystem
   → applies movement & jump logic
   → triggers sonar pulse requests

3. PhysicsSystem
   → applies gravity
   → resolves collisions
   → clamps player to room bounds

4. ResourceSystem
   → drains player power over time
   → handles pickups & replenishment

5. SonarSystem
   → manages sonar pulse expansion
   → reveals environment temporarily
   → alerts nearby enemies

6. EnemySystem
   → updates enemy AI
   → moves enemies
   → reacts to sonar and player actions

7. TorchSystem
   → drains power when active
   → updates flicker timing
   → exposes light source data

8. LightingSystem
   → collects all light sources
   → combines torch + sonar + enemy lights
   → prepares visibility mask data

9. RoomSystem
   → manages room state
   → handles transitions between rooms
   → exposes active room data

10. CameraSystem
    → follows player
    → clamps to active room bounds
    → calculates render offsets

11. RenderSystem
    → applies camera offset
    → draws background, platforms, player, enemies
    → draws darknessLayer
    → applies lighting mask
    → draws UI (unaffected by camera)

|
▼
Main canvas updated

```

---

## 4. Input Handling (p5.js)

- Continuous input → `update()` sets flags in `player.intent` (`left`, `right`)
- Discrete actions → `onKeyPressed()` sets `jump` or `toggleTorch`
- Example:

```jsx
functionkeyPressed() {
  inputSystem.onKeyPressed?.(key);
}functionkeyReleased() {if (key ==='A' || key ==='a') player.intent.left =false;if (key ==='D' || key ==='d') player.intent.right =false;
}
```

---

## 5. Entity / System Guidelines

**Entities:**

- Just data and state
- No rendering
- No game logic

**Systems:**
- Update player/game state
- May expose read-only data for rendering
- No cross-system mutation

**Render system:**
-Read-only
- Uses camera offset
- Uses darknessLayer for lighting

**Engine:**
- Orchestrates updates & draw calls each frame

---

## 6. Coding Rules

1. No drawing inside `update()` functions.
2. No state changes inside `draw()` functions.
3. Input sets **intent**, systems apply **logic**.
4. Keep systems modular: they shouldn’t know about unrelated systems.
5. Use `deltaTime` for any time-based updates (movement, power drain, flicker).
6. For new features, create a new system and register it in `sketch.js`.


---

## 7. Unified Engine + Systems + Input Bridge + Render Flow
```jsx
        ┌──────────────────────┐
        │        p5.js         │
        │   (runtime / DOM)    │
        └───────────┬──────────┘
                    │ keyPressed() / keyIsDown()
                    ▼
        ┌──────────────────────┐
        │     Input Bridge     │  ← Lives in sketch.js
        │ (global p5 callbacks)│
        └───────────┬──────────┘
                    │ forwards events
                    ▼
        ┌─────────────────────-─┐
        │     Input System      │
        │  - update(deltaTime)  │
        │  - onKeyPressed()     │
        │  - sets player.intent │
        └───────────┬────────-──┘
                    │
                    ▼
        ┌──────────────────────┐
        │     Player System    │
        │  - reads intent...   │
        │  - apply movement    │
        │  - jump logic        │
        └───────────┬──────────┘
                    │
                    ▼
        ┌────────────────────-──┐
        │    Physics System     │
        │  - apply gravity      │
        │  - resolve collisions │
        │  - clamp to room      │
        └───────────┬─────────-─┘
                    │
                    ▼
	    ┌──────────────────────┐
        │     Resource System  │
        │  - drain power       │
        │  - handle pickups    │
        └───────────┬──────────┘
                    │
                    ▼
        ┌────────────────────---──┐
        │     Sonar System        │
	    │  - drain power          |
        │  - expand pulse         │
        │  - reveal environment   │
        │  - alert nearby enemies │ 
        └───────────┬─────────---─┘
                    │
                    ▼
	    ┌──────────────────────┐
        │     Enemy System     │
        │  - update AI         │
        │  - move enemies      │
        │  - respond to sonar  │
        └───────────┬──────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │     Torch System     │
        │  - drain power       │
        │  - flicker timing    │
        │  - active state      │
        │  - exposes light     │
        └───────────┬──────────┘
                    │
                    ▼
        ┌────────────────────--──┐
        │   Lighting System      │
        │  - collects lights     │
        │  - calculates radius   │
        │  - prepares light      │
        │    data for render     │
        │  (prepare light mask)  │
        └───────────┬────────--──┘
                    │
                    ▼
	    ┌──────────────────────┐
        │     Room System      │
        │  - manage room state │
        │  - handle transitions│
	    │  - expose active room│
        └───────────┬──────────┘
                    │
                    ▼
        ┌──────────────────---────┐
        │    Camera System        │
        │  - follow player        │
        │  - clamp to active room │
        │  - compute offsets      │
        └───────────┬────────---──┘
                    │
                    ▼
        ┌──────────────────────┐
        │     Render System    │
        │  - draw background   │
        │  - draw platforms    │
        │  - draw player       │
        │  - draw enemies      │
        │  - draw darknessLayer│
        │  - apply lights      │
        │  - draw UI           │
        └───────────┬──────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │       Canvas         │
        │   (visual output)    │
        └──────────────────────┘
```


### Why This Order Is Solid
**Input → Player → Physics**

Movement must resolve before everything else.

**Room after Physics**

Room boundaries and transitions rely on resolved position.

**Sonar before Lighting**

Sonar modifies visibility data.

**Torch before Lighting**

Torch exposes light data that lighting aggregates.

**Lighting before Render**

Lighting prepares the mask; render applies it.

**Camera before Render**

Camera offset must be known before drawing.

---

# 7. File / Feature Templates

Use this at the top of **any new file or major section**:

```jsx
/*
========================================
VERSION: 1.0
SYSTEM: eg. Torch / Enemy / UI / Physics
AUTHOR/s: Name
DESCRIPTION:
- What this system does
- What data it reads
- What data it modifies

RULES:
- No drawing in update functions
- No state changes in draw functions
- Where possible use deltaTime to be FPS-safe
========================================
RESPONSIBILITIES:
- What this system explicity deals with and handles

DEPENDENCIES:
(e.g.)
- requestAnimationFrame (browser API)
- performance.now() for high-precision timing

USAGE:
- 
========================================
TODO / LIMITATIONS:
- Comments
========================================
NOTES:
- Comments
- breif explainations for team if unfamilliar concept used in code
	e.g. deltaTime
*/
```

And this structure for **features/system files**:

```jsx
(HEADER)
...
//======================================
// X (class)
//======================================

// class code...

//======================================
// X System
//======================================
// contains x logic

// import dependencies from ./filepath
	 ...
	
// export function Xsystem() {
	// update()...
	// draw()...
	}

//======================================
// X instance
//======================================

// let x = new X();

//======================================
// End
//======================================

```

## Sanity checklist (is this code in the correct place?)

### Input System checklist

- [ ]  Does NOT move entities
- [ ]  Does NOT apply physics
- [ ]  Sets intent or triggers actions
- [ ]  Uses events vs held input correctly

### Render System checklist

- [ ]  No state mutation
- [ ]  No deltaTime usage
- [ ]  Reads state only
- [ ]  All drawing lives here

Q1:

“Where should I put this drawing code?”

Answer: Draw code always lives in **Render system.**

Q2:

“Where should I change player movement?”

Answer: **Player system** or **Physics system — never Input or Render.**

## Definitions

### Entities

Entities are **plain objects**, not classes.

- Entities store **state**, not behaviour
- Behaviour lives in functions that operate on entities
- Makes refactoring and debugging easier
- Supports future upgrades (*items, stats, abilities*)

*Example: player*

```jsx
var player = {
  x, y,
  w, h,
  
  vy, (*vertical velocity*)
  jumpPower,
  
  maxPower,
  power,
  
  torchOn,
  
  onGround
};

*Example: rooms (instance of class from system)*
```
//======================================
// Room System
//======================================

export class Room {
  constructor(config) {
    this.width = config.width;
    this.height = config.height;

    this.platforms = config.platforms || [];
    this.resources = config.resources || [];
    this.enemies = config.enemies || [];

    this.playerSpawn = config.playerSpawn || { x: 0, y: 0 };
  }
}

//======================================
// entities/room.js
// - contains all room objects
//======================================

new Room({
  width: 3000,
  height: 1200,
  type: "tutorial", //(boss, hub, jellyfish_maze) helps add enemies, special physics or conditions
  platforms: [...],
  enemies: [...]
})


---

### DeltaTime

<aside>
⚙

In p5.js, `deltaTime` is:

*The number of milliseconds since the last frame*

So if the game is running at:

- **30 FPS** → `deltaTime ≈ 33.33`
- **60 FPS** → `deltaTime ≈ 16.67`
- **120 FPS** → `deltaTime ≈ 8.33`

It *changes every frame* depending on performance.

- `deltaTime` is in **milliseconds**
- Game logic is easier in **seconds** → `deltaTime / 1000`

**Power Drain Example**

The power drain when the torch is on follows this pattern:

`value -= rate * deltaTimeInSeconds;` 

- `deltaTime / 1000` = elapsed **seconds**
- Subtracting that every frame adds up to **exactly 1 unit per second**
    
    `player.power -= deltaTime / 1000`  *(rate is effectively 1)*
    
</aside>
