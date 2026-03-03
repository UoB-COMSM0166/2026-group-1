# Contributing Guide

This project follows a **clear separation of concerns** to keep the game easy to extend, debug, and merge as a team. Before adding or changing features, read this page and the Code_Architure_Guide which explains the modular code structure in detail.

---

## Branch Protection Rules for `main`
<div>
  <div align="left">
  The source code in `docs/` main branch is protected. Changes to `/docs/` must go through a pull request (PR) - a branch rule is set up to automatically request review from the designated code owner (code reviewer role). Team members can freely edit all files on feature branches; CODEOWNERS is only enforced when merging into main branch `docs/`. 
  </br>
  <img align="left" width="512" height="768" alt="codeowners-protection-rule" src="https://github.com/user-attachments/assets/fbdde968-80e2-4dde-8c62-c20766deda46" />
  </div>
</div>
</br>
</br>

- **Protected Branch** -`main` /docs/ cannot be pushed to directly by team members. All changes must go through a pull request (PR).

- **Code Owner Review for** `/docs/` - Changes to the `/docs/` folder automatically request a review from the designated code owner (code reviewer). This ensures source code updates are checked before merging.

- **Standard Approval for Other Changes** - Non-`docs/` changes in main do not require review.

- **Bypass Disabled** - Admins cannot bypass these rules, so PRs must follow the workflow. (since all the team are admins)

- **Effect on Feature Branches** - Team members can freely edit all files on feature branches (including `/docs/`). CODEOWNERS is only enforced when merging into `main`, so it does not block development or commits on feature branches.

### Workflow Summary
1. Work on a feature branch  
2. Push changes to origin  
3. Open PR targeting `main`  
4. PR requires code owner approval for `/docs/` changes  
5. Merge into `main` once approved

</br>
</br>
</br>

## Core Principles (Read This First)
* **Systems change game state**
* **Render draws, never decides**
* **Input produces intent, not movement**
* **sketch.js wires things together**
* **Config is constant, never runtime**

If you’re unsure where something goes, ask the team *before* coding.
If creating a new feature/system (module) put headers in your file to divide it
into the correct project structure, this will help with integration: 
*(Feature Header, class, system, physics, lighting, render, input-intent, input-handling)*

---

## Project Structure (Mental Model)

```
Input → Intent → Systems → State → Render
```

* p5.js lifecycle lives in `sketch.js`
* The engine runs systems in order
* Systems operate on shared entities

---

## Where to Put New Code (Checklist)

### 1. Is it a tunable value or constant?

**Put it in:** `config.js`

Use for:

* gravity, speeds, sizes
* power drain rates
* lighting radius defaults

Never store runtime state here!

---

### 2. Is it a “thing” in the game world?

**Put it in:** `/entities`

Use for:

* Player
* Torch
* Enemies
* Light sources

Entities:

* hold data
* may have small helper methods
* do not run game logic loops

---

### 3. Does it run every frame or change game state?

**Put it in:** `/systems`

Use for:

* physics
* movement
* power drain
* lighting logic

Rules:

* systems update state
* systems do not load assets
* systems do not create canvases

---

### 4. Does it draw something?

**Put it in:** `renderSystem.js`

Use for:

* backgrounds
* sprites
* darkness / lighting masks
* UI

Rules:

* render reads state only
* render never modifies gameplay state

---

### 5. Is it raw input handling?

**Put it in:** `inputSystem.js`

Rules:

* translate keys → intent
* never move entities directly
* never draw

---

### 6. Is it a reusable helper?

**Put it in:** `/utils`

Rules:

* pure functions only
* no side effects
* no dependency on p5 lifecycle

---

## sketch.js Rules (Very Important)

`sketch.js` is the **integration layer**.

It is responsible for:

* `preload()` (asset loading)
* `setup()` (canvas + layers)
* creating graphics layers (`darknessLayer`, etc.)
* creating entities
* registering systems with the engine

It should NOT contain:

* gameplay logic
* physics rules
* rendering decisions

---

## Asset Loading Rules

* All assets are loaded in `preload()`
* Assets live in `/assets`
* Systems and entities **never call `loadImage()`**

Recommended pattern:

* `preload()` loads assets
* assets are stored globally or in an `ASSETS` object
* render system consumes assets

---

## Render Layers (Darkness, Lighting, etc.)

* Graphics layers are created in `sketch.js`
* Passed into systems as dependencies

Example layers:

* `darknessLayer`
* `lightingLayer`

Rules:

* creation → `sketch.js`
* drawing → render / lighting systems

---

## Lighting System Guidelines

Lighting is split into two responsibilities:

### lightingSystem

* decides which lights are active
* handles flicker / radius / visibility
* updates light-related state

### renderSystem

* draws darkness mask
* erases light shapes
* composites final image

This keeps lighting logic testable and extendable.

---

## Before You Commit

* Did you put the feature in the correct folder?
* Did you avoid adding logic to `renderSystem`?
* Did you avoid adding rendering to logic systems?
* Did you keep `config.js` constant-only?
* Did you ask if unsure?

If yes — you’re good to go 

---

## Final Rule

> **If you’re not sure where it goes, ask the team or refer back to this guide.**

Always work on a local copy
Save versions OFTEN so you can backtrack easily if something goes wrong
Let's make something cool together! :D
