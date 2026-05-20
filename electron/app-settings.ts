import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface AppSettings {
  askedLaunchAtLogin: boolean;
  launchAtLogin: boolean;
  floatBallX?: number;
  floatBallY?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  askedLaunchAtLogin: false,
  launchAtLogin: false,
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'app-settings.json');
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8');
    const data = JSON.parse(raw) as Partial<AppSettings>;
    const floatBallX = typeof data.floatBallX === 'number' ? data.floatBallX : undefined;
    const floatBallY = typeof data.floatBallY === 'number' ? data.floatBallY : undefined;
    return {
      askedLaunchAtLogin: Boolean(data.askedLaunchAtLogin),
      launchAtLogin: Boolean(data.launchAtLogin),
      floatBallX,
      floatBallY,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings) {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

export function applyLaunchAtLogin(enable: boolean) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: false,
    });
  }
}

export function syncLaunchAtLoginFromSettings() {
  const { launchAtLogin } = loadAppSettings();
  applyLaunchAtLogin(launchAtLogin);
}
