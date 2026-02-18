# Version 2.3

** NOTE: Refactor to modular system currently incomplete 
		 - does not yet run
   TODO: import modules as libraries 
   		 - look into npm package manager to manage game library files
		 - look for solution that works best with scale of project
		 **

## IMPORTANT:

**This project uses ES modules so must be run via a local server!**

WARNING: Code cannot be run in p5.js Web Editor  - does NOT support ES module imports

*FILE UPDATED - index.html now includes:* <script type="module" src="sketch.js"></script>


**You must:**

- load sketch.js with type="module" in index.html:

- run the project via a local server (not file://), can't use p5.js web editor

## Final Architecture snapshot
```
InputSystem     → intent
PlayerSystem    → apply intent
PhysicsSystem   → resolve motion
TorchSystem     → resource +timing
RenderSystem    → draw state
Engine          → orchestrates
```
**Benefits**
Engine is agnostic — *it only calls update() and draw() on modules*

Easy to swap modules — *e.g. replace player with AI or new physics*

Phases are enforced — *no messy interdependencies*

Debugging is easier — *engine shouldn’t break because a module fails*

## 1. Project File Structure

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
├─ /systems               # Modular game systems
│   ├─ inputSystem.js     # Handles input, sets player.intent
│   ├─ playerSystem.js    # Applies intent to player (movement/jump)
│   ├─ physicsSystem.js   # Gravity, collisions, landing checks
│   ├─ torchSystem.js     # Torch behaviour, flicker, power drain
│   └─ renderSystem.js    # Draws everything: background, platforms, player,
|                                             torch, UI
├─ /entities              # Optional: reusable classes
│   ├─ player.js          # Player class / data structure
│   └─ torch.js           # Torch class
|          
├─ /assets                # Images, sprites, sounds (not split yet)
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

## 2. File Responsibilities

| File | Responsibility |
| --- | --- |
| **sketch.js** | Main p5.js canvas; creates `darknessLayer`; initializes entities & systems; registers systems with `Engine`; forwards p5 input events. |
| **gameEngine/engine.js** | Engine class orchestrates game loop: calculates `deltaTime`, updates all systems, and calls draw phases. |
| **systems/inputSystem.js** | Sets player intent flags for movement/jump/torch; no direct side-effects on other systems. |
| **systems/playerSystem.js** | Applies movement and jump logic based on intent; updates player state. |
| **systems/physicsSystem.js** | Handles gravity and collision detection with ground and platforms; updates `player.onGround`. |
| **systems/torchSystem.js** | Manages torch on/off state, flicker timing, and drains player power. |
| **systems/renderSystem.js** | Draws background, platforms, player, torch light (via `darknessLayer`), and UI elements. |
| **entities/player.js** | Player class definition with default stats and resources. |
| **entities/torch.js** | Torch class definition with radius, flicker timer, and visibility logic. |

## 3. System Interaction & Update Flow

```
p5.js runtime ──► sketch.js / requestAnimationFrame
│
▼
Engine.update(deltaTime)
│
▼
SYSTEM UPDATES (in order)
1. Input System → sets player.intent
2. Player System → applies movement/jump
3. Physics System → gravity & collision
4. Torch System → updates flicker, drains power, toggles light
5. Render System → draws background, platforms, player, darknessLayer, UI
│
▼
Main Canvas updatefunction keyPressed() {
  inputSystem.onKeyPressed?.(key);
}

function keyReleased() {
  if (key === 'A' || key === 'a') player.intent.left = false;
  if (key === 'D' || key === 'd') player.intent.right = false;
}p5.js runtime ──► sketch.js / requestAnimationFrame
       │
       ▼
   Engine.update(deltaTime)
       │
       ▼
SYSTEM UPDATES (inorder)1.InputSystem → sets player.intent2. PlayerSystem →
applies movement/jump3. PhysicsSystem → gravity & collision4. TorchSystem →
updates flicker, drains power, toggles light5. RenderSystem →
draws background, platforms, player, darknessLayer, UI
       │
       ▼
   Main Canvas updated
```

- `deltaTime` ensures all movement/power drain is **frame-rate independent**.
- **darknessLayer** is an offscreen buffer: drawn each frame by Render System, composited onto main canvas for torch lighting.

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

- **Entities**: just data and state; no p5 rendering or logic outside their system
- **Systems**: update player/game state; optionally have `draw()` for rendering; no side-effects on unrelated systems
- **Render system**: read-only; only draws current state; uses `darknessLayer` for lighting
- **Engine**: orchestrates updates & draws all systems each frame

---

## 6. Coding Rules

1. No drawing inside `update()` functions.
2. No state changes inside `draw()` functions.
3. Input sets **intent**, systems apply **logic**.
4. Keep systems modular: they shouldn’t know about unrelated systems.
5. Use `deltaTime` for any time-based updates (movement, power drain, flicker).
6. For new features, create a new system and register it in `sketch.js`.

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

## Aim:
**Refactor to Modular Engine Architecture**
  - the core “engine” is responsible for the game loop, physics, rendering pipeline, input management, etc.
  - everything else — like player, torch, power — are plug-in modules that the engine will call each frame
 
  - The engine doesn’t know the specifics of modules (e.g. player, torch)
  - Modules declare their phase and update/draw functions
  - draw is optional — some modules are logic only
 


## Working Principles
**CREATE OWN LIBRARIES**
Create a library for time (systemClock.js)
Wrap it control it and mock it for tests to fast forward times 

**INJECT CODE INTO ENGINE**
Do not use global data if possible (causes issues with testing, bugs etc.)
Inject code into engine from different files (like deltaTime)
It is now defined and easily testable
Core engine just has to read data, only care about its own logic

**SEPARATE THESE INTO FILES RATHER THAN HEADERS IN ENGINE**
Eg. Player, torch, physics, resources, game economy, score
	  resource systems (use/gain)
This can be injected later
Once tests and basic implementation done the team can work on making it
more sophisticated/extending feature later

**WRITE GOOD TESTS**
A test looks like very simple fragment of code  (no more than 10 ines)
- One line to setup
- One line to call into function
- One line to check result
Should be very short
Easy to read/understand
These tests should survive any code changes
*E.g.*
*Game should load all phases (gameplay - render)
When jump should land on the ground (gravity test)*

**BAD TESTS**
*Something that does -> Go to file pull in config file, change files to be this, check values, change values etc.*
Messy, overcomplicated, written after not before, checking more than one thing - all lead to ineffect tests.
