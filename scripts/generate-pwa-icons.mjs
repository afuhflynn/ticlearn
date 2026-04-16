import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "..", "public", "icons");
const screenshotsDir = path.join(__dirname, "..", "public", "screenshots");

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Create a simple icon with "TiC" text
async function createIcon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TiC</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

// Create a placeholder screenshot
async function createScreenshot(outputPath) {
  const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#f8fafc"/>
      <rect x="40" y="40" width="200" height="200" rx="20" fill="#2563eb"/>
      <rect x="280" y="60" width="960" height="100" rx="10" fill="#e2e8f0"/>
      <rect x="280" y="200" width="300" height="180" rx="10" fill="#e2e8f0"/>
      <rect x="620" y="200" width="300" height="180" rx="10" fill="#e2e8f0"/>
      <rect x="960" y="200" width="280" height="180" rx="10" fill="#e2e8f0"/>
      <rect x="280" y="420" width="960" height="260" rx="10" fill="#e2e8f0"/>
      <text x="640" y="370" font-family="Arial, sans-serif" font-size="24" fill="#64748b" text-anchor="middle">Dashboard Preview</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

async function main() {
  try {
    await createIcon(192, path.join(publicDir, "icon-192.png"));
    await createIcon(512, path.join(publicDir, "icon-512.png"));
    await createScreenshot(path.join(screenshotsDir, "dashboard.png"));
    await createScreenshot(path.join(screenshotsDir, "quiz.png"));
    console.log("\n✓ All icons and screenshots created successfully!");
  } catch (error) {
    console.error("Error creating icons:", error);
    process.exit(1);
  }
}

main();
