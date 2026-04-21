import {
  buildRevealNeighborhood,
  isTileInBounds,
  projectWorldPointToFrame,
  resolveHudFrame,
} from "../systems/minimapMath.js";

describe("minimapMath", () => {
  it("projects world points into HUD frame bounds", () => {

    const frame = { x: 10, y: 20, width: 200, height: 100 };
    const p = projectWorldPointToFrame({
      worldX: 50,
      worldY: 25,
      roomWidthPx: 100,
      roomHeightPx: 50,
      frame,
    });

    expect(p.x).toBeCloseTo(110);
    expect(p.y).toBeCloseTo(70);
  });

  it("validates tile bounds and neighborhood generation", () => {

    expect(isTileInBounds(0, 0, 10, 5)).toBe(true);
    expect(isTileInBounds(-1, 0, 10, 5)).toBe(false);
    expect(isTileInBounds(10, 0, 10, 5)).toBe(false);

    const tiles = buildRevealNeighborhood(5, 5, 1);
    expect(tiles).toHaveLength(9);
    expect(tiles).toEqual(
      expect.arrayContaining([
        { tileX: 4, tileY: 4 },
        { tileX: 5, tileY: 5 },
        { tileX: 6, tileY: 6 },
      ]),
    );
  });

  it("resolves top-right HUD placement deterministically", () => {

    const frame = resolveHudFrame({
      anchor: "top-right",
      marginPx: 16,
      widthPx: 240,
      heightPx: 160,
      viewportWidth: 640,
      viewportHeight: 360,
    });

    expect(frame).toEqual({ x: 384, y: 16, width: 240, height: 160 });
  });
});
