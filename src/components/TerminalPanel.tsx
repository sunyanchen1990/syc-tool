import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { TerminalInfo, TerminalRunResult } from '../types';
import { registerDemoHandler } from '../screenshot-demo';
import { ansiToSpans } from '../utils/terminalAnsi';
import './TerminalPanel.css';

const APPEARANCE_STORAGE_KEY = 'syc-terminal-appearance-v3';
const DEFAULT_TRANSPARENCY = 65;
const DEFAULT_BRIGHTNESS = 50;

interface TerminalAppearance {
  transparency: number;
  brightness: number;
}

type LineKind = 'welcome' | 'cmd' | 'out' | 'err' | 'meta' | 'sys';

interface TerminalLine {
  id: string;
  kind: LineKind;
  text: string;
  command?: string;
}

interface TerminalPanelProps {
  isActive?: boolean;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function loadAppearance(): TerminalAppearance {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<TerminalAppearance>;
      return {
        transparency: clampPct(Number(data.transparency ?? DEFAULT_TRANSPARENCY)),
        brightness: clampPct(Number(data.brightness ?? DEFAULT_BRIGHTNESS)),
      };
    }
    const legacy = localStorage.getItem('syc-terminal-glass-v2');
    const old = legacy ? Number(legacy) : NaN;
    if (Number.isFinite(old)) {
      return { transparency: clampPct(old), brightness: DEFAULT_BRIGHTNESS };
    }
  } catch {
    /* ignore */
  }
  return { transparency: DEFAULT_TRANSPARENCY, brightness: DEFAULT_BRIGHTNESS };
}

/**
 * 透明度 0=完全不透明，100=完全透明（仅毛玻璃 alpha + blur）
 * 明暗 0=偏暗，50=默认，100=偏亮（调节玻璃底色 RGB + 叠层）
 */
function glassStyle(transparency: number, brightness: number): CSSProperties {
  const seeThrough = clampPct(transparency) / 100;
  const glassAlpha = (1 - seeThrough) * 0.92;
  const blurPx = Math.round((1 - seeThrough) * 52);

  const b = clampPct(brightness);
  const brightNorm = (b - 50) / 50;
  const tintR = Math.round(14 + brightNorm * 30);
  const tintG = Math.round(16 + brightNorm * 30);
  const tintB = Math.round(22 + brightNorm * 36);
  const dimOverlay = brightNorm < 0 ? -brightNorm * 0.58 : 0;
  const lightOverlay = brightNorm > 0 ? brightNorm * 0.42 : 0;

  return {
    '--term-glass-alpha': glassAlpha.toFixed(3),
    '--term-blur': `${blurPx}px`,
    '--term-see-through': seeThrough.toFixed(3),
    '--term-tint-r': String(tintR),
    '--term-tint-g': String(tintG),
    '--term-tint-b': String(tintB),
    '--term-dim-overlay': dimOverlay.toFixed(3),
    '--term-light-overlay': lightOverlay.toFixed(3),
  } as CSSProperties;
}

function shortenPath(cwd: string, home: string): string {
  if (cwd === home || cwd.startsWith(home + '/')) {
    return '~' + cwd.slice(home.length);
  }
  const parts = cwd.split('/').filter(Boolean);
  if (parts.length <= 2) return cwd;
  return '…/' + parts.slice(-2).join('/');
}

function splitOutput(text: string, kind: 'out' | 'err'): TerminalLine[] {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tailBlank = lines.length > 0 && lines[lines.length - 1] === '';
  const slice = tailBlank ? lines.slice(0, -1) : lines;
  return slice.map((line, i) => ({
    id: `${kind}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    text: line,
  }));
}

function applyCompletion(line: string, from: number, match: string): string {
  const tail = match.endsWith('/') ? '' : ' ';
  return line.slice(0, from) + match + tail;
}

let lineSeq = 0;
function nextId(prefix: string) {
  lineSeq += 1;
  return `${prefix}-${lineSeq}`;
}

export default function TerminalPanel({ isActive = false }: TerminalPanelProps) {
  const api = window.deskMini?.terminal;
  const [appearance, setAppearance] = useState(loadAppearance);
  const { transparency, brightness } = appearance;
  const [info, setInfo] = useState<TerminalInfo | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [completeBusy, setCompleteBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completionRef = useRef<{ replaceFrom: number; replaceTo: number; matches: string[] } | null>(
    null
  );

  const glassVars = useMemo(
    () => glassStyle(transparency, brightness),
    [transparency, brightness]
  );

  const setTransparency = (value: number) => {
    setAppearance((prev) => ({ ...prev, transparency: clampPct(value) }));
  };

  const setBrightness = (value: number) => {
    setAppearance((prev) => ({ ...prev, brightness: clampPct(value) }));
  };

  const focusInput = useCallback(() => {
    const el = inputRef.current;
    if (!el || busy) return;
    el.focus({ preventScroll: true });
  }, [busy]);

  const refreshInfo = useCallback(async () => {
    if (!api) return;
    const next = await api.getInfo();
    setInfo(next);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    void refreshInfo();
    setLines([{ id: nextId('welcome'), kind: 'welcome', text: '' }]);
  }, [api, refreshInfo]);

  useEffect(
    () =>
      registerDemoHandler('terminal', () => {
        setLines([
          { id: nextId('welcome'), kind: 'welcome', text: '' },
          { id: nextId('cmd'), kind: 'cmd', text: 'ls -la', command: 'ls -la' },
          {
            id: nextId('out'),
            kind: 'out',
            text: 'Desktop  Documents  Downloads  SYC-TOOL',
          },
          { id: nextId('cmd'), kind: 'cmd', text: 'npm run build', command: 'npm run build' },
          { id: nextId('out'), kind: 'out', text: '✓ built in 1.24s' },
          {
            id: nextId('meta'),
            kind: 'meta',
            text: '完成 · 1240ms · 退出 0',
          },
        ]);
        setInput('');
      }),
    []
  );

  useEffect(() => {
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      /* ignore */
    }
    document.documentElement.style.setProperty(
      '--terminal-see-through',
      String(transparency / 100)
    );
  }, [appearance, transparency]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--terminal-see-through');
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, busy]);

  useEffect(() => {
    if (!busy) focusInput();
  }, [busy, focusInput]);

  useEffect(() => {
    if (isActive) {
      const t = window.setTimeout(focusInput, 0);
      return () => window.clearTimeout(t);
    }
  }, [isActive, focusInput]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSuggestIdx(0);
    completionRef.current = null;
  }, []);

  const appendLines = useCallback((next: TerminalLine[]) => {
    if (!next.length) return;
    setLines((prev) => [...prev, ...next]);
  }, []);

  const runCommand = useCallback(
    async (raw: string) => {
      if (!api) return;
      const command = raw.trim();
      if (!command) return;

      clearSuggestions();

      setHistory((prev) => {
        if (prev[prev.length - 1] === command) return prev;
        return [...prev, command].slice(-80);
      });
      setHistIdx(-1);

      appendLines([
        {
          id: nextId('cmd'),
          kind: 'cmd',
          text: command,
          command,
        },
      ]);

      if (command === 'clear' || command === 'cls') {
        setLines([{ id: nextId('sys'), kind: 'sys', text: '屏幕已清空' }]);
        return;
      }

      setBusy(true);
      try {
        const result: TerminalRunResult = await api.run(command);
        setInfo((prev) => (prev ? { ...prev, cwd: result.cwd } : prev));
        void refreshInfo();

        const outLines = splitOutput(result.stdout, 'out');
        const errLines = splitOutput(result.stderr, 'err');
        appendLines([...outLines, ...errLines]);

        if (result.exitCode !== 0 && result.exitCode !== null && !errLines.length && !outLines.length) {
          appendLines([
            {
              id: nextId('err'),
              kind: 'err',
              text: `命令退出码 ${result.exitCode}`,
            },
          ]);
        }

        if (result.durationMs > 0) {
          appendLines([
            {
              id: nextId('meta'),
              kind: 'meta',
              text: `完成 · ${result.durationMs}ms · 退出 ${result.exitCode ?? '?'}`,
            },
          ]);
        }
      } catch (err) {
        appendLines([
          {
            id: nextId('err'),
            kind: 'err',
            text: err instanceof Error ? err.message : String(err),
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [api, appendLines, refreshInfo, clearSuggestions]
  );

  const runTabComplete = useCallback(async () => {
    if (!api || completeBusy) return;
    const line = input;

    const cached = completionRef.current;
    if (cached && cached.matches.length > 1) {
      const nextIdx = (suggestIdx + 1) % cached.matches.length;
      setSuggestIdx(nextIdx);
      const match = cached.matches[nextIdx];
      setInput(applyCompletion(line, cached.replaceFrom, match));
      return;
    }

    setCompleteBusy(true);
    try {
      const result = await api.complete(line, history);
      const matches = result.matches;
      if (!matches.length) {
        clearSuggestions();
        return;
      }

      completionRef.current = {
        replaceFrom: result.replaceFrom,
        replaceTo: result.replaceTo,
        matches,
      };

      if (matches.length === 1) {
        setInput(applyCompletion(line, result.replaceFrom, matches[0]));
        clearSuggestions();
        return;
      }

      setSuggestions(matches);
      setSuggestIdx(0);
      setInput(applyCompletion(line, result.replaceFrom, matches[0]));
    } finally {
      setCompleteBusy(false);
      focusInput();
    }
  }, [api, completeBusy, input, history, suggestIdx, clearSuggestions, focusInput]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !input.trim()) return;
    const cmd = input;
    setInput('');
    clearSuggestions();
    void runCommand(cmd);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      void runTabComplete();
      return;
    }
    if (e.key === 'Escape') {
      clearSuggestions();
      return;
    }
    if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setLines([{ id: nextId('sys'), kind: 'sys', text: '屏幕已清空' }]);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      clearSuggestions();
      if (!history.length) return;
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      clearSuggestions();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(next);
        setInput(history[next] ?? '');
      }
      return;
    }
    clearSuggestions();
  };

  const handleClear = () => {
    setLines([{ id: nextId('sys'), kind: 'sys', text: '屏幕已清空' }]);
    clearSuggestions();
    focusInput();
  };

  const handleResetCwd = async () => {
    if (!api) return;
    const cwd = await api.resetCwd();
    setInfo((prev) => (prev ? { ...prev, cwd } : prev));
    appendLines([{ id: nextId('sys'), kind: 'sys', text: `工作目录已重置为 ${cwd}` }]);
    focusInput();
  };

  const handleGlassPointerDown = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleGlassMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, label')) return;
    e.preventDefault();
    focusInput();
  };

  const handleScrollMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    focusInput();
  };

  const promptPath = info ? shortenPath(info.cwd, info.homedir) : '~';
  const shellLabel = info?.shell ?? 'zsh';
  const sessionTooltip = info
    ? `本机登录：${info.username} · 电脑名 ${info.hostname}（每位用户显示自己的信息，可忽略）`
    : '本机 Shell 会话';

  if (!api) {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <div className="terminal-panel-title-wrap">
            <h2 className="terminal-panel-title">终端</h2>
            <p className="terminal-panel-sub">请在 SYC-TOOL 桌面应用中打开</p>
          </div>
        </div>
        <p className="terminal-fallback">命令行仅在 Electron 环境中可用。</p>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <div className="terminal-panel-title-wrap">
          <h2 className="terminal-panel-title">终端</h2>
          <p className="terminal-panel-sub">透明度 0～100 · 明暗可调 · Tab 补全</p>
        </div>
        <div className="terminal-appearance" onPointerDown={handleGlassPointerDown}>
          <div className="terminal-appearance-row">
            <label htmlFor="term-transparency">透明度</label>
            <input
              id="term-transparency"
              type="range"
              min={0}
              max={100}
              value={transparency}
              onChange={(e) => setTransparency(Number(e.target.value))}
              title="100=完全透明，0=完全不透明"
            />
            <span className="terminal-appearance-value">{transparency}</span>
          </div>
          <div className="terminal-appearance-row">
            <label htmlFor="term-brightness">明暗</label>
            <input
              id="term-brightness"
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              title="0=偏暗，50=默认，100=偏亮"
            />
            <span className="terminal-appearance-value">{brightness}</span>
          </div>
        </div>
      </div>

      <div
        className="terminal-glass"
        style={glassVars}
        onMouseDown={handleGlassMouseDown}
      >
        <div className="terminal-chrome">
          <div className="terminal-dots" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <span className="terminal-chrome-title" title={sessionTooltip}>
            <em>SYC</em> · 本机终端 · {shellLabel}
          </span>
          <div className="terminal-chrome-actions">
            <button type="button" onClick={handleResetCwd} title="回到用户主目录">
              主目录
            </button>
            <button type="button" onClick={handleClear}>
              清屏
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="terminal-scroll"
          onMouseDown={handleScrollMouseDown}
        >
          {lines.map((line) => {
            if (line.kind === 'welcome') {
              return (
                <div key={line.id} className="terminal-welcome">
                  <strong>欢迎使用 SYC 终端</strong>
                  <br />
                  <code>Tab</code> 补全命令与路径，<code>↑↓</code> 历史，<code>⌘L</code> 清屏。
                  <br />
                  透明度 100=完全透明，0=不透明；明暗可单独调亮/调暗玻璃。
                </div>
              );
            }
            if (line.kind === 'cmd') {
              return (
                <p key={line.id} className="terminal-line terminal-line--cmd">
                  <span className="term-prompt-glyph">❯</span>
                  <span className="term-prompt-path">{promptPath}</span>
                  {line.text}
                </p>
              );
            }
            const className = `terminal-line terminal-line--${line.kind}`;
            return (
              <p key={line.id} className={className}>
                {line.kind === 'out' || line.kind === 'err' ? ansiToSpans(line.text) : line.text}
              </p>
            );
          })}
          {busy && <p className="terminal-line terminal-line--meta">执行中…</p>}
        </div>

        {suggestions.length > 1 && (
          <ul className="terminal-suggest" role="listbox" aria-label="补全候选">
            {suggestions.map((s, i) => (
              <li
                key={`${s}-${i}`}
                className={i === suggestIdx ? 'is-active' : ''}
                role="option"
                aria-selected={i === suggestIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const c = completionRef.current;
                  if (!c) return;
                  setSuggestIdx(i);
                  setInput(applyCompletion(input, c.replaceFrom, s));
                  focusInput();
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}

        <form className="terminal-input-row" onSubmit={onSubmit}>
          <span className="term-prompt-glyph" aria-hidden>
            ❯
          </span>
          <span className="term-prompt-path" title={info?.cwd}>
            {promptPath}
          </span>
          <input
            ref={inputRef}
            className="terminal-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              clearSuggestions();
            }}
            onKeyDown={onInputKeyDown}
            disabled={busy}
            placeholder="输入命令 · Tab 补全"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            autoFocus={isActive}
          />
        </form>
      </div>
    </div>
  );
}
