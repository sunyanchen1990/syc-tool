import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

const BG_FILE = 'app-background.jpg';
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif']);

function backgroundFilePath() {
  return path.join(app.getPath('userData'), BG_FILE);
}

export function hasCustomAppBackground(): boolean {
  return fs.existsSync(backgroundFilePath());
}

export async function loadAppBackgroundDataUrl(): Promise<string | null> {
  const fp = backgroundFilePath();
  if (!fs.existsSync(fp)) return null;

  try {
    const sharp = (await import('sharp')).default;
    const buf = await sharp(fp)
      .rotate()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    try {
      const buf = fs.readFileSync(fp);
      const ext = path.extname(fp).toLowerCase();
      const mime =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }
}

export async function pickAndSetAppBackground(): Promise<string | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择应用背景图',
    properties: ['openFile'],
    filters: [
      { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'heic', 'heif'] },
    ],
  });

  if (canceled || !filePaths[0]) return null;

  const src = filePaths[0];
  const ext = path.extname(src).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;

  const dest = backgroundFilePath();

  try {
    const sharp = (await import('sharp')).default;
    await sharp(src).rotate().resize(1920, 1920, { fit: 'inside' }).jpeg({ quality: 88 }).toFile(dest);
  } catch {
    fs.copyFileSync(src, dest);
  }

  return loadAppBackgroundDataUrl();
}
