import { app, BrowserWindow } from 'electron';
import {
  getFloatBallWindow,
  hideFloatBall,
  isFloatBallVisible,
  showFloatBall,
} from './float-ball';

/** 极短防抖，仅过滤焦点瞬间抖动 */
const BLUR_DEBOUNCE_MS = 36;
/** 主窗口刚展示时，忽略外部 App 抢焦点触发的收起（与小球点击恢复配合） */
const RESTORE_GRACE_MS = 1200;

let blurTimer: ReturnType<typeof setTimeout> | null = null;
let focusPollTimer: ReturnType<typeof setInterval> | null = null;
let suppressMiniUntil = 0;
let mainShownAt = 0;
let attachedMain: BrowserWindow | null = null;
let appListenersBound = false;

export function suppressMiniOnBlur(ms = 5000) {
  suppressMiniUntil = Date.now() + ms;
  mainShownAt = Date.now();
  clearBlurTimer();
}

function clearBlurTimer() {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
}

function isOurWindow(win: BrowserWindow | null | undefined): boolean {
  if (!win || win.isDestroyed()) return false;
  if (attachedMain && win.id === attachedMain.id) return true;
  const ball = getFloatBallWindow();
  return Boolean(ball && !ball.isDestroyed() && win.id === ball.id);
}

function isMainFocused(main: BrowserWindow): boolean {
  if (main.isDestroyed()) return false;
  if (main.isFocused()) return true;
  return BrowserWindow.getFocusedWindow()?.id === main.id;
}

function shouldCollapse(main: BrowserWindow): boolean {
  if (!app.isPackaged) return false;
  if (Date.now() < suppressMiniUntil) return false;
  if (Date.now() - mainShownAt < RESTORE_GRACE_MS) return false;
  if (main.isDestroyed() || !main.isVisible()) return false;
  if (isFloatBallVisible()) return false;
  if (isMainFocused(main)) return false;
  const ball = getFloatBallWindow();
  if (ball && !ball.isDestroyed() && ball.isFocused()) return false;
  return true;
}

function collapseMainToBall(main: BrowserWindow) {
  if (!shouldCollapse(main)) return;
  showFloatBall();
  if (!main.isDestroyed()) main.hide();
}

function scheduleCollapse(main: BrowserWindow) {
  if (!app.isPackaged) return;
  clearBlurTimer();
  blurTimer = setTimeout(() => {
    blurTimer = null;
    collapseMainToBall(main);
  }, BLUR_DEBOUNCE_MS);
}

function startFocusPoll(main: BrowserWindow) {
  if (focusPollTimer) return;
  focusPollTimer = setInterval(() => {
    if (main.isDestroyed()) {
      stopFocusPoll();
      return;
    }
    if (!main.isVisible() || isFloatBallVisible()) return;
    if (shouldCollapse(main)) collapseMainToBall(main);
  }, 180);
}

function stopFocusPoll() {
  if (focusPollTimer) {
    clearInterval(focusPollTimer);
    focusPollTimer = null;
  }
}

export function attachMiniOnBlur(mainWindow: BrowserWindow) {
  attachedMain = mainWindow;

  const cancelCollapse = () => {
    clearBlurTimer();
    if (isFloatBallVisible()) hideFloatBall();
  };

  const onMainHidden = () => {
    clearBlurTimer();
    stopFocusPoll();
  };

  const onMainShown = () => {
    mainShownAt = Date.now();
    cancelCollapse();
    startFocusPoll(mainWindow);
    setTimeout(() => {
      if (shouldCollapse(mainWindow)) scheduleCollapse(mainWindow);
    }, RESTORE_GRACE_MS + 80);
  };

  mainWindow.on('blur', () => scheduleCollapse(mainWindow));
  mainWindow.on('focus', cancelCollapse);
  mainWindow.on('show', onMainShown);
  mainWindow.on('hide', onMainHidden);

  if (!appListenersBound) {
    appListenersBound = true;
    /* 主窗口从未获得焦点时 blur 可能不触发，靠全局焦点变化 + 轮询兜底 */
    app.on('browser-window-blur', (_event, win) => {
      const main = attachedMain;
      if (!main || main.isDestroyed()) return;
      if (win.id === main.id) {
        scheduleCollapse(main);
        return;
      }
      if (main.isVisible() && !isFloatBallVisible() && !isOurWindow(win)) {
        scheduleCollapse(main);
      }
    });

    app.on('browser-window-focus', (_event, win) => {
      const main = attachedMain;
      if (!main || main.isDestroyed()) return;
      if (win.id === main.id) {
        clearBlurTimer();
        if (isFloatBallVisible()) hideFloatBall();
        return;
      }
      if (isOurWindow(win)) return;
      if (main.isVisible() && !isFloatBallVisible()) {
        scheduleCollapse(main);
      }
    });
  }

  if (mainWindow.isVisible()) onMainShown();
}
