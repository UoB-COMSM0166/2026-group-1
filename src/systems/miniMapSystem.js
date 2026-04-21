/*
========================================
VERSION: 1.0
SYSTEM: MINIMAP SYSTEM
DESCRIPTION:
- Circular minimap UI shell in top-right screen space
- Invisible circular clip boundary for minimap contents
========================================
*/


const DEFAULT_MINIMAP_CONFIG = {
    radius: 150,
    padding: 20,
    centerX: null,
    centerY: null,
    dialRadius: null,
    dialInset: 8,
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    mapInset: 6,
    zoom: 1,
    discoveredTileColor: 'rgba(120, 170, 210, 0.85)',
    playerColor: 'rgba(255, 120, 120, 0.95)',
    playerMarkerTileScale: 1.25,
    playerRadius: 4,
};

const MIN_TILE_SIZE = 1;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createMask(cols, rows) {
    return new Uint8Array(cols * rows);
}

function getWallRect(wall) {
    if (!wall || typeof wall !== 'object') return null;

    if (typeof wall.getCornerX === 'function' && typeof wall.getCornerY === 'function') {
        const w = wall.getWidth?.() ?? 0;
        const h = wall.getHeight?.() ?? 0;
        if (!w || !h) return null;

        return {
            x: wall.getCornerX(),
            y: wall.getCornerY(),
            w,
            h,
        };
    }

    const w = Number(wall.w ?? wall.width ?? 0);
    const h = Number(wall.h ?? wall.height ?? 0);
    if (!w || !h) return null;

    const cx = Number(wall.x ?? 0);
    const cy = Number(wall.y ?? 0);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    return {
        x: cx - (w / 2),
        y: cy - (h / 2),
        w,
        h,
    };
}

function markMaskRect(mask, cols, rows, tileWidth, tileHeight, rect) {
    if (!rect) return;

    const startTileX = clamp(Math.floor(rect.x / tileWidth), 0, cols - 1);
    const endTileX = clamp(Math.ceil((rect.x + rect.w) / tileWidth) - 1, 0, cols - 1);
    const startTileY = clamp(Math.floor(rect.y / tileHeight), 0, rows - 1);
    const endTileY = clamp(Math.ceil((rect.y + rect.h) / tileHeight) - 1, 0, rows - 1);

    for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
            mask[(ty * cols) + tx] = 1;
        }
    }
}

function createRoomRevealState(roomId, roomState, platforms) {
    const tileWidth = Math.max(MIN_TILE_SIZE, Number(roomState?.tileWidth ?? 16));
    const tileHeight = Math.max(MIN_TILE_SIZE, Number(roomState?.tileHeight ?? 16));
    const roomWidth = Math.max(tileWidth, Number(roomState?.width ?? tileWidth));
    const roomHeight = Math.max(tileHeight, Number(roomState?.height ?? tileHeight));

    const cols = Math.max(1, Math.ceil(roomWidth / tileWidth));
    const rows = Math.max(1, Math.ceil(roomHeight / tileHeight));

    const solidMask = createMask(cols, rows);
    for (const wall of platforms ?? []) {
        markMaskRect(solidMask, cols, rows, tileWidth, tileHeight, getWallRect(wall));
    }

    return {
        roomId,
        cols,
        rows,
        tileWidth,
        tileHeight,
        width: roomWidth,
        height: roomHeight,
        solidMask,
        discoveredMask: createMask(cols, rows),
    };
}

function revealTile(state, tx, ty) {
    if (!state) return;
    if (tx < 0 || ty < 0 || tx >= state.cols || ty >= state.rows) return;

    const index = (ty * state.cols) + tx;
    if (!state.solidMask[index]) return;
    state.discoveredMask[index] = 1;
}

function revealRect(state, rect) {
    if (!state || !rect) return;

    const startTileX = clamp(Math.floor(rect.x / state.tileWidth), 0, state.cols - 1);
    const endTileX = clamp(Math.ceil((rect.x + rect.w) / state.tileWidth) - 1, 0, state.cols - 1);
    const startTileY = clamp(Math.floor(rect.y / state.tileHeight), 0, state.rows - 1);
    const endTileY = clamp(Math.ceil((rect.y + rect.h) / state.tileHeight) - 1, 0, state.rows - 1);

    for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
            revealTile(state, tx, ty);
        }
    }
}

function applySonarReveal(state, sonarReveals) {
    if (!state || !Array.isArray(sonarReveals)) return;

    for (const reveal of sonarReveals) {
        if (!reveal) continue;
        revealRect(state, {
            x: Number(reveal.x ?? 0),
            y: Number(reveal.y ?? 0),
            w: Number(reveal.w ?? 0),
            h: Number(reveal.h ?? 0),
        });
    }
}

function applyTorchReveal(state, player) {
    if (!state || !player?.torch?.isOn) return;

    const radius = Number(player?.torch?.radius ?? 0);
    const px = Number(player?.position?.x ?? player?.x ?? 0);
    const py = Number(player?.position?.y ?? player?.y ?? 0);
    if (!Number.isFinite(radius) || radius <= 0) return;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    const startTileX = clamp(Math.floor((px - radius) / state.tileWidth), 0, state.cols - 1);
    const endTileX = clamp(Math.ceil((px + radius) / state.tileWidth) - 1, 0, state.cols - 1);
    const startTileY = clamp(Math.floor((py - radius) / state.tileHeight), 0, state.rows - 1);
    const endTileY = clamp(Math.ceil((py + radius) / state.tileHeight) - 1, 0, state.rows - 1);
    const radiusSquared = radius * radius;

    for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
            const cx = (tx + 0.5) * state.tileWidth;
            const cy = (ty + 0.5) * state.tileHeight;
            const dx = cx - px;
            const dy = cy - py;
            if ((dx * dx) + (dy * dy) <= radiusSquared) {
                revealTile(state, tx, ty);
            }
        }
    }
}

function getMapFrame(circle, revealState, player, options = {}) {
    const config = { ...DEFAULT_MINIMAP_CONFIG, ...options };
    const availableSize = Math.max(1, (circle.radius * 2) - (config.mapInset * 2));
    const roomWidth = Math.max(1, Number(revealState?.width ?? 1));
    const roomHeight = Math.max(1, Number(revealState?.height ?? 1));
    const baseScale = Math.min(availableSize / roomWidth, availableSize / roomHeight);
    const zoom = Math.max(0.05, Number(config.zoom ?? 1));
    const scale = baseScale * zoom;

    const playerX = Number(player?.position?.x ?? player?.x ?? roomWidth / 2);
    const playerY = Number(player?.position?.y ?? player?.y ?? roomHeight / 2);

    return {
        x: circle.x - (playerX * scale),
        y: circle.y - (playerY * scale),
        scale,
    };
}

function drawDiscoveredTiles(ctx, circle, revealState, player, options = {}) {
    if (!revealState) return;
    const mapFrame = getMapFrame(circle, revealState, player, options);
    ctx.fillStyle = options.discoveredTileColor ?? DEFAULT_MINIMAP_CONFIG.discoveredTileColor;

    for (let ty = 0; ty < revealState.rows; ty++) {
        for (let tx = 0; tx < revealState.cols; tx++) {
            const index = (ty * revealState.cols) + tx;
            if (!revealState.discoveredMask[index]) continue;

            const x = mapFrame.x + ((tx * revealState.tileWidth) * mapFrame.scale);
            const y = mapFrame.y + ((ty * revealState.tileHeight) * mapFrame.scale);
            const w = Math.max(1, revealState.tileWidth * mapFrame.scale);
            const h = Math.max(1, revealState.tileHeight * mapFrame.scale);

            ctx.fillRect(x, y, w, h);
        }
    }
}

function drawPlayerMarker(ctx, circle, revealState, player, options = {}) {
    if (!revealState || !player) return;

    const mapFrame = getMapFrame(circle, revealState, player, options);
    const renderedTileSize = Math.max(
        1,
        Math.min(revealState.tileWidth, revealState.tileHeight) * mapFrame.scale,
    );
    const markerTileScale = Math.max(0.1, Number(options.playerMarkerTileScale ?? DEFAULT_MINIMAP_CONFIG.playerMarkerTileScale));
    const markerDiameter = renderedTileSize * markerTileScale;
    const markerRadius = Math.max(1, markerDiameter / 2);

    ctx.beginPath();
    ctx.arc(circle.x, circle.y, markerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = options.playerColor ?? DEFAULT_MINIMAP_CONFIG.playerColor;
    ctx.fill();
}

export function getMiniMapCircle(canvas, options = {}) {
    const config = { ...DEFAULT_MINIMAP_CONFIG, ...options };

    const dialRadius = Number(config.dialRadius);
    const dialInset = Math.max(0, Number(config.dialInset ?? 0));
    const hasDialRadius = Number.isFinite(dialRadius) && dialRadius > 0;
    const radius = hasDialRadius
        ? Math.max(4, dialRadius - dialInset)
        : config.radius;

    const hasAbsoluteCenter = Number.isFinite(config.centerX) && Number.isFinite(config.centerY);
    const x = hasAbsoluteCenter
        ? Number(config.centerX)
        : (canvas.width - config.padding - radius);
    const y = hasAbsoluteCenter
        ? Number(config.centerY)
        : (config.padding + radius);

    return {
        x,
        y,
        radius,
    };
}

function buildCirclePath(ctx, circle) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
}

export function beginMiniMapClip(ctx, circle) {
    ctx.save();
    buildCirclePath(ctx, circle);
    ctx.clip(); // Invisible border/mask: drawing is restricted to this circle.
}

export function endMiniMapClip(ctx) {
    ctx.restore();
}

export function drawMiniMapBorder(ctx, circle, options = {}) {
    const config = { ...DEFAULT_MINIMAP_CONFIG, ...options };
    buildCirclePath(ctx, circle);
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = config.borderWidth;
    ctx.stroke();
}

export function drawMiniMapContents(ctx, circle, options = {}, runtime = {}) {
    const config = { ...DEFAULT_MINIMAP_CONFIG, ...options };

    if (config.backgroundColor) {
        buildCirclePath(ctx, circle);
        ctx.fillStyle = config.backgroundColor;
        ctx.fill();
    }

    drawDiscoveredTiles(ctx, circle, runtime.revealState, runtime.player, config);
    drawPlayerMarker(ctx, circle, runtime.revealState, runtime.player, config);
}

export function drawMiniMap(ctx, canvas, options = {}, runtime = {}) {
    const circle = getMiniMapCircle(canvas, options);

    beginMiniMapClip(ctx, circle);
    drawMiniMapContents(ctx, circle, options, runtime);
    endMiniMapClip(ctx);

    drawMiniMapBorder(ctx, circle, options);

    return circle;
}

export function createMiniMapSystem(options = {}) {
    const drawOptions = { ...options };
    const roomRevealStateById = new Map();

    const getPlayer = options.getPlayer ?? (() => options.player ?? null);
    const getRoomState = options.getRoomState ?? (() => null);
    const getPlatforms = options.getPlatforms ?? (() => []);
    const getSonarReveals = options.getSonarReveals ?? (() => []);

    function ensureRoomRevealState(roomState) {
        const roomId = String(roomState?.currentRoom ?? 'unknown-room');
        let state = roomRevealStateById.get(roomId);
        if (state) return state;

        state = createRoomRevealState(roomId, roomState, getPlatforms?.() ?? []);
        roomRevealStateById.set(roomId, state);
        return state;
    }

    function updateDiscoveryState() {
        const roomState = getRoomState?.();
        if (!roomState) return null;

        const revealState = ensureRoomRevealState(roomState);
        const player = getPlayer?.();

        applySonarReveal(revealState, getSonarReveals?.() ?? []);
        applyTorchReveal(revealState, player);

        return revealState;
    }

    function draw() {
        const ctx = globalThis?.drawingContext;
        const canvas = globalThis?.canvas;
        const player = getPlayer?.();
        const revealState = updateDiscoveryState();

        if (!ctx || !canvas) return;
        drawMiniMap(ctx, canvas, drawOptions, {
            revealState,
            player,
        });
    }

    function update() {
        // Intentionally empty for scaffold phase.
    }

    return {
        update,
        draw,
    };
}