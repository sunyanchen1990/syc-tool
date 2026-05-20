import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

const TABS = [
  'weather',
  'terminal',
  'calculator',
  'notes',
  'clipboard',
  'wallpaper',
  'wheel',
  'json',
  'toolkit',
  'translate',
  'monitor',
  'zoufour',
] as const;

const TAB_DELAY_MS: Record<string, number> = {
  weather: 5000,
  terminal: 2400,
  wallpaper: 2800,
  wheel: 2200,
  json: 1600,
  toolkit: 1400,
  translate: 1400,
  monitor: 2000,
  zoufour: 1600,
  notes: 1500,
  clipboard: 1400,
  calculator: 1200,
};

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function isScreenshotExportMode(): boolean {
  return process.env.SYC_EXPORT_SCREENSHOTS === '1';
}

export function getScreenshotsOutputDir(): string {
  if (process.env.SYC_SCREENSHOTS_DIR) {
    return path.resolve(process.env.SYC_SCREENSHOTS_DIR);
  }
  return path.resolve(process.cwd(), 'website/public/screenshots');
}

export async function runScreenshotExport(win: BrowserWindow): Promise<void> {
  const outDir = getScreenshotsOutputDir();
  fs.mkdirSync(outDir, { recursive: true });

  const ready = await win.webContents.executeJavaScript('typeof window.__sycSetTab === "function"');
  if (!ready) {
    throw new Error('Renderer 未暴露 window.__sycSetTab，请确认 App 已加载');
  }

  for (const tab of TABS) {
    await win.webContents.executeJavaScript(`window.__sycSetTab(${JSON.stringify(tab)})`);
    await win.webContents.executeJavaScript(
      `(async () => {
        try {
          window.__sycPrepareDemo && window.__sycPrepareDemo(${JSON.stringify(tab)});
        } catch (e) {
          console.error('[demo]', ${JSON.stringify(tab)}, e);
        }
      })()`
    );
    await delay(TAB_DELAY_MS[tab] ?? 1600);
    const image = await win.webContents.capturePage();
    const file = path.join(outDir, `${tab}.png`);
    fs.writeFileSync(file, image.toPNG());
    console.log(`[screenshots] ${file}`);
  }

  await win.webContents.executeJavaScript(`window.__sycSetTab("weather")`);
  await delay(TAB_DELAY_MS.weather);
  const hero = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'hero.png'), hero.toPNG());
  console.log(`[screenshots] hero.png → ${outDir}`);
  console.log('[screenshots] 完成，共', TABS.length + 1, '张');

  app.exit(0);
}
