import { useEffect, useMemo, useState } from 'react';
import { registerDemoHandler } from '../screenshot-demo';
import {
  TIME_UNITS,
  formatDateTimes,
  parseDateTimeInput,
  parseTimestampInput,
  type TimeUnit,
} from '../utils/timeConvert';
import { TEXT_STAT_ITEMS, computeTextStats } from '../utils/textStats';
import './ToolkitPanel.css';

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

export default function ToolkitPanel(_props: import('../types').PanelActivityProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('ms');
  const [tsInput, setTsInput] = useState('');
  const [dtInput, setDtInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [copyHint, setCopyHint] = useState('');

  useEffect(
    () =>
      registerDemoHandler('toolkit', () => {
        setTsInput(String(Math.floor(Date.now() / 1000)));
        setDtInput('2024-05-19 12:00');
        setTextInput(
          'SYC-TOOL — 十二种效率，一块毛玻璃面板。\n本地优先，无需账号，失焦收起为悬浮球。'
        );
      }),
    []
  );

  const tsResult = useMemo(() => {
    if (!tsInput.trim()) return null;
    return parseTimestampInput(tsInput, timeUnit);
  }, [tsInput, timeUnit]);

  const dtResult = useMemo(() => {
    if (!dtInput.trim()) return null;
    return parseDateTimeInput(dtInput);
  }, [dtInput]);

  const tsDates = tsResult?.ok ? formatDateTimes(tsResult.ms) : null;
  const dtDates = dtResult?.ok ? formatDateTimes(dtResult.ms) : null;

  const textStats = useMemo(() => computeTextStats(textInput), [textInput]);

  const nowStamp = useMemo(() => {
    const ms = Date.now();
    return parseDateTimeInput(String(ms));
  }, []);

  const handleCopy = async (value: string) => {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopyHint('已复制');
      setTimeout(() => setCopyHint(''), 1200);
    }
  };

  const fillNow = () => {
    const ms = Date.now();
    setTsInput(String(ms));
    setDtInput(formatDateTimes(ms).local);
    setTimeUnit('ms');
  };

  return (
    <div className="toolkit-panel">
      <h2 className="panel-title">工具箱</h2>
      <p className="panel-subtitle">时间戳互转 · 文本字符/字节统计</p>

      <section className="toolkit-section glass-card">
        <h3 className="toolkit-section-title">时间戳 ↔ 日期时间</h3>

        <div className="toolkit-unit-row">
          <span className="toolkit-label">精度</span>
          {TIME_UNITS.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`toolkit-unit-btn ${timeUnit === u.id ? 'active' : ''}`}
              onClick={() => setTimeUnit(u.id)}
            >
              {u.label}
            </button>
          ))}
          <button type="button" className="btn-ghost toolkit-now-btn" onClick={fillNow}>
            当前时间
          </button>
        </div>

        <div className="toolkit-time-grid">
          <div className="toolkit-time-block">
            <label className="toolkit-label" htmlFor="ts-input">
              时间戳 → 日期
            </label>
            <input
              id="ts-input"
              className="input-field toolkit-input"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder={`输入${TIME_UNITS.find((u) => u.id === timeUnit)?.label}时间戳`}
            />
            {tsInput.trim() && (
              <div className="toolkit-result">
                {tsResult?.ok ? (
                  <>
                    <ResultRow label="本地" value={tsDates!.local} onCopy={handleCopy} />
                    <ResultRow label="UTC" value={tsDates!.utc} onCopy={handleCopy} />
                    <ResultRow label="ISO" value={tsDates!.iso} onCopy={handleCopy} />
                    <div className="toolkit-multi-ts">
                      <span className="toolkit-label-sm">各精度</span>
                      {TIME_UNITS.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="toolkit-chip"
                          onClick={() => handleCopy(tsResult.all[u.id])}
                          title="点击复制"
                        >
                          {u.label}: {tsResult.all[u.id]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="toolkit-err">{tsResult?.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="toolkit-time-block">
            <label className="toolkit-label" htmlFor="dt-input">
              日期 → 时间戳
            </label>
            <input
              id="dt-input"
              className="input-field toolkit-input"
              value={dtInput}
              onChange={(e) => setDtInput(e.target.value)}
              placeholder="2026-05-19 12:30:00 或纯数字时间戳"
            />
            {dtInput.trim() && (
              <div className="toolkit-result">
                {dtResult?.ok ? (
                  <>
                    <ResultRow label="本地" value={dtDates!.local} onCopy={handleCopy} />
                    <div className="toolkit-multi-ts">
                      <span className="toolkit-label-sm">各精度（点击复制）</span>
                      {TIME_UNITS.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="toolkit-chip"
                          onClick={() => handleCopy(dtResult.all[u.id])}
                        >
                          {u.label}: {dtResult.all[u.id]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="toolkit-err">{dtResult?.error}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {nowStamp?.ok && (
          <p className="toolkit-hint">
            此刻毫秒时间戳：<button type="button" className="toolkit-link" onClick={() => handleCopy(nowStamp.all.ms)}>{nowStamp.all.ms}</button>
            {copyHint && <span className="toolkit-copy-hint"> · {copyHint}</span>}
          </p>
        )}
      </section>

      <section className="toolkit-section glass-card">
        <h3 className="toolkit-section-title">文本统计</h3>
        <textarea
          className="toolkit-textarea input-field"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="粘贴或输入文本，实时统计字符、词数、UTF-8 字节等"
          spellCheck={false}
        />
        <div className="toolkit-stats-grid">
          {TEXT_STAT_ITEMS.map(({ key, label, hint }) => (
            <div key={key} className="toolkit-stat-card">
              <span className="toolkit-stat-value">{textStats[key].toLocaleString('zh-CN')}</span>
              <span className="toolkit-stat-label">{label}</span>
              {hint && <span className="toolkit-stat-hint">{hint}</span>}
            </div>
          ))}
        </div>
        <div className="toolkit-text-actions">
          <button type="button" className="btn-ghost" onClick={() => setTextInput('')} disabled={!textInput}>
            清空
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => handleCopy(textInput)}
            disabled={!textInput}
          >
            复制全文
          </button>
        </div>
      </section>
    </div>
  );
}

function ResultRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="toolkit-result-row">
      <span className="toolkit-result-label">{label}</span>
      <code className="toolkit-result-value">{value}</code>
      <button type="button" className="btn-ghost toolkit-copy-btn" onClick={() => onCopy(value)}>
        复制
      </button>
    </div>
  );
}
