import type { TabId } from './types';
import { isExportScreenshots } from './utils/exportScreenshots';

type DemoHandler = () => void;

declare global {
  interface Window {
    __sycDemoHandlers?: Partial<Record<TabId, DemoHandler>>;
    __sycPrepareDemo?: (tab: TabId) => void;
  }
}

export function registerDemoHandler(tab: TabId, handler: DemoHandler) {
  if (!isExportScreenshots()) return () => undefined;
  window.__sycDemoHandlers = window.__sycDemoHandlers ?? {};
  window.__sycDemoHandlers[tab] = handler;
  return () => {
    if (window.__sycDemoHandlers?.[tab] === handler) {
      delete window.__sycDemoHandlers[tab];
    }
  };
}

export function registerScreenshotDemoBridge() {
  if (!isExportScreenshots()) return;
  window.__sycPrepareDemo = (tab: TabId) => {
    window.__sycDemoHandlers?.[tab]?.();
  };
}
