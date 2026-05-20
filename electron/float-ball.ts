import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { loadAppSettings, saveAppSettings } from './app-settings';
import { suppressMiniOnBlur } from './window-behavior';

/** 窗口尺寸（含透明边距，给圆球阴影留空，避免方形灰底） */
const BALL_WINDOW = 68;
const MARGIN = 20;

let floatBallWindow: BrowserWindow | null = null;
let ballReady = false;
let getMainWindow: (() => BrowserWindow | null) | null = null;
let mouseTrackTimer: ReturnType<typeof setInterval> | null = null;

const BALL_CENTER = BALL_WINDOW / 2;

function floatBallHtmlPath() {
  if (app.isPackaged) {
    return path.join(__dirname, '../dist/float-ball.html');
  }
  return path.join(__dirname, '../public/float-ball.html');
}

function defaultBallPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + workArea.width - BALL_WINDOW - MARGIN),
    y: Math.round(workArea.y + workArea.height - BALL_WINDOW - MARGIN),
  };
}

function clampBallPosition(x: number, y: number) {
  const display = screen.getDisplayNearestPoint({ x, y });
  const { workArea } = display;
  return {
    x: Math.round(
      Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - BALL_WINDOW)
    ),
    y: Math.round(
      Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - BALL_WINDOW)
    ),
  };
}

function loadBallPosition() {
  const settings = loadAppSettings();
  if (typeof settings.floatBallX === 'number' && typeof settings.floatBallY === 'number') {
    return clampBallPosition(settings.floatBallX, settings.floatBallY);
  }
  return defaultBallPosition();
}

function persistBallPosition() {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  const [x, y] = floatBallWindow.getPosition();
  const settings = loadAppSettings();
  saveAppSettings({ ...settings, floatBallX: x, floatBallY: y });
}

function safeSend(channel: string, ...args: unknown[]) {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  try {
    if (!floatBallWindow.webContents.isDestroyed()) {
      floatBallWindow.webContents.send(channel, ...args);
    }
  } catch (err) {
    console.error(`[float-ball] send ${channel} failed:`, err);
  }
}

function sendAnimateIn() {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  const send = () => safeSend('float-ball:animate-in');
  if (floatBallWindow.webContents.isLoading()) {
    floatBallWindow.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

export function createFloatBallWindow(mainWindowGetter: () => BrowserWindow | null) {
  getMainWindow = mainWindowGetter;

  floatBallWindow = new BrowserWindow({
    width: BALL_WINDOW,
    height: BALL_WINDOW,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    /* macOS 默认圆角透明窗会带一块灰底，关闭圆角 + panel 类型更易做成纯圆 */
    roundedCorners: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    /* 不抢焦点，避免在其它 App 上方点击时焦点链错乱导致主窗口立刻被收回 */
    focusable: false,
    fullscreenable: false,
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'float-ball-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  if (process.platform === 'darwin') {
    floatBallWindow.setBackgroundColor('#00000000');
    floatBallWindow.setAlwaysOnTop(true, 'floating');
    floatBallWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    try {
      floatBallWindow.setVibrancy(null);
    } catch {
      /* ignore */
    }
  }

  const pos = loadBallPosition();
  floatBallWindow.setPosition(pos.x, pos.y);
  void floatBallWindow.loadFile(floatBallHtmlPath());

  floatBallWindow.webContents.once('did-finish-load', () => {
    ballReady = true;
  });

  floatBallWindow.on('closed', () => {
    stopMouseTracking();
    floatBallWindow = null;
    ballReady = false;
  });
}

export function getFloatBallWindow(): BrowserWindow | null {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return null;
  return floatBallWindow;
}

function startMouseTracking() {
  stopMouseTracking();
  mouseTrackTimer = setInterval(() => {
    if (!floatBallWindow || floatBallWindow.isDestroyed() || !floatBallWindow.isVisible()) {
      stopMouseTracking();
      return;
    }
    const { x, y } = screen.getCursorScreenPoint();
    const [wx, wy] = floatBallWindow.getPosition();
    const dx = x - (wx + BALL_CENTER);
    const dy = y - (wy + BALL_CENTER);
    safeSend('float-ball:mouse-delta', { dx, dy });
  }, 48);
}

function stopMouseTracking() {
  if (mouseTrackTimer) {
    clearInterval(mouseTrackTimer);
    mouseTrackTimer = null;
  }
}

export function showFloatBall() {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  if (!floatBallWindow.isVisible()) {
    floatBallWindow.showInactive();
  }
  if (ballReady) sendAnimateIn();
  else {
    floatBallWindow.webContents.once('did-finish-load', () => sendAnimateIn());
  }
  startMouseTracking();
}

export function hideFloatBall() {
  stopMouseTracking();
  if (!floatBallWindow || floatBallWindow.isDestroyed() || !floatBallWindow.isVisible()) {
    return;
  }
  floatBallWindow.hide();
}

export function isFloatBallVisible(): boolean {
  return Boolean(floatBallWindow && !floatBallWindow.isDestroyed() && floatBallWindow.isVisible());
}

export function restoreMainFromFloatBall() {
  const main = getMainWindow?.();
  if (!main || main.isDestroyed()) return;

  /* 防止：主窗刚 show、焦点还在 Chrome 等外部 App 时，blur 逻辑 36ms 后又缩回小球 */
  suppressMiniOnBlur(2000);

  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }

  if (!main.isVisible()) {
    main.show();
  }

  main.focus();

  let finished = false;
  const finishRestore = () => {
    if (finished || main.isDestroyed()) return;
    finished = true;
    hideFloatBall();
    if (!main.isFocused()) {
      if (process.platform === 'darwin') app.focus({ steal: true });
      main.focus();
    }
  };

  if (main.isFocused()) {
    finishRestore();
    return;
  }

  main.once('focus', finishRestore);
  setTimeout(finishRestore, 280);
}

export function registerFloatBallIpc() {
  ipcMain.on('float-ball:activate', () => {
    restoreMainFromFloatBall();
  });

  ipcMain.on('float-ball:move-by', (_e, { dx, dy }: { dx: number; dy: number }) => {
    if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const [x, y] = floatBallWindow.getPosition();
    const next = clampBallPosition(x + dx, y + dy);
    floatBallWindow.setPosition(next.x, next.y);
  });

  ipcMain.on('float-ball:drag-end', () => {
    persistBallPosition();
  });
}
