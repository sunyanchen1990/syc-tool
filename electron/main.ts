import { app, BrowserWindow, ipcMain, clipboard, nativeTheme, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import type { WallpaperItem } from './wallpaper-service';
import {
  loadWallpapers,
  listWallpapersWithPreview,
  pickAndAddWallpapers,
  deleteWallpaper,
  getWallpaperFilePath,
  isWallpaperOnMacDesktop,
  setMacDesktopWallpaper,
  resetMacDesktopWallpaper,
} from './wallpaper-service';
import { loadAppBackgroundDataUrl, pickAndSetAppBackground } from './background-service';
import { collectSystemStats } from './system-monitor';
import { syncLaunchAtLoginFromSettings } from './app-settings';
import {
  createFloatBallWindow,
  hideFloatBall,
  registerFloatBallIpc,
} from './float-ball';
import { promptLaunchAtLoginIfNeeded } from './launch-prompt';
import { attachMiniOnBlur, suppressMiniOnBlur } from './window-behavior';
import { registerTerminalIpc } from './terminal-service';
import {
  getScreenshotsOutputDir,
  isScreenshotExportMode,
  runScreenshotExport,
} from './screenshot-export';
import { buildScreenshotDemoSeed } from './screenshot-demo-data';
import { installDefaultWallpapersIfEmpty } from './default-wallpapers';

const CLIPBOARD_RETENTION_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLIPBOARD_POLL_MS = 800;

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

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let lastClipboardText = '';
let clipboardEntries: ClipboardEntry[] = [];
let savedNotes: Note[] = [];
let savedWallpapers: WallpaperItem[] = [];
let activeDesktopWallpaperId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function getDataPath() {
  return path.join(app.getPath('userData'), 'desk-mini-data.json');
}

function loadPersistedData() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8');
    const data = JSON.parse(raw) as {
      clipboard?: ClipboardEntry[];
      notes?: Note[];
      wallpapers?: WallpaperItem[];
      activeDesktopWallpaperId?: string | null;
    };
    if (data.clipboard) {
      clipboardEntries = pruneClipboard(data.clipboard);
    }
    savedWallpapers = loadWallpapers(data.wallpapers);
    const activeId = data.activeDesktopWallpaperId ?? null;
    activeDesktopWallpaperId =
      activeId && savedWallpapers.some((w) => w.id === activeId) ? activeId : null;
    return data.notes ?? [];
  } catch {
    savedWallpapers = [];
    return [];
  }
}

function ensureDefaultWallpapers(notes: Note[]) {
  const before = savedWallpapers.length;
  savedWallpapers = installDefaultWallpapersIfEmpty(savedWallpapers);
  if (savedWallpapers.length > before) {
    savePersistedData(notes);
  }
}

function savePersistedData(notes: Note[]) {
  const data = {
    clipboard: pruneClipboard(clipboardEntries),
    notes,
    wallpapers: savedWallpapers,
    activeDesktopWallpaperId,
  };
  fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8');
}

function pruneClipboard(entries: ClipboardEntry[]): ClipboardEntry[] {
  const cutoff = Date.now() - CLIPBOARD_RETENTION_MS;
  return entries
    .filter((e) => e.copiedAt >= cutoff)
    .sort((a, b) => b.copiedAt - a.copiedAt)
    .slice(0, 200);
}

function pushClipboard(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed === lastClipboardText) return;
  lastClipboardText = trimmed;

  const existing = clipboardEntries.find((e) => e.text === trimmed);
  if (existing) {
    existing.copiedAt = Date.now();
  } else {
    clipboardEntries.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: trimmed,
      copiedAt: Date.now(),
    });
  }
  clipboardEntries = pruneClipboard(clipboardEntries);
  savePersistedData(savedNotes);
  mainWindow?.webContents.send('clipboard:updated', clipboardEntries);
}

function startClipboardPolling() {
  lastClipboardText = clipboard.readText().trim();
  pollTimer = setInterval(() => {
    try {
      const text = clipboard.readText();
      if (text) pushClipboard(text);
      clipboardEntries = pruneClipboard(clipboardEntries);
    } catch {
      /* ignore */
    }
  }, CLIPBOARD_POLL_MS);
}

function getAppIcon() {
  for (const rel of ['../build/icon.icns', '../build/icon.png']) {
    const img = nativeImage.createFromPath(path.join(__dirname, rel));
    if (!img.isEmpty()) return img;
  }
  return undefined;
}

function showMainWindow() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return false;
  suppressMiniOnBlur(1500);
  if (process.platform === 'darwin') app.focus({ steal: true });
  hideFloatBall();
  if (!win.isVisible()) win.show();
  win.focus();
  return true;
}

function createWindow() {
  if (showMainWindow()) return;

  const isDev = !app.isPackaged;
  const exportShots = isScreenshotExportMode();
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: exportShots ? 1100 : 1100,
    height: exportShots ? 780 : 780,
    minWidth: 720,
    minHeight: 520,
    title: 'SYC-TOOL',
    icon: appIcon,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#00000000',
    transparent: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachMiniOnBlur(mainWindow);

  if (isDev) {
    const devUrl = exportShots
      ? 'http://localhost:5173/?exportScreenshots=1'
      : 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    if (!exportShots) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (exportShots) {
      mainWindow.loadFile(indexPath, { query: { exportScreenshots: '1' } });
    } else {
      mainWindow.loadFile(indexPath);
    }
  }

  if (exportShots) {
    console.log('[screenshots] 输出目录:', getScreenshotsOutputDir());
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          void runScreenshotExport(mainWindow).catch((err) => {
            console.error('[screenshots] 失败:', err);
            app.exit(1);
          });
        }
      }, 600);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (!exportShots) void promptLaunchAtLoginIfNeeded(mainWindow);
  });

  /* macOS 点关闭钮：隐藏到程序坞，不销毁窗口，便于再次点击图标打开 */
  mainWindow.on('close', (e) => {
    if (!isQuitting && process.platform === 'darwin') {
      e.preventDefault();
      mainWindow?.hide();
      hideFloatBall();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    hideFloatBall();
  });
}

app.whenReady().then(() => {
  const exportShots = isScreenshotExportMode();

  if (!exportShots) {
    syncLaunchAtLoginFromSettings();
    registerFloatBallIpc();
  }
  registerTerminalIpc();

  if (exportShots) {
    const demo = buildScreenshotDemoSeed();
    clipboardEntries = pruneClipboard(demo.clipboardEntries);
    savedNotes = demo.savedNotes;
    savedWallpapers = demo.savedWallpapers;
  } else {
    savedNotes = loadPersistedData();
    ensureDefaultWallpapers(savedNotes);
  }
  createWindow();
  if (!exportShots) {
    createFloatBallWindow(() => mainWindow);
    startClipboardPolling();
  }

  ipcMain.handle('notes:load', () => savedNotes);
  ipcMain.handle('notes:save', (_e, notes: Note[]) => {
    savedNotes = notes;
    savePersistedData(savedNotes);
    return true;
  });

  ipcMain.handle('clipboard:list', () => pruneClipboard(clipboardEntries));
  ipcMain.handle('clipboard:copy', (_e, text: string) => {
    clipboard.writeText(text);
    lastClipboardText = text.trim();
    return true;
  });
  ipcMain.handle('clipboard:clear', () => {
    clipboardEntries = [];
    savePersistedData(savedNotes);
    mainWindow?.webContents.send('clipboard:updated', []);
    return true;
  });

  ipcMain.on('clipboard:persist', (_e, notes: Note[]) => {
    savedNotes = notes;
    savePersistedData(savedNotes);
  });

  ipcMain.handle('wallpaper:list', () => listWallpapersWithPreview(savedWallpapers));
  ipcMain.handle('wallpaper:upload', async () => {
    suppressMiniOnBlur();
    const result = await pickAndAddWallpapers(savedWallpapers);
    savedWallpapers = result.items;
    savePersistedData(savedNotes);
    return { added: result.added };
  });
  ipcMain.handle('wallpaper:remove', async (_e, id: string) => {
    const filePath = getWallpaperFilePath(savedWallpapers, id);
    const wasActive = activeDesktopWallpaperId === id;
    const onDesktop = filePath ? await isWallpaperOnMacDesktop(filePath) : false;

    savedWallpapers = deleteWallpaper(savedWallpapers, id);

    if (wasActive || onDesktop) {
      activeDesktopWallpaperId = null;
      try {
        if (savedWallpapers.length > 0) {
          const next = savedWallpapers[0];
          await setMacDesktopWallpaper(savedWallpapers, next.id);
          activeDesktopWallpaperId = next.id;
        } else {
          await resetMacDesktopWallpaper();
        }
      } catch (err) {
        console.error('[wallpaper] 删除后更新桌面失败:', err);
      }
    }

    savePersistedData(savedNotes);
    return true;
  });
  ipcMain.handle('wallpaper:setDesktop', async (_e, id: string) => {
    await setMacDesktopWallpaper(savedWallpapers, id);
    activeDesktopWallpaperId = id;
    savePersistedData(savedNotes);
    return true;
  });

  ipcMain.handle('background:load', () => loadAppBackgroundDataUrl());
  ipcMain.handle('background:set', async () => {
    suppressMiniOnBlur();
    return pickAndSetAppBackground();
  });

  ipcMain.handle('system:getSnapshot', () => collectSystemStats());

  app.on('activate', () => {
    /* 主窗口已销毁时悬浮球仍在 getAllWindows 里，不能靠 length===0 判断 */
    if (!showMainWindow()) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (pollTimer) clearInterval(pollTimer);
});

nativeTheme.themeSource = 'dark';
