#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

/**
 * Builds the share cards under public/og/, from spec 0021 AC-3.
 *
 * Each card is 1200 by 630, the size the metadata declares. The picture on the
 * right is a real capture of the product, taken from public/marketing, so a
 * shared link shows the app itself rather than generic art. The copy is short
 * and follows the landing honesty rules: no counts, no amounts, no promises.
 *
 * Run it when a capture changes:
 *
 *   node scripts/build-og-images.mjs
 *
 * The colours are the design tokens from app/globals.css, converted to hex
 * because the image is built outside the browser:
 *   --primary              oklch(0.5393 0.2713 286.7462)  -> #7033FF
 *   --background           oklch(0.994 0 0)               -> #FDFDFD
 *   --foreground           oklch(0 0 0)                   -> #0A0A0A
 *   --muted-foreground     oklch(0.4386 0 0)              -> #525252
 *   --border               oklch(0.93 0.0094 286.2156)    -> #E7E7EE
 */
const WIDTH = 1200;
const HEIGHT = 630;

const COLOURS = {
  primary: "#7033FF",
  background: "#FDFDFD",
  foreground: "#0A0A0A",
  muted: "#525252",
  border: "#E7E7EE",
};

const FRAME = { left: 628, top: 125, width: 520, height: 380, radius: 20 };

const CARDS = [
  {
    file: "home.png",
    capture: "note-view-1280.webp",
    title: ["Make your notes", "make sense"],
    lines: [
      "Notes, quizzes and Tip,",
      "the tutor that teaches from",
      "what you uploaded.",
    ],
  },
  {
    file: "about.png",
    capture: "tip-answer-1280.webp",
    title: ["Built for students", "in Cameroon"],
    lines: [
      "By Tic Foundation.",
      "Your own lecture notes,",
      "taught back to you.",
    ],
  },
  {
    file: "faq.png",
    capture: "quiz-question-1280.webp",
    title: ["Cost, data use", "and offline access"],
    lines: ["The questions students ask", "before they sign up."],
  },
  {
    file: "default.png",
    capture: "attempt-result-1280.webp",
    title: ["Study your lecture", "notes with Tip"],
    lines: ["Upload a note, practise,", "and learn from what", "you missed."],
  },
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function frameFor() {
  return Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect x="${FRAME.left}" y="${FRAME.top}" width="${FRAME.width}" height="${FRAME.height}" rx="${FRAME.radius}" fill="none" stroke="${COLOURS.border}" stroke-width="2"/></svg>`,
  );
}

function overlayFor(card) {
  const titleTop = 250;
  const titleLine = 72;
  const subtitleTop = titleTop + (card.title.length - 1) * titleLine + 62;
  const subtitleLine = 36;

  const title = card.title
    .map(
      (line, index) =>
        `<text x="72" y="${titleTop + index * titleLine}" font-family="Lato, DejaVu Sans, sans-serif" font-size="60" font-weight="700" fill="${COLOURS.foreground}">${escapeXml(line)}</text>`,
    )
    .join("");
  const subtitle = card.lines
    .map(
      (line, index) =>
        `<text x="72" y="${subtitleTop + index * subtitleLine}" font-family="Lato, DejaVu Sans, sans-serif" font-size="26" font-weight="400" fill="${COLOURS.muted}">${escapeXml(line)}</text>`,
    )
    .join("");

  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLOURS.background}"/>
  <rect x="0" y="0" width="14" height="${HEIGHT}" fill="${COLOURS.primary}"/>
  <text x="72" y="164" font-family="Lato, DejaVu Sans, sans-serif" font-size="32" font-weight="700" fill="${COLOURS.primary}">TiCLearn</text>
  <rect x="72" y="186" width="56" height="6" rx="3" fill="${COLOURS.primary}" opacity="0.35"/>
  ${title}
  ${subtitle}
</svg>`);
}

async function captureOf(source) {
  // The captures open on a band of empty app chrome above the toolbar. Trim
  // it before framing so the card shows content, not padding.
  const resized = await sharp(source)
    .ensureAlpha()
    .extract({ left: 0, top: 56, width: 1280, height: 744 })
    .resize(FRAME.width, FRAME.height, { fit: "cover", position: "top" })
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${FRAME.width}" height="${FRAME.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${FRAME.width}" height="${FRAME.height}" rx="${FRAME.radius}" fill="#fff"/></svg>`,
  );

  return sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function buildCard(card, outputDir) {
  const source = path.join(process.cwd(), "public", "marketing", card.capture);
  const shot = await captureOf(source);

  const png = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: COLOURS.background,
    },
  })
    .composite([
      { input: overlayFor(card), left: 0, top: 0 },
      { input: shot, left: FRAME.left, top: FRAME.top },
      { input: frameFor(), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();

  const target = path.join(outputDir, card.file);
  await writeFile(target, png);
  return { target, bytes: png.length };
}

const outputDir = path.join(process.cwd(), "public", "og");
await mkdir(outputDir, { recursive: true });

for (const card of CARDS) {
  const { target, bytes } = await buildCard(card, outputDir);
  console.log(
    `${path.relative(process.cwd(), target)}  ${Math.round(bytes / 1024)} KB`,
  );
}
