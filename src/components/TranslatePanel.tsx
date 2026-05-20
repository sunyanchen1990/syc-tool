import { useCallback, useEffect, useMemo, useState } from 'react';
import { registerDemoHandler } from '../screenshot-demo';
import {
  LANGUAGES,
  languageName,
  maxCharsForProvider,
  providerHint,
  translateText,
} from '../utils/translate';
import {
  DEFAULT_TRANSLATE_SETTINGS,
  PROVIDER_OPTIONS,
  loadTranslateSettings,
  saveTranslateSettings,
  type TranslateSettings,
} from '../utils/translateSettings';
import './TranslatePanel.css';

async function copyText(text: string): Promise<boolean> {
  try {
    if (window.deskMini?.clipboard) {
      await window.deskMini.clipboard.copy(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}

export default function TranslatePanel(_props: import('../types').PanelActivityProps) {
  const [settings, setSettings] = useState<TranslateSettings>(loadTranslateSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [source, setSource] = useState('');
  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('zh-CN');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(
    () =>
      registerDemoHandler('translate', () => {
        setSource('SYC-TOOL brings weather, terminal, notes and twelve tools to your Mac.');
        setResult('SYC-TOOL 将天气、终端、便签等十二项能力带到 Mac 桌面。');
        setError('');
        setLoading(false);
        setHint('');
      }),
    []
  );

  const charLimit = useMemo(() => maxCharsForProvider(settings), [settings]);
  const charCount = source.length;
  const willChunk = charCount > charLimit;

  const updateSettings = (patch: Partial<TranslateSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveTranslateSettings(next);
      return next;
    });
  };

  const runTranslate = useCallback(async () => {
    setError('');
    setHint('');
    setResult('');
    setLoading(true);
    try {
      const r = await translateText(source, fromLang, toLang, settings);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r.text);
      if (r.chunked) setHint('文本较长，已分段翻译后合并');
    } finally {
      setLoading(false);
    }
  }, [source, fromLang, toLang, settings]);

  const swapLang = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setResult('');
    setError('');
  };

  const setToChinese = () => {
    setToLang('zh-CN');
    if (fromLang === 'zh-CN' || fromLang === 'zh-TW') setFromLang('en');
  };

  const setFromChinese = () => {
    setFromLang('zh-CN');
    if (toLang === 'zh-CN' || toLang === 'zh-TW') setToLang('en');
  };

  const handleCopyResult = async () => {
    if (!result) return;
    const ok = await copyText(result);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleClear = () => {
    setSource('');
    setResult('');
    setError('');
    setHint('');
  };

  return (
    <div className="translate-panel">
      <h2 className="panel-title">翻译</h2>
      <p className="panel-subtitle">{providerHint(settings)}</p>

      <div className="translate-settings-bar">
        <button
          type="button"
          className="btn-ghost translate-settings-toggle"
          onClick={() => setShowSettings((v) => !v)}
        >
          {showSettings ? '收起引擎设置' : '引擎设置（突破额度限制）'}
        </button>
      </div>

      {showSettings && (
        <div className="translate-settings glass-card">
          <p className="translate-settings-intro">
            公共接口都有额度。要<strong>不限次数</strong>，推荐在本机用 Docker 跑 LibreTranslate；或申请
            DeepL 免费 Key（约 50 万字符/月，质量更好）。
          </p>

          <label className="translate-settings-label">翻译引擎</label>
          <select
            className="input-field translate-select"
            value={settings.provider}
            onChange={(e) =>
              updateSettings({ provider: e.target.value as TranslateSettings['provider'] })
            }
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.desc}
              </option>
            ))}
          </select>

          {settings.provider === 'libretranslate' && (
            <div className="translate-settings-block">
              <label className="translate-settings-label" htmlFor="libre-url">
                服务地址
              </label>
              <input
                id="libre-url"
                className="input-field"
                value={settings.libreUrl}
                onChange={(e) => updateSettings({ libreUrl: e.target.value })}
                placeholder="http://127.0.0.1:5000"
              />
              <label className="translate-settings-label" htmlFor="libre-key">
                API Key（可选）
              </label>
              <input
                id="libre-key"
                className="input-field"
                type="password"
                value={settings.libreApiKey}
                onChange={(e) => updateSettings({ libreApiKey: e.target.value })}
                placeholder="自建未启用认证可留空"
              />
              <pre className="translate-docker-hint">{`# 本机启动（需已安装 Docker）\ndocker run -d --name libretranslate -p 5000:5000 libretranslate/libretranslate`}</pre>
            </div>
          )}

          {settings.provider === 'deepl' && (
            <div className="translate-settings-block">
              <label className="translate-settings-label" htmlFor="deepl-key">
                DeepL API Key
              </label>
              <input
                id="deepl-key"
                className="input-field"
                type="password"
                value={settings.deeplApiKey}
                onChange={(e) => updateSettings({ deeplApiKey: e.target.value })}
                placeholder="在 deepl.com 开发者页面免费申请"
              />
              <p className="translate-settings-note">
                免费 Key 一般以 <code>:fx</code> 结尾，自动走免费 API。额度约 50 万字符/月，非无限但远高于
                MyMemory。
              </p>
            </div>
          )}

          <button
            type="button"
            className="btn-ghost"
            onClick={() => updateSettings({ ...DEFAULT_TRANSLATE_SETTINGS })}
          >
            恢复默认（MyMemory）
          </button>
        </div>
      )}

      <div className="translate-lang-bar glass-card">
        <div className="translate-lang-group">
          <label className="translate-lang-label" htmlFor="from-lang">
            源语言
          </label>
          <select
            id="from-lang"
            className="input-field translate-select"
            value={fromLang}
            onChange={(e) => {
              setFromLang(e.target.value);
              setResult('');
              setError('');
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="translate-swap-btn"
          onClick={swapLang}
          title="交换语言"
          aria-label="交换语言"
        >
          ⇄
        </button>

        <div className="translate-lang-group">
          <label className="translate-lang-label" htmlFor="to-lang">
            目标语言
          </label>
          <select
            id="to-lang"
            className="input-field translate-select"
            value={toLang}
            onChange={(e) => {
              setToLang(e.target.value);
              setResult('');
              setError('');
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={`to-${l.code}`} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="translate-quick">
        <button type="button" className="btn-ghost" onClick={setToChinese}>
          译为中文
        </button>
        <button type="button" className="btn-ghost" onClick={setFromChinese}>
          从中文译出
        </button>
        <span className="translate-pair-hint">
          {languageName(fromLang)} → {languageName(toLang)}
        </span>
      </div>

      <div className="translate-body">
        <div className="translate-pane glass-card">
          <div className="translate-pane-head">
            <span className="translate-pane-title">原文</span>
            <span className={`translate-count${willChunk ? ' warn' : ''}`}>
              {charCount} 字{willChunk ? '（将分段）' : ''}
            </span>
          </div>
          <textarea
            className="translate-textarea"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setError('');
            }}
            placeholder="输入或粘贴要翻译的文本…"
            spellCheck={false}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!loading && source.trim()) void runTranslate();
              }
            }}
          />
          <div className="translate-pane-actions">
            <button type="button" className="btn-ghost" onClick={handleClear} disabled={!source && !result}>
              清空
            </button>
            <button type="button" className="btn-ghost" onClick={() => copyText(source)} disabled={!source.trim()}>
              复制原文
            </button>
          </div>
        </div>

        <div className="translate-actions-col">
          <button
            type="button"
            className="btn-primary translate-go-btn"
            onClick={runTranslate}
            disabled={loading || !source.trim()}
          >
            {loading ? '翻译中…' : '翻译 →'}
          </button>
        </div>

        <div className="translate-pane glass-card">
          <div className="translate-pane-head">
            <span className="translate-pane-title">译文</span>
            {result && (
              <button type="button" className="btn-ghost translate-copy-result" onClick={handleCopyResult}>
                {copied ? '已复制' : '复制译文'}
              </button>
            )}
          </div>
          <div className={`translate-result${!result && !error ? ' empty' : ''}`}>
            {loading && <p className="translate-placeholder">正在翻译…</p>}
            {!loading && error && <p className="translate-error">{error}</p>}
            {!loading && !error && result && <p className="translate-result-text">{result}</p>}
            {!loading && !error && !result && (
              <p className="translate-placeholder">译文将显示在这里</p>
            )}
          </div>
          {hint && <p className="translate-hint">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
