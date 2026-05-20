/**
 * SYC-TOOL 应用图标 1024×1024
 * 半透明毛玻璃 · 低饱和柔色 · 轻阴影 · 大圆角 squircle · 极简线条 · 居中 SYC
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const size = 1024;
const out = join(root, 'build/icon.png');

/** macOS Dock 规范：内容区 ~820px + 透明四角 */
const ICON_CONTENT = 820;
const ICON_PAD = (size - ICON_CONTENT) / 2;
const ICON_RX = Math.round(ICON_CONTENT * 0.2237);

function macSquirclePathD(x, y, w, h, cornerRadius) {
  const limit = Math.min(w, h) / 2 / 1.52866483;
  const r = Math.min(cornerRadius, limit);
  const topLeft = (a, b) => [x + a * r, y + b * r];
  const topRight = (a, b) => [x + w - a * r, y + b * r];
  const bottomRight = (a, b) => [x + w - a * r, y + h - b * r];
  const bottomLeft = (a, b) => [x + a * r, y + h - b * r];
  const parts = [];
  const move = (p) => parts.push(`M ${p[0].toFixed(3)} ${p[1].toFixed(3)}`);
  const line = (p) => parts.push(`L ${p[0].toFixed(3)} ${p[1].toFixed(3)}`);
  const curve = (p1, p2, p3) =>
    parts.push(
      `C ${p1[0].toFixed(3)} ${p1[1].toFixed(3)}, ${p2[0].toFixed(3)} ${p2[1].toFixed(3)}, ${p3[0].toFixed(3)} ${p3[1].toFixed(3)}`
    );

  move(topLeft(1.52866483, 0));
  line(topRight(1.52866471, 0));
  curve(topRight(1.08849323, 0), topRight(0.86840689, 0), topRight(0.66993427, 0.065496));
  line(topRight(0.63149399, 0.074911));
  curve(topRight(0.37282392, 0.16905899), topRight(0.16906013, 0.37282401), topRight(0.07491176, 0.63149399));
  curve(topRight(0, 0.86840701), topRight(0, 1.08849299), topRight(0, 1.52866483));
  line(bottomRight(0, 1.52866471));
  curve(bottomRight(0, 1.08849323), bottomRight(0, 0.86840689), bottomRight(0.06549569, 0.66993493));
  line(bottomRight(0.07491111, 0.63149399));
  curve(bottomRight(0.16905883, 0.37282392), bottomRight(0.37282392, 0.16905883), bottomRight(0.63149399, 0.07491111));
  curve(bottomRight(0.86840689, 0), bottomRight(1.08849323, 0), bottomRight(1.52866471, 0));
  line(bottomLeft(1.52866483, 0));
  curve(bottomLeft(1.08849299, 0), bottomLeft(0.86840701, 0), bottomLeft(0.66993397, 0.06549569));
  line(bottomLeft(0.63149399, 0.07491111));
  curve(bottomLeft(0.37282401, 0.16905883), bottomLeft(0.16906001, 0.37282392), bottomLeft(0.074911, 0.63149399));
  curve(bottomLeft(0, 0.86840689), bottomLeft(0, 1.08849323), bottomLeft(0, 1.52866471));
  line(topLeft(0, 1.52866483));
  curve(topLeft(0, 1.08849299), topLeft(0, 0.86840701), topLeft(0.065496, 0.66993397));
  line(topLeft(0.074911, 0.63149399));
  curve(topLeft(0.16906001, 0.37282401), topLeft(0.37282401, 0.16906001), topLeft(0.63149399, 0.074911));
  curve(topLeft(0.86840701, 0), topLeft(1.08849299, 0), topLeft(1.52866483, 0));
  parts.push('Z');
  return parts.join(' ');
}

const iconShapePath = macSquirclePathD(ICON_PAD, ICON_PAD, ICON_CONTENT, ICON_CONTENT, ICON_RX);
const cx = size / 2;
const cy = size / 2;
const label = 'SYC';
const fontSize = 300;
const textY = cy + fontSize * 0.34;

const fontFamily =
  'SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif';

function esc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** 顶部极简高光线（squircle 内缘） */
const highlightY = ICON_PAD + ICON_CONTENT * 0.14;
const highlightW = ICON_CONTENT * 0.36;

const designSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="canvasBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d8dee8"/>
      <stop offset="48%" stop-color="#c9d2df"/>
      <stop offset="100%" stop-color="#bcc8d8"/>
    </linearGradient>
    <linearGradient id="canvasTint" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#b8c8e0" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#d4c8dc" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="glassFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="42%" stop-color="#f4f7fb" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#e8edf4" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="glassSheen" x1="0%" y1="0%" x2="0%" y2="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="textColor" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7a8da3"/>
      <stop offset="100%" stop-color="#5c6d82"/>
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#8e9db0" flood-opacity="0.28"/>
    </filter>
    <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#9aaab8" flood-opacity="0.35"/>
    </filter>
    <clipPath id="iconClip">
      <path d="${iconShapePath}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#iconClip)">
    <rect width="${size}" height="${size}" fill="url(#canvasBg)"/>
    <rect width="${size}" height="${size}" fill="url(#canvasTint)"/>

    <g filter="url(#cardShadow)">
      <path d="${iconShapePath}" fill="url(#glassFill)"/>
      <path d="${iconShapePath}" fill="url(#glassSheen)"/>
      <path d="${iconShapePath}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
      <path d="${iconShapePath}" fill="none" stroke="#a8b6c8" stroke-opacity="0.22" stroke-width="1.5"/>
    </g>

    <line x1="${cx - highlightW / 2}" y1="${highlightY}" x2="${cx + highlightW / 2}" y2="${highlightY}"
      stroke="#ffffff" stroke-opacity="0.62" stroke-width="2.5" stroke-linecap="round"/>

    <text x="${cx}" y="${textY}" text-anchor="middle"
      font-family="${fontFamily}" font-size="${fontSize}" font-weight="600"
      letter-spacing="8" fill="url(#textColor)" filter="url(#textShadow)">${esc(label)}</text>
  </g>
</svg>`;

const maskSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="${iconShapePath}" fill="white"/>
</svg>`;

const rendered = await sharp(Buffer.from(designSvg)).png().toBuffer();
const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();

await sharp(rendered)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`已生成 ${out}（1024×1024 · 毛玻璃 · 低饱和 · SYC 居中）`);
