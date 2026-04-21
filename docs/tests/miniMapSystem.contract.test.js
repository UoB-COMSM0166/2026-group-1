import { createMinimapDepsFixture } from "./helpers/minimapFixtures.js";
import { createMiniMapSystem } from "../systems/miniMapSystem.js";

describe("miniMapSystem contract", () => {
  it("returns the required interface shape", () => {
    const deps = createMinimapDepsFixture();

    const system = createMiniMapSystem(deps);

    expect(typeof system.update).toBe("function");
    expect(typeof system.draw).toBe("function");
    expect(typeof system.onRoomChanged).toBe("function");
    expect(typeof system.getExplorationState).toBe("function");
    expect(typeof system.restoreExplorationState).toBe("function");
  });
});
