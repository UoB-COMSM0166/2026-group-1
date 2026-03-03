# Prioritised Feature Breakdown
A risk-managed development approach prioritising core mechanics and technical feasibility over feature breadth.
Based on user stories derived from our game Epics

| **Priority**            | **Systems / Features**                                                   | **Estimated Implementation Time** |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| **HIGH (MVP)**          | Player controls (movement, jump, sonar input, torch toggle)              | 2–3 days (mostly done)            |
|                         | Underwater Physics (floaty gravity, drag, capped fall speed)             | 2–4 days                          |
|                         | Minimal gameplay UI (power meter, sonar cooldown, pause)                 | 1–2 days                          |
|                         | Resource management (power drain + torch drain, replen)                  | 2–3 days (mostly done)            |
|                         | Lighting system (darkness overlay + visibility masking)                  | 3–5 days                          |
|                         | Echolocation / Sonar system (pulse, circular reveal, fade-out, cooldown) | 3–5 days (PoC exists)             |
|                         | Core Metroidvania structure (3–5 rooms, 1 gate, basic traversal)         | 4–6 days                          |
| **MEDIUM (Core Depth)** | Room system (room objects, transitions, bounds)                          | 3–5 days                          |
|                         | Camera system (follow player, clamp to room)                             | 2–3 days                          |
|                         | Torch visual enhancement (improved lighting radius)                      | 1–3 days                          |
|                         | Enemy system (basic patrol / contact damage)                             | 3–5 days                          |
|                         | Enemy awareness to sonar (alert state within pulse radius)               | 4–7 days                          |
|                         | Exploration ability (double jump unlock, etc.)                           | 2–4 days                          |
|                         | Simple upgrade system (increase sonar range or power capacity)           | 3–5 days                          |
| **LOW (Stretch)**       | Save system (checkpoint-based)                                           | 2–4 days                          |
|                         | Achievement system (internal milestone tracking)                         | 1–2 days                          |
|                         | Advanced enemy AI (hunt behaviour, multi-state logic)                    | 4–8 days                          |
|                         | Sonar-reactive mini-boss encounter                                       | 5–10 days                         |
|                         | Environmental physics extensions (currents, pressure zones)              | 3–6 days                          |
|                         | Public player database / leaderboard                                     | 7–14+ days                        |


---

# HIGH PRIORITY (MVP – Core Game)

These systems are essential to demonstrate the game concept and learning outcomes. Without these, the game does not function.

## 1. Player Controls
**Why:** A platformer must feel responsive and predictable.  
**Includes:**
- Horizontal movement
- Jumping
- Sonar activation
- Torch toggle
- Frame-rate independent movement

## 2. Underwater Physics System
**Why:** The underwater setting must feel mechanically distinct.  
**Includes:**
- Reduced gravity
- Movement drag
- Slower acceleration
- Capped fall speed

## 3. Resource Management (Power System)
**Why:** Power creates tension and decision-making.  
**Includes:**
- Passive drain over time
- Increased drain when torch is active
- Replenishment via pickups
- Game over at zero

**For MVP:** Only Power is required. Oxygen can be cut if complexity rises.

## 4. Minimal Gameplay UI
**Why:** Players need readable feedback.  
**Includes:**
- Power bar
- Sonar cooldown indicator
- Pause functionality

## 5. Basic Enemies / Hazards
**Why:** Risk must exist for tension.  
**Includes:**
- Static hazards or simple patrol enemies
- Contact damage
- Simple AABB collisions
- No advanced AI required

## 6. Core Metroidvania Structure + Room / Camera Systems
**Why:** Defines the genre identity and immersion.  
**Includes:**
- 3–5 interconnected rooms
- One gated path
- One unlockable ability (e.g., double jump)
- Clear progression objective
- **RoomSystem:** loads active room, manages exits
- **CameraSystem:** follows player, clamps to room bounds

## 7. Torch System
**Why:** Supports lighting and resource management.  
**Includes:**
- Flicker timing
- Torch radius
- Power drain management

## 8. Lighting System
**Why:** Darkness gives sonar meaning.  
**Includes:**
- Darkness overlay
- Visibility masking (torch + sonar)
- Clear contrast between revealed and hidden areas
- Simple masking only; no shaders required

## 9. Echolocation / Sonar System
**Why:** Core identity of the game.  
**Includes:**
- Circular pulse
- Temporary reveal
- Fade-out over time
- Cooldown management
- Integrates with LightingSystem for masking
- Room-agnostic — can be applied to any room

---

# MEDIUM PRIORITY (Core Depth)

These enhance gameplay but are not required for MVP delivery.

## 1. Torch Enhancement
**Why:** Improves visual clarity and player feedback.  
**Includes:**
- Stronger lighting radius
- Clearer contrast vs sonar
- Optional subtle flicker polish

## 2. Exploration Ability Unlock
**Why:** Provides Metroidvania gating for depth.  
**Includes:**
- Example: double jump, wall jump
- Only one ability required for MVP

## 3. Simple Upgrade System
**Why:** Adds progression and choice.  
**Includes:**
- Increase sonar range
- Increase power capacity
- Minimal menu/UI required

## 4. Enemy Awareness to Sonar
**Why:** Adds challenge and interactivity.  
**Includes:**
- Enemies enter alert state when inside sonar pulse radius
- Move toward last detected pulse location
- Return to idle when pulse fades
- Simple state logic only; no complex AI trees

---

# LOW PRIORITY (Stretch / Optional)

These features increase complexity but are not necessary to demonstrate learning outcomes. Remove first if time becomes tight.

- Save system (checkpoint-based)
- Achievement tracking (internal milestones)
- Advanced enemy AI (hunt behaviour, multi-state logic)
- Sonar-reactive mini-boss encounter
- Environmental physics extensions (currents, pressure zones)
- Public player database / leaderboard
