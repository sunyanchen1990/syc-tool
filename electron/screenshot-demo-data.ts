import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { WallpaperItem } from './wallpaper-service';
import {
  BUNDLED_WALLPAPERS,
  copyBundledWallpapersToUserDir,
  getBundledWallpapersDir,
} from './default-wallpapers';

interface ClipboardEntry {
  id: string;
  text: string;
  copiedAt: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt: number;
}

export interface ScreenshotDemoSeed {
  clipboardEntries: ClipboardEntry[];
  savedNotes: Note[];
  savedWallpapers: WallpaperItem[];
}

function wallpapersDir() {
  const dir = path.join(app.getPath('userData'), 'wallpapers');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function copyDemoWallpaper(src: string, filename: string): string | null {
  if (!fs.existsSync(src)) return null;
  const dest = path.join(wallpapersDir(), filename);
  fs.copyFileSync(src, dest);
  return dest;
}

export function buildScreenshotDemoSeed(): ScreenshotDemoSeed {
  const now = Date.now();
  const bundledDir = getBundledWallpapersDir();

  const savedWallpapers: WallpaperItem[] = [];
  BUNDLED_WALLPAPERS.forEach((meta, i) => {
    const src = path.join(bundledDir, meta.file);
    const copied = copyDemoWallpaper(src, meta.file);
    if (!copied) return;
    savedWallpapers.push({
      id: `demo-wp-${i}`,
      filename: meta.file,
      displayName: meta.displayName,
      addedAt: now - i * 60_000,
    });
  });

  if (savedWallpapers.length === 0) {
    return {
      ...buildNotesAndClipboard(now),
      savedWallpapers: copyBundledWallpapersToUserDir(),
    };
  }

  return {
    ...buildNotesAndClipboard(now),
    savedWallpapers,
  };
}

function buildNotesAndClipboard(now: number) {
  return {
    clipboardEntries: [
      {
        id: 'demo-1',
        text: '{"app":"SYC-TOOL","version":"1.0.1","modules":12}',
        copiedAt: now - 45_000,
      },
      {
        id: 'demo-2',
        text: 'npm run install:mac',
        copiedAt: now - 120_000,
      },
      {
        id: 'demo-3',
        text: 'git commit -m "feat: 官网宣传截图"',
        copiedAt: now - 300_000,
      },
      {
        id: 'demo-4',
        text: 'export PATH="/opt/homebrew/bin:$PATH"',
        copiedAt: now - 540_000,
      },
    ],
    savedNotes: [
      {
        id: 'demo-note-1',
        title: '产品发布',
        content:
          '## v1.0\n- 十二模块一体面板\n- 桌面悬浮球失焦收起\n- 官网与实机截图导出',
        createdAt: now - 86_400_000,
        updatedAt: now - 3_600_000,
      },
      {
        id: 'demo-note-2',
        title: '待办',
        content: '优化剪贴板搜索\n终端 Tab 补全\n壁纸缩略图预览',
        createdAt: now - 172_800_000,
        updatedAt: now - 7_200_000,
      },
      {
        id: 'demo-note-3',
        title: '灵感',
        content: '午饭转盘：火锅 / 日料 / 轻食 / 麻辣烫',
        createdAt: now - 259_200_000,
        updatedAt: now - 86_400_000,
      },
    ],
  };
}
