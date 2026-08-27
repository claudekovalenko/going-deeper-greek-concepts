// Render the PNG icons the manifest and iOS need, straight from Node.
//
// There is no image library here and no need for one: the mark is a rounded
// square with an alpha drawn on it, which is three line segments. Distance to a
// segment gives anti-aliasing for free, and zlib gives us PNG.
//
//   node tools/icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [0x12, 0x14, 0x1c];
const FG = [0x7b, 0x8c, 0xff];

/** Distance from point p to segment ab. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Signed distance to a rounded rectangle, negative inside. */
function roundedRect(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(x1 - r, px));
  const cy = Math.max(y0 + r, Math.min(y1 - r, py));
  const d = Math.hypot(px - cx, py - cy) - r;
  const inside = px >= x0 && px <= x1 && py >= y0 && py <= y1;
  return inside && px > x0 + r && px < x1 - r ? -r : inside && py > y0 + r && py < y1 - r ? -r : d;
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * @param size    pixel size
 * @param inset   fraction of the canvas kept clear round the edge. Maskable
 *                icons get a fat one so Android can crop a circle out of it.
 * @param rounded whether the plate has rounded corners (maskable ones are
 *                cropped anyway, so they get a full bleed square).
 */
function draw(size, { inset = 0, rounded = true } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const s = size;
  const pad = inset * s;
  const plate = { x0: pad, y0: pad, x1: s - pad, y1: s - pad, r: rounded ? 0.22 * (s - 2 * pad) : 0 };

  // The alpha, in units of the plate.
  const u = (v) => plate.x0 + v * (plate.x1 - plate.x0);
  const w = (v) => plate.y0 + v * (plate.y1 - plate.y0);
  const stroke = 0.09 * (plate.x1 - plate.x0);
  const legs = [
    [u(0.28), w(0.78), u(0.5), w(0.22)],
    [u(0.72), w(0.78), u(0.5), w(0.22)],
    [u(0.365), w(0.61), u(0.635), w(0.61)]
  ];

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const i = (y * s + x) * 4;

      const plateD = rounded
        ? roundedRect(cx, cy, plate.x0, plate.y0, plate.x1, plate.y1, plate.r)
        : cx >= plate.x0 && cx <= plate.x1 && cy >= plate.y0 && cy <= plate.y1
          ? -1
          : 1;
      const plateA = Math.max(0, Math.min(1, 0.5 - plateD));

      let glyph = Infinity;
      for (const [ax, ay, bx, by] of legs) glyph = Math.min(glyph, distToSegment(cx, cy, ax, ay, bx, by));
      const glyphA = Math.max(0, Math.min(1, 0.5 - (glyph - stroke / 2)));

      const rgb = mix(BG, FG, glyphA);
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = Math.round(255 * plateA);
    }
  }
  return px;
}

/* ---------- the smallest PNG encoder that will do ---------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha
  // Each scanline is prefixed with filter type 0 — no filtering.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync(resolve(ROOT, 'icons'), { recursive: true });

const OUT = [
  ['icons/icon-192.png', 192, {}],
  ['icons/icon-512.png', 512, {}],
  ['icons/icon-180.png', 180, {}],
  // Android crops a circle out of the middle 80%, so keep the glyph well inside.
  ['icons/icon-maskable-512.png', 512, { inset: 0.14, rounded: false }]
];

for (const [file, size, opts] of OUT) {
  const buf = png(size, draw(size, opts));
  writeFileSync(resolve(ROOT, file), buf);
  console.log(`${file.padEnd(30)} ${size}×${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}
