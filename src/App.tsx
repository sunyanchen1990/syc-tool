import { useEffect, useRef, useState } from 'react';
import type { PanelActivityProps, TabId } from './types';
import WeatherPanel from './components/WeatherPanel';
import CalculatorPanel from './components/CalculatorPanel';
import NotesPanel from './components/NotesPanel';
import ClipboardPanel from './components/ClipboardPanel';
import WallpaperPanel from './components/WallpaperPanel';
import WheelPanel from './components/WheelPanel';
import JsonPanel from './components/JsonPanel';
import ToolkitPanel from './components/ToolkitPanel';
import TranslatePanel from './components/TranslatePanel';
import SystemMonitorPanel from './components/SystemMonitorPanel';
import ZouFourPanel from './components/ZouFourPanel';
import TerminalPanel from './components/TerminalPanel';
import backgroundImage from './assets/background.jpg';
import { registerScreenshotDemoBridge } from './screenshot-demo';
import { isExportScreenshots } from './utils/exportScreenshots';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'weather', label: '天气', icon: '🌤' },
  { id: 'terminal', label: '终端', icon: '⌘' },
  { id: 'calculator', label: '计算', icon: '🧮' },
  { id: 'notes', label: '便签', icon: '📝' },
  { id: 'clipboard', label: '暂存', icon: '📋' },
  { id: 'wallpaper', label: '壁纸', icon: '🖼' },
  { id: 'wheel', label: '转盘', icon: '🎡' },
  { id: 'json', label: 'JSON', icon: '{ }' },
  { id: 'toolkit', label: '工具', icon: '🔧' },
  { id: 'translate', label: '翻译', icon: '🌐' },
  { id: 'monitor', label: '状态', icon: '📊' },
  { id: 'zoufour', label: '四子', icon: '⚫' },
];

type StandardPanelId = Exclude<TabId, 'terminal'>;

const PANELS: Record<StandardPanelId, (props: PanelActivityProps) => JSX.Element> = {
  weather: WeatherPanel,
  calculator: CalculatorPanel,
  notes: NotesPanel,
  clipboard: ClipboardPanel,
  wallpaper: WallpaperPanel,
  wheel: WheelPanel,
  json: JsonPanel,
  toolkit: ToolkitPanel,
  translate: TranslatePanel,
  monitor: SystemMonitorPanel,
  zoufour: ZouFourPanel,
};

export default function App() {
  const [tab, setTab] = useState<TabId>('weather');
  /** 仅挂载用户打开过的标签，避免 12 个面板同时跑定时器/动画 */
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(() => new Set(['weather']));
  const [bgSrc, setBgSrc] = useState<string>(backgroundImage);
  const [bgBusy, setBgBusy] = useState(false);
  const [canChangeBg, setCanChangeBg] = useState(false);
  /** 正在按住侧栏按钮时为非 null，此时只展示背景 */
  const [holdingTab, setHoldingTab] = useState<TabId | null>(null);
  const holdingTabRef = useRef<TabId | null>(null);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  /** 官网宣传截图导出：主进程通过 window.__sycSetTab 切换标签 */
  useEffect(() => {
    const w = window as Window & { __sycSetTab?: (id: TabId) => void };
    w.__sycSetTab = (id: TabId) => {
      setMountedTabs((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setHoldingTab(null);
      holdingTabRef.current = null;
      setTab(id);
    };
    return () => {
      delete w.__sycSetTab;
    };
  }, []);

  useEffect(() => {
    if (isExportScreenshots()) {
      localStorage.setItem('deskmini-city', '北京');
      registerScreenshotDemoBridge();
    }
  }, []);

  useEffect(() => {
    setCanChangeBg(Boolean(window.deskMini?.background));
    window.deskMini?.background?.load().then((url) => {
      if (url) setBgSrc(url);
    });
  }, []);

  const handleChangeBackground = async () => {
    const api = window.deskMini?.background;
    if (!api) return;
    setBgBusy(true);
    try {
      const url = await api.set();
      if (url) setBgSrc(url);
    } finally {
      setBgBusy(false);
    }
  };

  useEffect(() => {
    const onRelease = () => {
      const target = holdingTabRef.current;
      if (!target) return;
      setTab(target);
      holdingTabRef.current = null;
      setHoldingTab(null);
    };

    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    return () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
    };
  }, []);

  const handleNavPointerDown = (id: TabId) => {
    holdingTabRef.current = id;
    setHoldingTab(id);
  };

  const isHolding = holdingTab !== null;
  const holdLabel = TABS.find((t) => t.id === holdingTab)?.label;

  return (
    <div className={`app-shell${isHolding ? ' holding-nav' : ''}`}>
      <div className="app-bg" aria-hidden>
        <img src={bgSrc} alt="" className="app-bg-image" key={bgSrc.slice(0, 48)} />
        <div className="app-bg-overlay" />
        <div className="app-bg-grain" />
      </div>

      {isHolding && holdLabel && (
        <div className="peek-hint" aria-live="polite">
          松开查看「{holdLabel}」
        </div>
      )}

      <header className="titlebar">
        <div className="titlebar-side" />
        <div className="titlebar-center">
          <span className="titlebar-badge">SYC</span>
          <h1>SYC-TOOL</h1>
        </div>
        <div className="titlebar-actions">
          {canChangeBg && (
            <button
              type="button"
              className="titlebar-bg-btn"
              onClick={handleChangeBackground}
              disabled={bgBusy}
              title="更换全局背景图"
            >
              {bgBusy ? '上传中…' : '🖼 背景'}
            </button>
          )}
        </div>
      </header>

      <div className="app-body">
        <nav className="nav-rail nav-glass">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`nav-btn ${!isHolding && tab === t.id ? 'active' : ''} ${holdingTab === t.id ? 'pressing' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleNavPointerDown(t.id);
              }}
            >
              <span className="icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <main
          className={`content-panel${!isHolding && tab === 'terminal' ? ' content-panel--terminal' : ''}`}
          aria-hidden={isHolding}
        >
          {TABS.map((t) => {
            const pageActive = !isHolding && tab === t.id;
            const PanelComponent =
              t.id === 'terminal' ? null : PANELS[t.id as StandardPanelId];
            const isMounted = mountedTabs.has(t.id);

            return (
              <div
                key={t.id}
                className={`panel-page${pageActive ? ' is-active' : ''}${t.id === 'weather' ? ' panel-page-weather' : ''}${t.id === 'terminal' ? ' panel-page-terminal' : ''}${t.id === 'wheel' ? ' panel-page-wheel' : ''}${t.id === 'json' ? ' panel-page-json' : ''}${t.id === 'toolkit' ? ' panel-page-toolkit' : ''}${t.id === 'translate' ? ' panel-page-translate' : ''}${t.id === 'monitor' ? ' panel-page-monitor' : ''}${t.id === 'zoufour' ? ' panel-page-zoufour' : ''}`}
                aria-hidden={isHolding || tab !== t.id}
              >
                {isMounted &&
                  (t.id === 'terminal' ? (
                    <TerminalPanel isActive={pageActive} />
                  ) : PanelComponent ? (
                    <PanelComponent isActive={pageActive} />
                  ) : null)}
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
