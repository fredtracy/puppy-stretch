// Rasterises Darla's portrait (the same shapes as src/portrait-darla.js) into
// the PNG app icons in public/icons, with no canvas library: 4x4
// supersampling + zlib. Run: node scripts/make-icons.mjs public/icons
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const BG = [0xf7, 0xc4, 0xb4]; // the page's sky, --sky-mid

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Shapes in portrait units (c = 1, origin at the face centre, y down), in
// paint order. Each: colour, centre, radii, rotation.
function shapes() {
  const s = [];
  for (const side of [-1, 1]) s.push({ col: hex('#a9855c'), cx: side * 0.62, cy: -0.1, rx: 0.22, ry: 0.42, rot: side * 0.35 });
  s.push({ col: hex('#c4a074'), cx: 0, cy: 0, rx: 0.72, ry: 0.72, rot: 0 });
  s.push({ col: hex('#f1e8d9'), cx: 0, cy: 0.32, rx: 0.36, ry: 0.26, rot: 0 });
  s.push({ col: hex('#1c1712'), cx: 0, cy: 0.22, rx: 0.09, ry: 0.06, rot: 0 });
  for (const side of [-1, 1]) s.push({ col: hex('#1c1712'), cx: side * 0.26, cy: -0.06, rx: 0.07, ry: 0.07, rot: 0 });
  return s;
}

function inside(sh, x, y) {
  const dx = x - sh.cx;
  const dy = y - sh.cy;
  const c = Math.cos(sh.rot);
  const s = Math.sin(sh.rot);
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  return (lx / sh.rx) ** 2 + (ly / sh.ry) ** 2 <= 1;
}

// `face` = the portrait's full width as a fraction of the icon. Maskable
// icons get cropped to a circle of 80% of the icon, so the face is kept
// well inside that.
function render(size, face, background) {
  const S = 4;
  const list = shapes();
  const c = (size * face) / 2;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const ux = (x + (sx + 0.5) / S - size / 2) / c;
          const uy = (y + (sy + 0.5) / S - size / 2) / c + 0.06; // nudge the face up a touch
          let col = background;
          for (const sh of list) if (inside(sh, ux, uy)) col = sh.col;
          if (col) {
            r += col[0]; g += col[1]; b += col[2]; a += 255;
          }
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      if (a === 0) continue;
      px[i] = Math.round((r / a) * 255);
      px[i + 1] = Math.round((g / a) * 255);
      px[i + 2] = Math.round((b / a) * 255);
      px[i + 3] = Math.round(a / n);
    }
  }
  return png(size, px);
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    t[n] = k >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(`${OUT}/icon-192.png`, render(192, 0.66, BG));
writeFileSync(`${OUT}/icon-512.png`, render(512, 0.66, BG));
writeFileSync(`${OUT}/apple-touch-icon.png`, render(180, 0.78, BG));
console.log('icons written to', OUT);
