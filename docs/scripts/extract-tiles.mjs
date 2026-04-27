#!/usr/bin/env node
/**
 * extract-tiles.mjs
 * ─────────────────
 * Scans all room JSONs → finds every GID used → extracts those exact tiles
 * from the atlas PNGs → saves as data/tiles/{tileset}/{GID}.png
 *
 * GID = Tiled's global tile ID (matches exactly what you see in Tiled)
 * Only tiles that are actually used get extracted.
 *
 * Run: node scripts/extract-tiles.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
// Script is at docs/scripts/extract-tiles.mjs → go up one level to docs/
const DOCS       = path.join(__dirname, '..');
const DATA       = path.join(DOCS, 'data');
const ROOMS_DIR  = path.join(DATA, 'rooms');
const OUTPUT_DIR = path.join(DATA, 'tiles');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// ── helpers ─────────────────────────────────────────────────────────────────

function nr(base, rel) {
  const b = String(base).split('/').filter(Boolean);
  const r = String(rel || '').split('/').filter(Boolean);
  for (const p of r) {
    if (p === '.') continue;
    if (p === '..') { b.pop(); continue; }
    b.push(p);
  }
  return b.join('/');
}

function dir(p) {
  const b = String(p || '').split('/').filter(Boolean);
  b.pop();
  return b.join('/');
}

function parseTsx(xml, sourcePath) {
  const parsed = parser.parse(xml);
  const ts = parsed?.tileset;
  if (!ts) return null;
  const bd = dir(sourcePath);
  const img = ts.image;
  const imgSrc = (img && typeof img === 'object') ? img['@_source'] : null;
  return {
    imagePath:  imgSrc ? nr(bd, imgSrc) : null,
    tilewidth:  Number(ts['@_tilewidth']  || 0) || 16,
    tileheight: Number(ts['@_tileheight'] || 0) || 16,
    columns:    Number(ts['@_columns']     || 0) || 24,
    tilecount:  Number(ts['@_tilecount']   || 0) || 576,
  };
}

// ── step 1: collect all GIDs + tileset metadata from room JSONs ────────────────

const roomFiles = fs.readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json'));
console.log(`Rooms found: ${roomFiles.length}`);

const usedGids = new Set();

// tilesetBySource: source path (e.g. "../tilesets/X.tsx") → { source, firstgid, name }
const tilesetBySource = {};

for (const rf of roomFiles) {
  const room = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, rf), 'utf8'));

  for (const ts of (room.tilesets || [])) {
    if (ts.source && !tilesetBySource[ts.source]) {
      tilesetBySource[ts.source] = {
        source:   ts.source,
        firstgid: Number(ts.firstgid || 0),
        name:     path.basename(String(ts.source), '.tsx'),
      };
    }
  }

  for (const layer of (room.layers || [])) {
    if (layer.type === 'tilelayer') {
      for (const gid of (layer.data || [])) {
        if (gid >>> 0) usedGids.add(gid >>> 0);
      }
    } else if (layer.type === 'objectgroup') {
      for (const obj of (layer.objects || [])) {
        if (obj.gid >>> 0) usedGids.add(obj.gid >>> 0);
      }
    }
  }
}

const sorted = [...usedGids].sort((a, b) => a - b);
console.log(`Unique GIDs used: ${sorted.length}`);

// ── step 2: map each GID → its tileset + local ID ───────────────────────────

const tilesetSources = Object.values(tilesetBySource)
  .sort((a, b) => a.firstgid - b.firstgid);

function findTileset(gid) {
  let best = null;
  for (const ts of tilesetSources) {
    if (gid >= ts.firstgid && (!best || ts.firstgid > best.firstgid)) best = ts;
  }
  return best;
}

// atlasUsage: source path → Set of local tile IDs needed
const atlasUsage = new Map();
for (const gid of sorted) {
  const ts = findTileset(gid);
  if (!ts) continue;
  if (!atlasUsage.has(ts.source)) atlasUsage.set(ts.source, new Set());
  atlasUsage.get(ts.source).add(gid - ts.firstgid);
}

// ── step 3: parse TSX files to get atlas image paths + dimensions ───────────

// atlasMeta: source path → { imagePath, tilewidth, tileheight, columns, firstgid, name }
const atlasMeta = {};

for (const [src, localIds] of atlasUsage) {
  // src is like "../tilesets/prototype-tileset/prototype-tileset.tsx"
  // Normalize the TSX path relative to data/rooms/ so .. is resolved cleanly
  const tsxRelative    = nr('data/rooms', src);           // "data/tilesets/prototype-tileset/prototype-tileset.tsx"
  const tsxAbs         = path.join(DOCS, tsxRelative);
  const tsxDirForImg  = dir(tsxRelative);                 // "data/tilesets/prototype-tileset" — no .. in it now

  if (!fs.existsSync(tsxAbs)) {
    console.warn(`  TSX missing: ${tsxAbs}`);
    continue;
  }

  const meta = parseTsx(fs.readFileSync(tsxAbs, 'utf8'), tsxRelative);
  if (!meta?.imagePath) {
    console.warn(`  No <image> in TSX: ${src}`);
    continue;
  }

  // meta.imagePath from parseTsx is already fully resolved (parseTsx uses dir(sourcePath) as base)
  atlasMeta[src] = {
    imagePath:  meta.imagePath,
    tilewidth:  meta.tilewidth,
    tileheight: meta.tileheight,
    columns:    meta.columns,
    tilecount:  meta.tilecount,
    firstgid:   tilesetBySource[src].firstgid,
    name:       tilesetBySource[src].name,
  };
}

console.log(`\nAtlases to process: ${atlasUsage.size}`);
for (const [src, localIds] of atlasUsage) {
  const m = atlasMeta[src];
  if (m) console.log(`  ${m.name}: ${m.imagePath} (${m.tilewidth}x${m.tileheight}, ${m.columns} cols, ${localIds.size} tiles needed)`);
  else console.log(`  ${src}: SKIPPED (TSX parse failed)`);
}

// ── step 4: extract tiles ────────────────────────────────────────────────────

(async () => {
  let extracted = 0;
  let skipped  = 0;

  for (const [src, localIds] of atlasUsage) {
    const meta = atlasMeta[src];
    if (!meta) { skipped += localIds.size; continue; }

    // meta.imagePath is already the fully resolved path (from step 3)
    const atlasAbs = meta.imagePath ? path.join(DOCS, meta.imagePath) : null;
    if (!atlasAbs || !fs.existsSync(atlasAbs)) {
      console.warn(`  ATLAS MISSING: ${atlasAbs}`);
      skipped += localIds.size;
      continue;
    }

    const outDir = path.join(OUTPUT_DIR, meta.name);
    fs.mkdirSync(outDir, { recursive: true });

    let atlasBuf, atlasW, atlasH;
    try {
      const raw = await sharp(atlasAbs).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      atlasBuf = raw.data;
      atlasW   = raw.info.width;
      atlasH   = raw.info.height;
    } catch (e) {
      console.warn(`  Failed to load atlas ${meta.imagePath}: ${e.message}`);
      skipped += localIds.size;
      continue;
    }

    const sortedLocals = [...localIds].sort((a, b) => a - b);
    console.log(`  Extracting ${sortedLocals.length} tiles from ${meta.name} (${atlasW}x${atlasH})...`);

    for (const localId of sortedLocals) {
      const globalGid = meta.firstgid + localId;
      const col = localId % meta.columns;
      const row = Math.floor(localId / meta.columns);
      const sx  = col * meta.tilewidth;
      const sy  = row * meta.tileheight;

      if (sx + meta.tilewidth > atlasW || sy + meta.tileheight > atlasH) {
        skipped++;
        continue;
      }

      const outPath = path.join(outDir, `${globalGid}.png`);
      try {
        await sharp(atlasBuf, { raw: { width: atlasW, height: atlasH, channels: 4 } })
          .extract({ left: sx, top: sy, width: meta.tilewidth, height: meta.tileheight })
          .png()
          .toFile(outPath);
        extracted++;
      } catch (e) {
        console.warn(`    FAIL GID ${globalGid}: ${e.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n✅ Done — ${extracted} tiles extracted, ${skipped} skipped`);
  console.log(`Output dir: ${OUTPUT_DIR}/`);
  console.log('\nRenderSystem change:');
  console.log('  Load: assets[\`tile:\${gid}\`] = loadImage(\`data/tiles/\${tileset}/\${gid}.png\`);');
  console.log('  Draw: image(assets[\`tile:\${gid}\`], x, y, w, h);');
})().catch(e => { console.error(e); process.exit(1); });
