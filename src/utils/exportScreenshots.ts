/** 官网宣传截图导出模式（?exportScreenshots=1） */
export function isExportScreenshots(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('exportScreenshots') === '1';
}
