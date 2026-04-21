# Minimap Fog-of-War Manual Validation Checklist

## Build and Test
- [ ] Run `npm test` from `docs/` and confirm minimap test suites pass.
- [ ] Start local server and open game in browser.

## US1: Corner Minimap Visibility
- [ ] Minimap appears in configured corner during gameplay.
- [ ] Minimap stays fixed while camera follows player.
- [ ] Room geometry appears on minimap.
- [ ] Player marker updates correctly.
- [ ] Missing room data shows fallback frame without crash.

## US2: Reveal As You Explore
- [ ] Spawn area starts revealed.
- [ ] Moving reveals nearby tiles progressively.
- [ ] Unvisited tiles remain hidden.
- [ ] Reveal logic clamps at room bounds.

## US3: Room-Aware Exploration State
- [ ] Explore Room A, transition to Room B, Room B starts with own reveal state.
- [ ] Return to Room A and prior reveal state is restored.
- [ ] Starting a new run resets prior reveal state.

## Performance and Stability
- [ ] No noticeable frame pacing regressions during 5-minute exploration.
- [ ] No minimap runtime errors in browser console.

## Execution Log
- Date: 2026-04-17
- Tester: GitHub Copilot
- Notes: Automated Jest coverage for minimap feature passed (4 suites, 10 tests). Browser gameplay checklist still needs manual execution.
