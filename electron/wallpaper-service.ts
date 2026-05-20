import { app, dialog, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface WallpaperItem {
  id: string;
  filename: string;
  displayName: string;
  addedAt: number;
}

export interface WallpaperListItem extends WallpaperItem {
  previewUrl: string | null;
}

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif']);

function wallpapersDir() {
  const dir = path.join(app.getPath('userData'), 'wallpapers');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePathFor(item: WallpaperItem) {
  return path.join(wallpapersDir(), item.filename);
}

export function loadWallpapers(items: WallpaperItem[] | undefined): WallpaperItem[] {
  if (!items?.length) return [];
  return items.filter((w) => fs.existsSync(filePathFor(w)));
}

/** 用 Electron 内置解码生成预览（sharp 失败时的回退） */
function previewWithNativeImage(filePath: string): string | null {
  try {
    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return null;

    const { width, height } = img.getSize();
    const maxSide = 480;
    const scale = Math.min(maxSide / width, maxSide / height, 1);
    const resized =
      scale < 1
        ? img.resize({
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
          })
        : img;

    const dataUrl = resized.toDataURL();
    return dataUrl.startsWith('data:') ? dataUrl : null;
  } catch {
    return null;
  }
}

async function previewWithSharp(filePath: string): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    const buf = await sharp(filePath)
      .rotate()
      .resize(480, 480, { fit: 'inside', withoutEnlargement: false })
      .jpeg({ quality: 86 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function buildPreviewUrl(filePath: string): Promise<string | null> {
  return (await previewWithSharp(filePath)) ?? previewWithNativeImage(filePath);
}

export async function listWallpapersWithPreview(
  items: WallpaperItem[]
): Promise<WallpaperListItem[]> {
  const list = loadWallpapers(items);
  const result: WallpaperListItem[] = [];

  for (const item of list) {
    const fp = filePathFor(item);
    const previewUrl = await buildPreviewUrl(fp);
    if (!previewUrl) {
      console.warn('[wallpaper] 无法生成预览:', fp);
    }
    result.push({ ...item, previewUrl });
  }

  return result.sort((a, b) => b.addedAt - a.addedAt);
}

export async function pickAndAddWallpapers(
  items: WallpaperItem[]
): Promise<{ items: WallpaperItem[]; added: number }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择壁纸图片',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'heic', 'heif'] },
    ],
  });

  if (canceled || !filePaths.length) {
    return { items, added: 0 };
  }

  const next = [...items];
  let added = 0;

  for (const src of filePaths) {
    const ext = path.extname(src).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const filename = `${id}${ext}`;
    const dest = path.join(wallpapersDir(), filename);

    fs.copyFileSync(src, dest);
    next.unshift({
      id,
      filename,
      displayName: path.basename(src),
      addedAt: Date.now(),
    });
    added++;
  }

  return { items: next, added };
}

function samePath(a: string, b: string): boolean {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

export async function isWallpaperOnMacDesktop(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('osascript', [
      '-e',
      'tell application "System Events" to return POSIX path of (picture of desktop 1)',
    ]);
    const current = stdout.trim();
    return Boolean(current) && samePath(current, filePath);
  } catch {
    return false;
  }
}

export function deleteWallpaper(items: WallpaperItem[], id: string): WallpaperItem[] {
  const item = items.find((w) => w.id === id);
  if (item) {
    const fp = filePathFor(item);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  return items.filter((w) => w.id !== id);
}

export function getWallpaperFilePath(items: WallpaperItem[], id: string): string | null {
  const item = items.find((w) => w.id === id);
  return item ? filePathFor(item) : null;
}

const SYSTEM_DEFAULT_WALLPAPERS = [
  '/System/Library/Desktop Pictures/Sonoma Horizon.heic',
  '/System/Library/Desktop Pictures/Sonoma Graphic.heic',
  '/System/Library/Desktop Pictures/Sequoia Light.heic',
  '/System/Library/Desktop Pictures/Monterey Graphic.heic',
  '/System/Library/Desktop Pictures/Big Sur Graphic.heic',
  '/Library/Desktop Pictures/Solid Colors/Stone.png',
];

async function applyMacDesktopPicture(filePath: string): Promise<void> {
  const script = `
tell application "System Events"
  repeat with d in desktops
    set picture of d to POSIX file ${JSON.stringify(filePath)}
  end repeat
end tell`;

  await execFileAsync('osascript', ['-e', script]);
}

export async function setMacDesktopWallpaper(items: WallpaperItem[], id: string): Promise<void> {
  const item = items.find((w) => w.id === id);
  if (!item) throw new Error('壁纸不存在');

  const fp = filePathFor(item);
  if (!fs.existsSync(fp)) throw new Error('壁纸文件已丢失');

  await applyMacDesktopPicture(fp);
}

/** 删除当前桌面图后，恢复 macOS 自带默认壁纸 */
export async function resetMacDesktopWallpaper(): Promise<void> {
  for (const candidate of SYSTEM_DEFAULT_WALLPAPERS) {
    if (!fs.existsSync(candidate)) continue;
    try {
      await applyMacDesktopPicture(candidate);
      return;
    } catch {
      /* try next */
    }
  }
  throw new Error('无法恢复系统默认壁纸');
}
