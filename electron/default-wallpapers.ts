import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { WallpaperItem } from './wallpaper-service';

/** 内置默认壁纸（打包在 extraResources / 开发时位于 src/assets/wallpapers） */
export const BUNDLED_WALLPAPERS: { file: string; displayName: string }[] = [
  { file: 'half-dome.jpg', displayName: '半圆顶 · 晨曦' },
  { file: 'yosemite-valley.jpg', displayName: '优胜美地山谷' },
  { file: 'river-valley.jpg', displayName: '河谷溪流' },
  { file: 'golden-peaks.jpg', displayName: '日照金山' },
];

export function getBundledWallpapersDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'default-wallpapers');
  }
  return path.join(app.getAppPath(), 'src/assets/wallpapers');
}

function userWallpapersDir() {
  const dir = path.join(app.getPath('userData'), 'wallpapers');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 首次使用时将内置壁纸复制到本机 userData，供壁纸模块展示与设桌面 */
export function installDefaultWallpapersIfEmpty(existing: WallpaperItem[]): WallpaperItem[] {
  if (existing.length > 0) return existing;

  const bundledDir = getBundledWallpapersDir();
  const destDir = userWallpapersDir();
  const now = Date.now();
  const installed: WallpaperItem[] = [];

  for (let i = 0; i < BUNDLED_WALLPAPERS.length; i++) {
    const meta = BUNDLED_WALLPAPERS[i];
    const src = path.join(bundledDir, meta.file);
    if (!fs.existsSync(src)) {
      console.warn('[wallpaper] 内置壁纸缺失:', src);
      continue;
    }
    const dest = path.join(destDir, meta.file);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    installed.push({
      id: `bundled-${path.basename(meta.file, path.extname(meta.file))}`,
      filename: meta.file,
      displayName: meta.displayName,
      addedAt: now - i * 1000,
    });
  }

  return installed;
}

export function copyBundledWallpapersToUserDir(): WallpaperItem[] {
  return installDefaultWallpapersIfEmpty([]);
}
