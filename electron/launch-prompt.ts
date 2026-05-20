import { BrowserWindow, dialog } from 'electron';
import {
  applyLaunchAtLogin,
  loadAppSettings,
  saveAppSettings,
  syncLaunchAtLoginFromSettings,
} from './app-settings';
import { suppressMiniOnBlur } from './window-behavior';

export async function promptLaunchAtLoginIfNeeded(parent: BrowserWindow | null) {
  syncLaunchAtLoginFromSettings();

  const settings = loadAppSettings();
  if (settings.askedLaunchAtLogin) return;

  suppressMiniOnBlur(60_000);

  const options = {
    type: 'question' as const,
    buttons: ['是，开机自启动', '不用'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    title: 'SYC-TOOL',
    message: '是否开机自动启动 SYC-TOOL？',
    detail:
      '选择「是」后，登录 Mac 时会自动打开本应用。之后可在「系统设置 → 通用 → 登录项」中修改。',
  };

  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);

  const launchAtLogin = response === 0;
  saveAppSettings({
    askedLaunchAtLogin: true,
    launchAtLogin,
  });
  applyLaunchAtLogin(launchAtLogin);
}
