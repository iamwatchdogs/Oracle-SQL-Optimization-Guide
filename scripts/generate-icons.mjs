import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

/**
 * Generate the icon set from the stylesheet's own colour tokens.
 *
 * The icons used to be an emoji in an inline data URI, and `public/favicon.svg` was
 * an orphan — shipped, linked by nobody, and out of step with the mark the header
 * draws. Everything here is drawn from `--paper` and `--accent` read out of
 * `global.css`, so a theme change that moves the brand colour moves the icons with
 * it instead of leaving three hard-coded PNGs behind.
 *
 * Written as a script rather than an integration because these are checked-in
 * build outputs. They do not change per deploy, and a build step that rewrites
 * committed binaries on every run is a way to produce a diff nobody meant to make.
 *
 * Run it by hand when the tokens change: `bun run icons`.
 *
 * ## Why the encoder is hand-rolled
 *
 * `sharp` is a dependency and it renders SVG, but it does not run in this
 * environment — it hangs on the first `toBuffer` with no output and no error. The
 * alternative was six binary files nobody could regenerate. So the icon is
 * rasterised by hand: it is three rectangles and a background, which is a few
 * hundred lines of arithmetic rather than a dependency, and it runs anywhere the
 * build does.
 */

const ROOT = new URL('../', import.meta.url).pathname;
const OUT = `${ROOT}public/`;

/** The mark, in a 100x100 box, as the header draws it: three rules on paper. */
const MARGIN = 20;
const RULE_THICKNESS = 8;
const RULES = [
  { y: 28, length: 60 },
  { y: 50, length: 60 },
  { y: 72, length: 40 },
];

const tokens = readTokens();

function readTokens() {
  const css = readFileSync(`${ROOT}src/styles/global.css`, 'utf8');
  const found = {};
  /* The first declaration of each custom property is the dark default, which is
     the theme a favicon is painted against: an icon has no theme of its own, and a
     transparent-background icon on a light home screen would be unreadable. */
  for (const match of css.matchAll(/^\s*--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gmu)) {
    if (found[match[1]] === undefined) {
      found[match[1]] = match[2];
    }
  }
  return found;
}

const hexToRgb = (hex) => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

/**
 * Rasterise the mark at `size` as raw RGBA.
 *
 * Boxes are filled by testing each pixel against the mark in the 100-unit space
 * and scaling, so one description produces every size and a 16px icon is the same
 * drawing as a 512px one rather than a different one.
 */
function rasterise(size) {
  const paper = hexToRgb(tokens.paper);
  const accent = hexToRgb(tokens.accent);
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 100;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const unitX = x / scale;
      const unitY = y / scale;
      let rgb = paper;

      for (const rule of RULES) {
        const top = rule.y - RULE_THICKNESS / 2;
        if (
          unitY >= top &&
          unitY <= top + RULE_THICKNESS &&
          unitX >= MARGIN &&
          unitX <= MARGIN + rule.length
        ) {
          rgb = accent;
        }
      }

      const at = (y * size + x) * 4;
      pixels[at] = rgb[0];
      pixels[at + 1] = rgb[1];
      pixels[at + 2] = rgb[2];
      pixels[at + 3] = 255;
    }
  }

  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const encodePng = (size, pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  /* 8 bits per channel, colour type 6 (RGBA). */
  header[8] = 8;
  header[9] = 6;
  /* Each scanline is prefixed with its filter type; 0 is "none", which compresses
     a flat block of colour about as well as anything and costs no implementation. */
  const scanlines = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    scanlines[y * (size * 4 + 1)] = 0;
    pixels.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

/**
 * An ICO holding PNG payloads.
 *
 * PNG-in-ICO is what every current browser reads, and it means one rasterisation
 * serves the 16px and 32px entries — the format also permits BMP, which would mean
 * encoding each one twice.
 */
const encodeIco = (entries) => {
  /* reserved, type (1 = icon), image count */
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  /* One 16-byte directory entry per size, then the payloads. */
  const directory = Buffer.alloc(16 * entries.length);
  entries.forEach((entry, index) => {
    const at = index * 16;
    /* 0 means 256: the directory entry is one byte per dimension. */
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(entry.png.length, at + 8);
    /* Past the header and the whole directory, then the payloads already written. */
    directory.writeUInt32LE(6 + 16 * entries.length + offsetOf(entries, index), at + 12);
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
};

const offsetOf = (entries, index) =>
  entries.slice(0, index).reduce((sum, entry) => sum + entry.png.length, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Oracle SQL Optimization">
  <rect width="100" height="100" fill="${tokens.paper}"/>
${RULES.map(
  (rule) =>
    `  <rect x="${MARGIN}" y="${rule.y - RULE_THICKNESS / 2}" width="${rule.length}" height="${RULE_THICKNESS}" fill="${tokens.accent}"/>`,
).join('\n')}
</svg>
`;

const png = (size) => encodePng(size, rasterise(size));

const icoEntries = [16, 32].map((size) => ({ size, png: png(size) }));

writeFileSync(`${OUT}favicon.svg`, svg);
writeFileSync(`${OUT}favicon.ico`, encodeIco(icoEntries));
writeFileSync(`${OUT}favicon-16x16.png`, png(16));
writeFileSync(`${OUT}favicon-32x32.png`, png(32));
writeFileSync(`${OUT}apple-touch-icon.png`, png(180));
writeFileSync(`${OUT}icon-192.png`, png(192));
writeFileSync(`${OUT}icon-512.png`, png(512));

process.stdout.write(
  `wrote favicon.svg, favicon.ico (16+32), favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, icon-192.png, icon-512.png\n`,
);
