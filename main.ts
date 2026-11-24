// News image for Tuesday 24 November 2026.
// A program that draws a newspaper front page summing up the day's world
// news and writes it to /output/entry.png. No network, no randomness, no
// clock: the same bytes come out of every run.
//
// Stories (all reported on 24 November 2026 unless marked as Monday):
//  - Beaver Supermoon peaks today (first of four supermoons)
//  - Nvidia shares soared 31% on Monday after Jensen Huang was reinstated
//  - Microsoft outage disrupted services for thousands today
//  - Modi and Nepal's PM flagged off the Saryu-Kamala Express today
//  - Rishabh Pant hit 128 in the Wellington Test today
//  - Robert Pattinson was cast as the next James Bond today
//  - Ferrari unveiled two new 296 models; O'Hare ground stop in the
//    Thanksgiving rush; Spain votes on 29 November.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

// ---- palette (newsprint) ----
const PAPER = [247, 242, 231];
const INK = [17, 24, 39];
const NAVY = [30, 58, 95];
const NAVY_D = [18, 38, 66];
const GOLD = [212, 175, 55];
const RED = [185, 28, 28];
const GREEN = [22, 101, 52];
const SKY = [219, 234, 254];
const MOON = [253, 230, 138];
const MOON_D = [217, 180, 84];
const GREY = [107, 114, 128];
const CARD = [255, 255, 255];

// ---- CRC32 (PNG chunk checksums) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}
function encodePNG(rgb: Uint8Array, w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- 5x7 bitmap font (uppercase + digits + punctuation) ----
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
};

// ---- canvas ----
class Canvas {
  data = new Uint8Array(W * H * 3);
  constructor() {
    this.fill(PAPER);
  }
  fill(c: number[]) {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = c[0];
      this.data[i * 3 + 1] = c[1];
      this.data[i * 3 + 2] = c[2];
    }
  }
  px(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
  }
  frame(x: number, y: number, w: number, h: number, c: number[], t = 2) {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[], t = 1) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) this.px(x + a, y + b, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: number[]) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -half; x <= half; x++) this.px(cx + x, cy + y, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: number[], t = 3) {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++) {
        this.px(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, c: number[]) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] || FONT[" "];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === "1") {
            for (let dy = 0; dy < scale; dy++)
              for (let dx = 0; dx < scale; dx++) this.px(cx + col * scale + dx, y + r * scale + dy, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }
  textW(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  center(s: string, y: number, scale: number, c: number[], cx0 = 0, cx1 = W) {
    this.text(s, cx0 + Math.floor((cx1 - cx0 - this.textW(s, scale)) / 2), y, scale, c);
  }
  // word-wrap text into lines that fit maxW at the given scale
  wrap(s: string, maxW: number, scale: number): string[] {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (this.textW(t, scale) <= maxW) {
        cur = t;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  para(s: string, x: number, y: number, maxW: number, scale: number, c: number[], gap = 4) {
    const lines = this.wrap(s, maxW, scale);
    lines.forEach((ln, i) => this.text(ln, x, y + i * (7 * scale + gap), scale, c));
    return lines.length;
  }
}

// ---- pictograms (all drawn from fixed coordinates, no randomness) ----
function drawMoon(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, NAVY_D);
  // stars at fixed spots
  const stars: Array<[number, number]> = [
    [18, 22], [52, 60], [330, 30], [300, 84], [40, 200], [340, 210], [90, 260], [290, 250],
  ];
  for (const [sx, sy] of stars) {
    cv.rect(x + sx, y + sy, 4, 4, [255, 255, 255]);
    cv.rect(x + sx + 1, y + sy - 3, 2, 10, [255, 255, 255]);
    cv.rect(x + sx - 3, y + sy + 1, 10, 2, [255, 255, 255]);
  }
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2) + 6;
  cv.circle(cx, cy, 104, MOON);
  cv.circle(cx - 34, cy - 30, 18, MOON_D);
  cv.circle(cx + 40, cy + 12, 24, MOON_D);
  cv.circle(cx + 8, cy + 48, 13, MOON_D);
  cv.circle(cx - 52, cy + 34, 10, MOON_D);
  cv.ring(cx, cy, 104, GOLD, 4);
}

function drawChip(cv: Canvas, x: number, y: number, s: number) {
  cv.rect(x, y, s, s, GREEN);
  // pins
  for (let i = 0; i < 4; i++) {
    const o = 14 + i * 24;
    cv.rect(x + o, y - 8, 8, 8, INK);
    cv.rect(x + o, y + s, 8, 8, INK);
    cv.rect(x - 8, y + o, 8, 8, INK);
    cv.rect(x + s, y + o, 8, 8, INK);
  }
  cv.center("+31%", y + Math.floor(s / 2) - 10, 3, [255, 255, 255], x, x + s);
}

function drawCloudX(cv: Canvas, x: number, y: number, w: number, h: number) {
  const cy = y + 52;
  cv.circle(x + 34, cy, 26, SKY);
  cv.circle(x + 66, cy - 16, 32, SKY);
  cv.circle(x + 100, cy, 26, SKY);
  cv.rect(x + 14, cy - 4, 106, 34, SKY);
  cv.line(x + 108, y + 8, x + 150, y + 50, RED, 7);
  cv.line(x + 150, y + 8, x + 108, y + 50, RED, 7);
}

function drawTrain(cv: Canvas, x: number, y: number, w: number) {
  const by = y + 18;
  cv.rect(x, by, w, 34, RED);
  cv.rect(x, by, w, 8, [127, 29, 29]);
  for (let i = 0; i < 5; i++) cv.rect(x + 14 + i * 48, by + 14, 30, 14, SKY);
  cv.rect(x + 6, by + 34, w - 12, 6, INK);
  cv.circle(x + 40, by + 46, 9, INK);
  cv.circle(x + w - 40, by + 46, 9, INK);
  cv.circle(x + 40, by + 46, 4, PAPER);
  cv.circle(x + w - 40, by + 46, 4, PAPER);
  cv.line(x, by + 58, x + w, by + 58, INK, 3);
}

function drawCricket(cv: Canvas, x: number, y: number) {
  // stumps
  for (let i = 0; i < 3; i++) cv.rect(x + 20 + i * 12, y + 8, 5, 52, [210, 180, 120]);
  cv.rect(x + 20, y + 4, 16, 4, [210, 180, 120]);
  cv.rect(x + 38, y + 4, 16, 4, [210, 180, 120]);
  // ball
  cv.circle(x + 92, y + 34, 22, RED);
  cv.ring(x + 92, y + 34, 22, [127, 29, 29], 3);
  // bat
  cv.line(x + 132, y + 58, x + 156, y + 14, [210, 180, 120], 10);
  cv.line(x + 156, y + 14, x + 164, y + 2, INK, 6);
}

function drawMartini(cv: Canvas, x: number, y: number) {
  cv.line(x + 10, y + 8, x + 90, y + 8, INK, 4);
  cv.line(x + 10, y + 8, x + 50, y + 48, INK, 4);
  cv.line(x + 90, y + 8, x + 50, y + 48, INK, 4);
  cv.line(x + 50, y + 48, x + 50, y + 66, INK, 4);
  cv.line(x + 30, y + 66, x + 70, y + 66, INK, 4);
  cv.circle(x + 66, y + 20, 5, GREEN);
}

// ---- the front page ----
function drawPage(cv: Canvas) {
  // masthead
  cv.rect(24, 24, 976, 134, NAVY);
  cv.center("THE WORLD IN ONE IMAGE", 44, 5, [255, 255, 255]);
  cv.rect(24, 158, 976, 5, GOLD);
  cv.center("TUESDAY, 24 NOVEMBER 2026", 102, 3, GOLD);

  // ---- lead story: supermoon ----
  cv.frame(24, 176, 976, 280, INK, 3);
  drawMoon(cv, 24, 176, 376, 280);
  cv.text("SKY TONIGHT", 424, 192, 2, RED);
  cv.text("SUPERMOON PEAKS", 424, 218, 4, INK);
  cv.text("TONIGHT", 424, 254, 4, INK);
  cv.para(
    "NOVEMBER'S FULL BEAVER MOON REACHES ITS PEAK TODAY, THE FIRST OF FOUR SUPERMOONS, AND SHINES ALL NIGHT.",
    424, 302, 556, 2, INK
  );
  cv.text("PEAK 14:53 UK TIME", 424, 420, 2, GREY);

  // ---- row 2: markets + tech ----
  // Nvidia card
  cv.frame(24, 476, 476, 200, INK, 2);
  cv.rect(24, 476, 476, 200, CARD);
  cv.frame(24, 476, 476, 200, INK, 2);
  cv.text("MARKETS", 44, 492, 2, RED);
  drawChip(cv, 52, 528, 96);
  cv.text("HUANG BACK AT", 180, 524, 3, INK);
  cv.text("NVIDIA", 180, 554, 3, INK);
  cv.para(
    "SHARES SOARED 31% ON MONDAY AFTER THE BOARD REINSTATED JENSEN HUANG AS CEO.",
    180, 598, 300, 2, INK
  );
  // Microsoft card
  cv.frame(524, 476, 476, 200, INK, 2);
  cv.rect(524, 476, 476, 200, CARD);
  cv.frame(524, 476, 476, 200, INK, 2);
  cv.text("TECHNOLOGY", 544, 492, 2, RED);
  drawCloudX(cv, 544, 524, 170, 80);
  cv.text("MICROSOFT", 720, 524, 3, INK);
  cv.text("OUTAGE", 720, 554, 3, INK);
  cv.para(
    "A MAJOR OUTAGE DISRUPTED MICROSOFT SERVICES TODAY.",
    720, 598, 260, 2, INK
  );

  // ---- row 3: three stories ----
  const cards: Array<[number, string, string]> = [
    [24, "SOUTH ASIA", "SARYU-KAMALA EXPRESS"],
    [352, "SPORT", "PANT HITS 128"],
    [680, "FILM", "PATTINSON IS BOND"],
  ];
  for (const [x, kick, head] of cards) {
    cv.frame(x, 696, 320, 232, INK, 2);
    cv.rect(x, 696, 320, 232, CARD);
    cv.frame(x, 696, 320, 232, INK, 2);
    cv.text(kick, x + 16, 712, 2, RED);
    cv.text(head, x + 16, 736, 2, INK);
  }
  drawTrain(cv, 44, 756, 280);
  cv.para(
    "MODI AND NEPAL'S PM FLAG OFF THE NEW INDIA-NEPAL TRAIN.",
    44, 842, 280, 2, INK
  );
  drawCricket(cv, 400, 756);
  cv.para(
    "PANT'S 128 SETS A RECORD IN THE WELLINGTON TEST.",
    372, 842, 280, 2, INK
  );
  drawMartini(cv, 800, 756);
  cv.para("ROBERT PATTINSON IS CAST AS THE NEXT JAMES BOND.", 700, 842, 280, 2, INK);

  // ---- ticker ----
  cv.rect(24, 948, 976, 52, NAVY);
  cv.center("FERRARI'S NEW 296 MODELS \u2022 O'HARE GROUND STOP \u2022 SPAIN VOTES NOV 29", 966, 2, [255, 255, 255]);
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
  mkdirSync(outDir, { recursive: true });
  const cv = new Canvas();
  drawPage(cv);
  const png = encodePNG(cv.data, W, H);
  writeFileSync(outDir + "/entry.png", png);
}

main();
