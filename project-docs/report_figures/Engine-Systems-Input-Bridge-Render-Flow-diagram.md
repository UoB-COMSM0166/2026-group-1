```jsx
        ┌──────────────────────┐
        │        p5.js         │
        │   (runtime / DOM)    │
        └───────────┬──────────┘
                    │ keyPressed() / keyIsDown()
                    ▼
        ┌────────────────────-──┐
        │     Input Bridge      │  ← Lives in sketch.js
        │ (global p5 callbacks) │
        └───────────┬──────-────┘
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
        ┌────────────────────--──┐
        │     Room System        │
        │  - manage room state   │
        │  - handle transitions  │
        │  - expose active room  │
        └───────────┬───────-───-┘
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
        ┌───────────────────-───┐
        │     Render System     │
        │  - draw background    │
        │  - draw platforms     │
        │  - draw player        │
        │  - draw enemies       │
        │  - draw darknessLayer │
        │  - apply lights       │
        │  - draw UI            │
        └───────────┬───────-───┘
                    │
                    ▼
        ┌────────────────────-──┐
        │        Canvas         │
        │    (visual output)    │
        └───────────────────-───┘
```
