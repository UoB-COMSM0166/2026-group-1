import {
  createMinimapDepsFixture,
  createPlayerFixture,
  createRoomStateFixture,
  createPlatformFixture,
} from "./helpers/minimapFixtures.js";
import { createMiniMapSystem } from "../systems/miniMapSystem.js";
import { projectWorldRectToFrame } from "../systems/minimapMath.js";

describe("miniMapSystem", () => {
  it("reveals spawn area with deterministic radius", () => {

    const player = createPlayerFixture({ position: { x: 24, y: 24 } });
    const roomState = createRoomStateFixture({
      width: 64,
      height: 64,
      tileWidth: 16,
      tileHeight: 16,
      currentRoom: "roomA",
    });

    const system = createMiniMapSystem(
      createMinimapDepsFixture({
        player,
        roomState,
        roomId: "roomA",
        config: { revealRadiusTiles: 1, maxRevealRadiusTiles: 4 },
      }),
    );

    system.update();

    const state = system.getExplorationState("roomA");
    expect(state.revealedTiles.size).toBe(9);
  });

  it("clamps out-of-bounds tile reveals and remains idempotent", () => {

    const player = createPlayerFixture({ position: { x: 0, y: 0 } });
    const roomState = createRoomStateFixture({
      width: 32,
      height: 32,
      tileWidth: 16,
      tileHeight: 16,
      currentRoom: "roomA",
    });

    const system = createMiniMapSystem(
      createMinimapDepsFixture({
        player,
        roomState,
        roomId: "roomA",
        config: { revealRadiusTiles: 2, maxRevealRadiusTiles: 4 },
      }),
    );

    system.update();
    const afterFirst = system.getExplorationState("roomA").revealedTiles;
    const firstSize = afterFirst.size;

    for (const key of afterFirst) {
      expect(key.startsWith("-")).toBe(false);
      expect(key.includes(",-")).toBe(false);
    }

    system.update();
    const secondSize = system.getExplorationState("roomA").revealedTiles.size;
    expect(secondSize).toBe(firstSize);
  });

  it("keeps reveal state isolated per room id", () => {

    let currentRoomId = "roomA";
    const roomStates = {
      roomA: createRoomStateFixture({ currentRoom: "roomA" }),
      roomB: createRoomStateFixture({ currentRoom: "roomB" }),
    };

    const player = createPlayerFixture({ position: { x: 16, y: 16 } });
    const system = createMiniMapSystem({
      player,
      getCurrentRoomId: () => currentRoomId,
      getCurrentRoomState: () => roomStates[currentRoomId],
      getPlatforms: () => [createPlatformFixture()],
      getViewportSize: () => ({ width: 640, height: 360 }),
      config: { revealRadiusTiles: 1 },
    });

    system.update();
    const aCount = system.getExplorationState("roomA").revealedTiles.size;

    currentRoomId = "roomB";
    player.position.x = 48;
    player.position.y = 48;
    system.update();

    const bCount = system.getExplorationState("roomB").revealedTiles.size;
    expect(aCount).toBeGreaterThan(0);
    expect(bCount).toBeGreaterThan(0);
    expect(system.getExplorationState("roomA").revealedTiles.size).toBe(aCount);
  });

  it("projects map geometry rectangles into minimap-space inputs", () => {

    const projected = projectWorldRectToFrame({
      rect: { x: 16, y: 16, w: 16, h: 16 },
      roomWidthPx: 160,
      roomHeightPx: 160,
      frame: { x: 0, y: 0, width: 80, height: 80 },
    });

    expect(projected.x).toBeCloseTo(8);
    expect(projected.y).toBeCloseTo(8);
    expect(projected.w).toBeCloseTo(8);
    expect(projected.h).toBeCloseTo(8);
  });
});
