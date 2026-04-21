function createPlayerFixture(overrides = {}) {
  return {
    position: {
      x: 32,
      y: 32,
      ...(overrides.position ?? {}),
    },
    ...overrides,
  };
}

function createRoomStateFixture(overrides = {}) {
  return {
    width: 160,
    height: 128,
    tileWidth: 16,
    tileHeight: 16,
    currentRoom: "roomA",
    ...(overrides ?? {}),
  };
}

function createPlatformFixture(overrides = {}) {
  const x = overrides.x ?? 16;
  const y = overrides.y ?? 32;
  const w = overrides.w ?? 16;
  const h = overrides.h ?? 16;

  return {
    getCornerX: () => x,
    getCornerY: () => y,
    getWidth: () => w,
    getHeight: () => h,
  };
}

function createMinimapDepsFixture(overrides = {}) {
  const player = overrides.player ?? createPlayerFixture();
  const roomState = overrides.roomState ?? createRoomStateFixture();
  const roomId = overrides.roomId ?? roomState.currentRoom ?? "roomA";
  const platforms = overrides.platforms ?? [createPlatformFixture()];

  return {
    player,
    getCurrentRoomId: () => roomId,
    getCurrentRoomState: () => roomState,
    getPlatforms: () => platforms,
    getViewportSize: () => ({ width: 640, height: 360 }),
    config: overrides.config,
  };
}

export {
  createPlayerFixture,
  createRoomStateFixture,
  createPlatformFixture,
  createMinimapDepsFixture,
};
