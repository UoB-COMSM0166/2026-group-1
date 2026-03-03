# Epics and User Stories

# EPIC: Echolocation / Sonar System

### User Story 1 – Sonar Navigation

**As a player**, I want to emit a sonar pulse so that I can perceive my surroundings without relying on the torch.

**Acceptance Criteria**

- Sonar can be activated via a dedicated input
- A pulse originates from the player and propagates outward
- Nearby terrain and objects are revealed temporarily
- Revealed areas fade back into darkness after a short duration

---

### User Story 2 – Power-Efficient Alternative

**As a player**, I want sonar to use less power than the torch so that I am encouraged to rely on it as my primary navigation tool.

**Acceptance Criteria**

- Sonar consumes significantly less power than torch usage
- Power drain difference is noticeable during gameplay
- Sonar alone is sufficient for basic navigation

---

### User Story 3 – Strategic Limitation

**As a player**, I want sonar to have limitations so that I must use it thoughtfully rather than constantly.

**Acceptance Criteria**

- Sonar has a cooldown or limited pulse rate
- Cooldown state is clearly communicated
- Sonar cannot fully replace all visibility challenges

---

# EPIC: Game Mechanics (Metroidvania)

### User Story 1 – Meaningful Progression

**As a player**, I want to unlock new abilities over time so that earlier inaccessible areas become reachable.

**Acceptance Criteria**

- Player gains new traversal or combat abilities
- Previously blocked paths become accessible
- Backtracking feels rewarding rather than repetitive

---

### User Story 2 – Player Skill Expression

**As a player**, I want the game to reward skillful movement and timing so that mastery feels satisfying.

**Acceptance Criteria**

- Mechanics allow precise control
- Challenges can be overcome through player skill
- Game difficulty increases gradually

---

### User Story 3 – World Consistency

**As a player**, I want the game world to follow consistent rules so that I can learn and predict outcomes.

**Acceptance Criteria**

- Mechanics behave consistently across areas
- Visual cues match gameplay effects
- Rules are reinforced through repeated interactions

---

# EPIC: Underwater Physics System

### User Story 1 - Core Movement Feel

**As a player**, I want movement to feel slower and heavier than a normal platformer so that I truly feel submerged underwater.

**Acceptance Criteria:**

- Horizontal speed is capped lower than typical platform values.
- Acceleration is gradual, not instant.
- Stopping movement has noticeable deceleration (drag).

---

### User Story 2 - Core Movement Feel

**As a player**, I want jumping to feel floaty so that it reflects the buoyancy you would have in the underwater setting.

**Acceptance Criteria:**

- Gravity is reduced compared to standard platformer gravity.
- Jump arc is slower and longer.
- Falling speed is capped (terminal velocity underwater).

---

### User Story 3 - Core Movement Feel

**As a player,** I want smooth acceleration and deceleration so that movement feels fluid and real rather than rigid.

**Acceptance Criteria:**

- Velocity increases gradually toward max speed.
- Velocity decays gradually when input stops.
- Frame-rate independent calculations (deltaTime-based).

---

### User Story 4 - System Integration

**As a player,** I want underwater physics to remain consistent when using sonar or torch so that mechanics feel cohesive.

**Acceptance Criteria:**

- Activating sonar does not break movement.
- Torch does not alter physics unintentionally.
- Physics calculations are independent of rendering layers.

---

### User Story 5 - System Integration

**As a developer**, I want the underwater physics separated into its own system/module so that it is maintainable and extendable.

**Acceptance Criteria:**

- Physics logic is isolated from rendering logic.
- Movement constants are configurable.
- Gravity, drag, and speed values are centralised.

---

### Optional Extensions (Stretch)

### User Story 7 - System Integration

**As a player,** I want environmental forces (e.g., currents) so that exploration feels dynamic.

### User Story 8 - System Integration

**As a player,** I want heavier/lighter upgrades to affect movement slightly so that progression feels tangible.

---

# EPIC: Torch System

### User Story 1 – Active Illumination

**As a player**, I want to use a torch to light dark areas so that I can navigate without relying on sonar.

**Acceptance Criteria**

- Torch produces continuous light around the player
- Light reveals terrain and objects clearly
- Torch can be toggled on and off

---

### User Story 2 – Resource Tradeoff

**As a player**, I want the torch to drain power faster than sonar so that I must decide when it is worth using.

**Acceptance Criteria**

- Power drain increases while torch is active
- Power drain stops when torch is turned off
- Torch use feels powerful but costly

---

# EPIC: Lighting System

### User Story 1 – Visibility Control

**As a player**, I want lighting to determine what I can and can’t see so that darkness feels meaningful.

**Acceptance Criteria**

- Areas without light sources are obscured
- Lit areas are clearly visible
- Lighting updates dynamically as the player moves

---

### User Story 2 – Multiple Light Sources

**As a player**, I want different light sources (torch, sonar, environment) to interact with the world so that visibility feels layered.

**Acceptance Criteria**

- Torch, sonar, and ambient lights affect visibility differently
- Light sources can overlap
- Performance remains stable

---

### User Story 3 – Lighting Architecture

**As a developer**, I want lighting to be handled by a central system so that visibility rules are consistent across the game.

**Acceptance Criteria**

- Lighting logic is separate from gameplay logic
- Supports future light sources
- Integrates with darkness / draw layers

---

# EPIC: Player Controls

### User Story 1 – Responsive Movement

**As a player**, I want smooth, responsive controls so that movement feels precise and reliable.

**Acceptance Criteria**

- Movement is frame-rate independent
- Input feels immediate
- Controls behave consistently across situations

---

### User Story 2 – Action Mapping

**As a player**, I want intuitive controls for abilities so that I can focus on gameplay instead of remembering keys.

**Acceptance Criteria**

- Each ability has a clear input
- Inputs do not conflict
- Controls are documented or communicated in-game

---

# EPIC: User Interface

### User Story 1 – Resource Visibility

**As a player**, I want to see my power and air levels so that I can make informed decisions.

**Acceptance Criteria**

- Power and air meters are always visible during gameplay
- Meter changes are smooth and readable
- Critical states are visually emphasized

---

### User Story 2 – Game Flow Menus

**As a player**, I want menus for pausing and restarting so that I can control the game flow easily.

**Acceptance Criteria**

- Pause menu halts gameplay
- Restart resets the player to a known state
- Menu navigation works via keyboard

---

# EPIC: Resource Management System

### User Story 1 – Power Management

**As a player**, I want power to drain over time and faster when using certain systems so that resource management becomes part of the challenge.

**Acceptance Criteria**

- Power drains slowly by default
- Torch and other systems increase drain rate
- Power can be replenished through gameplay

---

### User Story 2 – Air Management

**As a player**, I want air to drain over time so that exploration feels tense and time-limited.

**Acceptance Criteria**

- Air decreases steadily during gameplay
- Air can be replenished at specific locations or items
- Low air state is clearly communicated

---

# EPIC: Economy System

### User Story 1 – Item Collection

**As a player**, I want to collect items of different types and values so that exploration feels rewarding.

**Acceptance Criteria**

- Multiple collectible item types exist
- Items are placed throughout the world
- Items are stored persistently

---

### User Story 2 – Upgrades

**As a player**, I want to use collected items to unlock upgrades so that my abilities improve over time.

**Acceptance Criteria**

- Items can be exchanged for upgrades
- Upgrades meaningfully affect gameplay
- Upgrade effects are permanent

---

# EPIC: Exploration

### User Story 1 – Gated Progression

**As a player**, I want certain areas to be locked behind abilities or items so that exploration feels purposeful.

**Acceptance Criteria**

- Some areas are inaccessible early
- Unlocking abilities opens new paths
- The map encourages revisiting old areas

---

### User Story 2 – Discovery Reward

**As a player**, I want exploration to consistently reward me so that curiosity is encouraged.

**Acceptance Criteria**

- Hidden areas contain useful rewards
- Rewards justify the effort to reach them
- Exploration supports multiple play styles

---

# EPIC: Save System

### User Story 1 – Save Progress

**As a player**, I want to save my game so that I don’t lose progress.

**Acceptance Criteria**

- Game state can be saved
- Player position and resources are preserved
- Save feedback is provided

---

### User Story 2 – Load Game

**As a player**, I want to load a saved game so that I can continue from where I left off.

**Acceptance Criteria**

- Save files can be selected
- Game state restores correctly
- No progress is lost

---

# EPIC: Achievement System

### User Story 1 – Achievements

**As a player**, I want to earn achievements so that my accomplishments feel recognised.

**Acceptance Criteria**

- Achievements track specific milestones
- Unlocks are persistent
- Achievements are viewable in-game

---

# EPIC: Public Player Database / Community

### User Story 1 – Shared Stats

**As a player**, I want to share achievements and playtime so that I feel part of a wider community.

**Acceptance Criteria**

- Achievements and playtime can be uploaded
- Player identity is anonymised or opt-in
- Data is read-only from the client

---

# EPIC: Enemy Awareness & Sonar Response System

### User Story 1 – Enemies Detect Sonar

**As a player**, I want some enemies to react when I use sonar so that using echolocation feels risky.

**Acceptance Criteria**

- Certain enemies respond to sonar pulses
- Response occurs within a defined detection radius
- Reaction is delayed or indirect (not instant damage)
- Reaction is readable by the player

---

### User Story 2 – Behavioural Response

**As a player**, I want enemies to respond differently to sonar so that encounters feel varied.

**Acceptance Criteria**

- Some enemies move toward the pulse origin
- Some enemies become alert or patrol
- Reactions are consistent per enemy type
- Visual or audio cues communicate the response

---

### User Story 3 – Sonar as a Tactical Tool

**As a player**, I want to intentionally use sonar to manipulate enemies so that I can create openings or distractions.

**Acceptance Criteria**

- Sonar can lure enemies away
- Enemy pathing updates based on pulse location
- Player can exploit sonar timing strategically

---

# EPIC: Mini-Boss Extension (Stretch)

### User Story 1 – Sonar-Hunting mini-boss

**As a player**, I want to encounter a mini-boss that actively hunts sonar pulses so that echolocation becomes dangerous rather than safe.

**Acceptance Criteria**

- Types of enemies are drawn or respond to sonar pulses
- A Mini-boss that tracks recent sonar pulses
- Becomes more aggressive with frequent sonar use
- Encourages alternating between sonar and torch
- Encounter/s is avoidable or escapable

Exciting use of the twist mechanic without needing complex combat

---

### User Story 3 – Sonar-hunter mini-boss

**As a player**, I want to encounter a mini-boss that hunts using sonar pulses so that we can experience it being used against us

**Acceptance Criteria**

- A Mini-boss that tracks the player using sonar pulses
- Becomes more aggressive with frequent sonar use - it can detect it
- Encourages alternating between sonar and torch
- Player can’t just hide in the darkness
- Encounter/s is avoidable or escapable

Exciting use of the twist mechanic without needing complex combat

---

### User Story 3 – Enemy Awareness System

**As a developer**, I want enemy awareness to be event-driven so that sonar interactions are easy to extend.

**Acceptance Criteria**

- Sonar emits an event with position + radius
- Enemies subscribe to sonar events
- Behaviour logic is separated from detection logic
- Works with future sound sources (torch, impacts)
