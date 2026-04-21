export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function toTileCoordinate(value, tileSize) {
  if (!Number.isFinite(value) || !Number.isFinite(tileSize) || tileSize <= 0) {
    return 0;
  }
  return Math.floor(value / tileSize);
}

export function worldToTile(worldX, worldY, tileWidth, tileHeight) {
  return {
    tileX: toTileCoordinate(worldX, tileWidth),
    tileY: toTileCoordinate(worldY, tileHeight),
  };
}

export function isTileInBounds(tileX, tileY, roomWidthTiles, roomHeightTiles) {
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) return false;
  if (!Number.isFinite(roomWidthTiles) || !Number.isFinite(roomHeightTiles)) return false;
  return tileX >= 0 && tileY >= 0 && tileX < roomWidthTiles && tileY < roomHeightTiles;
}

export function tileKey(tileX, tileY) {
  return `${tileX},${tileY}`;
}

export function parseTileKey(key) {
  if (typeof key !== "string") return null;
  const parts = key.split(",");
  if (parts.length !== 2) return null;
  const tileX = Number(parts[0]);
  const tileY = Number(parts[1]);
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) return null;
  return { tileX, tileY };
}

export function buildRevealNeighborhood(centerTileX, centerTileY, radiusTiles) {
  const radius = Math.max(0, Math.floor(radiusTiles));
  const tiles = [];

  for (let tileY = centerTileY - radius; tileY <= centerTileY + radius; tileY += 1) {
    for (let tileX = centerTileX - radius; tileX <= centerTileX + radius; tileX += 1) {
      tiles.push({ tileX, tileY });
    }
  }

  return tiles;
}

export function resolveHudFrame({
  anchor,
  marginPx,
  widthPx,
  heightPx,
  viewportWidth,
  viewportHeight,
}) {
  const frameWidth = Math.max(40, Math.floor(widthPx));
  const frameHeight = Math.max(40, Math.floor(heightPx));
  const margin = Math.max(0, Math.floor(marginPx));

  let x = margin;
  let y = margin;

  if (anchor === "top-right") {
    x = viewportWidth - frameWidth - margin;
  } else if (anchor === "bottom-left") {
    y = viewportHeight - frameHeight - margin;
  } else if (anchor === "bottom-right") {
    x = viewportWidth - frameWidth - margin;
    y = viewportHeight - frameHeight - margin;
  }

  return { x, y, width: frameWidth, height: frameHeight };
}

export function projectWorldPointToFrame({
  worldX,
  worldY,
  roomWidthPx,
  roomHeightPx,
  frame,
}) {
  const roomWidth = Math.max(1, roomWidthPx);
  const roomHeight = Math.max(1, roomHeightPx);
  const normalizedX = clamp(worldX / roomWidth, 0, 1);
  const normalizedY = clamp(worldY / roomHeight, 0, 1);

  return {
    x: frame.x + normalizedX * frame.width,
    y: frame.y + normalizedY * frame.height,
  };
}

export function projectWorldRectToFrame({ rect, roomWidthPx, roomHeightPx, frame }) {
  const topLeft = projectWorldPointToFrame({
    worldX: rect.x,
    worldY: rect.y,
    roomWidthPx,
    roomHeightPx,
    frame,
  });

  const bottomRight = projectWorldPointToFrame({
    worldX: rect.x + rect.w,
    worldY: rect.y + rect.h,
    roomWidthPx,
    roomHeightPx,
    frame,
  });

  return {
    x: topLeft.x,
    y: topLeft.y,
    w: Math.max(1, bottomRight.x - topLeft.x),
    h: Math.max(1, bottomRight.y - topLeft.y),
  };
}
