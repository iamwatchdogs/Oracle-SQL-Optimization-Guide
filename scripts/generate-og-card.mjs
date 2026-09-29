import { readFileSync, writeFileSync } from 'node:fs';
import { SITE_ORIGIN } from '../src/lib/site.mjs';
import { GLYPHS, GLYPH_HEIGHT, GLYPH_WIDTH } from './bitmap-font.mjs';
import { deflateSync } from 'node:zlib';

/**
 * Generate the default social card.
 *
 * A link shared into a chat window with no image renders as a bare URL, and a
 * link with a 1:1.91 image renders as a card cropped to a strip of it. One 1200x630
 * PNG, drawn from the same tokens as the icons, is the smallest thing that fixes
 * both.
 *
 * `sharp` would render the SVG, but it hangs on the first `toBuffer` in this
 * environment. The card is text and rectangles, so it is rasterised here — a
 * bitmap font for the few glyphs the title needs, and nothing else.
 *
 * Run it when the tokens or the title change: `bun run icons`.
 */

const ROOT = new URL('../', import.meta.url).pathname;
const OUT = `${ROOT}public/og-default.png`;

const WIDTH = 1200;
const HEIGHT = 630;

/*
 * Set here rather than measured from `SITE_TITLE`, because a bitmap font has no
 * kerning and no way to wrap: the card is a fixed layout, and these are the lines
 * that fit it. The full title is the meta description's job, not the card's.
 */
const TITLE_LINES = ['ORACLE SQL', 'OPTIMIZATION'];
const SUBTITLE = 'EVIDENCE-GRADED TUNING FOR JUNIOR DEVELOPERS';

const tokens = readTokens();

function readTokens() {
  const css = readFileSync(`${ROOT}src/styles/global.css`, 'utf8');
  const found = {};
  /* The first declaration of a custom property is the dark default, which is what
     a social card is viewed against: it has no theme of its own and cannot be
     re-styled by whatever app renders it. */
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

/** A mutable RGB canvas. Every drawing operation writes into `pixels`. */
const canvas = () => {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);

  const set = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return;
    }
    const at = (y * WIDTH + x) * 3;
    pixels[at] = rgb[0];
    pixels[at + 1] = rgb[1];
    pixels[at + 2] = rgb[2];
  };

  const fill = (rgb) => {
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        set(x, y, rgb);
      }
    }
  };

  const rect = (left, top, width, height, rgb) => {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        set(x, y, rgb);
      }
    }
  };

  return { pixels, set, fill, rect };
};

/** Draw text, scaled. Returns the width it occupied, so lines can be centred. */
const text = (draw, value, left, top, scale, rgb) => {
  let x = left;
  for (const character of value.toUpperCase()) {
    const glyph = GLYPHS[character] ?? GLYPHS[' '];
    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      for (let cell = 0; cell < GLYPH_WIDTH; cell += 1) {
        if (glyph[row][cell] === '#') {
          draw.rect(x + cell * scale, top + row * scale, scale, scale, rgb);
        }
      }
    }
    x += (GLYPH_WIDTH + 1) * scale;
  }
  return x - left - scale;
};

const textWidth = (value, scale) => value.length * (GLYPH_WIDTH + 1) * scale - scale;

/**
 * The card, with a vertical budget laid out rather than accumulated.
 *
 * The first version advanced a cursor as it drew and ran out of height: the
 * subtitle landed on top of the host line, and the zone marks landed on top of the
 * subtitle. Positions are therefore written down, in order, against a 630px card.
 */
const LAYOUT = {
  markTop: 70,
  markRuleGap: 30,
  markRuleCount: 3,
  titleTop: 215,
  titleScale: 10,
  titleLineGap: 30,
  subtitleTop: 425,
  ruleTop: 480,
  zonesTop: 515,
  hostTop: 565,
  hostScale: 4,
};

const band = (top, height) => ({ top, bottom: top + height });

/** The margin either side, and therefore the width every line has to fit. */
const MARGIN = 88;
const column = WIDTH - 2 * MARGIN;

/** As large as the line can be and still fit, rather than a number that was tried. */
const subtitleScaleFor = (width) => Math.max(2, Math.floor(width / (textWidth(SUBTITLE, 1) + 1)));

/**
 * Every band the card draws, so they can be checked against each other.
 *
 * The first two versions of this layout overlapped — the subtitle sat on the
 * second title line, then the host line sat on the subtitle — and both times the
 * only way to notice was to look at the rendered PNG. The bands are therefore
 * checked, not trusted.
 */
const bands = () => {
  const titleHeight = GLYPH_HEIGHT * LAYOUT.titleScale;
  const subtitleScale = subtitleScaleFor(column);

  return [
    ['mark', band(LAYOUT.markTop, LAYOUT.markRuleGap * LAYOUT.markRuleCount)],
    ['title', band(LAYOUT.titleTop, titleHeight * 2 + LAYOUT.titleLineGap)],
    ['subtitle', band(LAYOUT.subtitleTop, GLYPH_HEIGHT * subtitleScale)],
    ['rule', band(LAYOUT.ruleTop, 2)],
    ['zones', band(LAYOUT.zonesTop, 10)],
    ['host', band(LAYOUT.hostTop, GLYPH_HEIGHT * LAYOUT.hostScale)],
  ];
};

const assertNoOverlap = () => {
  const laid = bands();
  for (const [index, [name, span]] of laid.entries()) {
    for (const [other, next] of laid.slice(index + 1)) {
      if (next.top < span.bottom && span.top < next.bottom) {
        throw new Error(`og card layout: "${name}" and "${other}" overlap`);
      }
    }
  }
  const last = laid.at(-1)[1];
  if (last.bottom > HEIGHT) {
    throw new Error(`og card layout: "${laid.at(-1)[0]}" runs past the canvas`);
  }
};

/** The header's mark: three rules, the shortest last. */
const paintMark = (draw) => {
  [180, 180, 120].forEach((length, index) => {
    draw.rect(
      MARGIN,
      LAYOUT.markTop + index * LAYOUT.markRuleGap,
      length,
      12,
      hexToRgb(tokens.accent),
    );
  });
};

/** The four evidence grades, in the book's own vocabulary. */
const paintZones = (draw) => {
  const zoneWidth = Math.floor((column - 3 * 24) / 4);
  [tokens['zone-a'], tokens['zone-b'], tokens['zone-c'], tokens['zone-d']].forEach(
    (zone, index) => {
      draw.rect(MARGIN + index * (zoneWidth + 24), LAYOUT.zonesTop, zoneWidth, 10, hexToRgb(zone));
    },
  );
};

const paint = () => {
  const draw = canvas();
  const ink = hexToRgb(tokens.ink);
  const muted = hexToRgb(tokens['ink-muted']);

  draw.fill(hexToRgb(tokens.paper));
  paintMark(draw);

  /*
   * One left margin for everything. Centring the title looked tidier in a
   * thumbnail and wrong at full size: two lines of different lengths cannot both
   * be centred and also line up with the mark above them.
   */
  TITLE_LINES.forEach((line, index) => {
    const step = GLYPH_HEIGHT * LAYOUT.titleScale + LAYOUT.titleLineGap;
    text(draw, line, MARGIN, LAYOUT.titleTop + index * step, LAYOUT.titleScale, ink);
  });

  text(draw, SUBTITLE, MARGIN, LAYOUT.subtitleTop, subtitleScaleFor(column), muted);
  draw.rect(MARGIN, LAYOUT.ruleTop, column, 2, hexToRgb(tokens.rule));
  paintZones(draw);
  text(
    draw,
    SITE_ORIGIN.replace(/^https?:\/\//u, ''),
    MARGIN,
    LAYOUT.hostTop,
    LAYOUT.hostScale,
    muted,
  );

  return draw.pixels;
};

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

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** 8-bit RGB, which is three bytes per pixel rather than four. */
const encodePng = (pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;

  const stride = WIDTH * 3;
  const scanlines = Buffer.alloc(HEIGHT * (stride + 1));
  for (let y = 0; y < HEIGHT; y += 1) {
    scanlines[y * (stride + 1)] = 0;
    pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

assertNoOverlap();

const card = paint();
writeFileSync(OUT, encodePng(card));
process.stdout.write(`wrote og-default.png (${WIDTH}x${HEIGHT})\n`);
