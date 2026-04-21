import { createPlayerFixture, createRoomStateFixture } from "./helpers/minimapFixtures.js";
import { createMiniMapSystem } from "../systems/miniMapSystem.js";

describe("miniMapSystem room transitions", () => {
  it("restores prior room reveal state after transitions", () => {

    const roomStates = {
      roomA: createRoomStateFixture({ currentRoom: "roomA", width: 80, height: 80 }),
      roomB: createRoomStateFixture({ currentRoom: "roomB", width: 80, height: 80 }),
    };

    let currentRoom = "roomA";
    const player = createPlayerFixture({ position: { x: 16, y: 16 } });

    const system = createMiniMapSystem({
      player,
      getCurrentRoomId: () => currentRoom,
      getCurrentRoomState: () => roomStates[currentRoom],
      getPlatforms: () => [],
      getViewportSize: () => ({ width: 640, height: 360 }),
      config: { revealRadiusTiles: 1 },
    });

    system.update();
    const roomAInitial = system.getExplorationState("roomA").revealedTiles.size;

    currentRoom = "roomB";
    player.position.x = 48;
    player.position.y = 48;
    system.update();

    const roomBCount = system.getExplorationState("roomB").revealedTiles.size;
    expect(roomBCount).toBeGreaterThan(0);

    currentRoom = "roomA";
    system.update();
    const roomAReturn = system.getExplorationState("roomA").revealedTiles.size;
    expect(roomAReturn).toBe(roomAInitial);
  });

  it("accepts restored exploration sets through public hook", () => {

    const system = createMiniMapSystem({
      player: createPlayerFixture(),
      getCurrentRoomId: () => "roomA",
      getCurrentRoomState: () => createRoomStateFixture(),
      getPlatforms: () => [],
    });

    system.restoreExplorationState("roomA", ["1,1", "2,2", "bad"]);
    const state = system.getExplorationState("roomA");

    expect(state.revealedTiles.has("1,1")).toBe(true);
    expect(state.revealedTiles.has("2,2")).toBe(true);
    expect(state.revealedTiles.has("bad")).toBe(false);
  });
});
