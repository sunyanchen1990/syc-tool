import { useEffect, useState } from 'react';
import type { ClipboardEntry, PanelActivityProps } from '../types';
import './ClipboardPanel.css';

const TWO_HOURS = 2 * 60 * 60 * 1000;

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatPreview(text: string, max = 120) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export default function ClipboardPanel(_props: PanelActivityProps) {
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (window.deskMini?.clipboard) {
        const list = await window.deskMini.clipboard.list();
        setEntries(list);
        return window.deskMini.clipboard.onUpdated(setEntries);
      }
      // Browser fallback for dev without electron
      const stored = localStorage.getItem('deskmini-clipboard-fallback');
      if (stored) setEntries(JSON.parse(stored));
      return undefined;
    };
    let unsub: (() => void) | undefined;
    load().then((u) => {
      unsub = u;
    });
    return () => unsub?.();
  }, []);

  const filtered = entries.filter((e) => {
    if (Date.now() - e.copiedAt > TWO_HOURS) return false;
    if (!search.trim()) return true;
    return e.text.toLowerCase().includes(search.toLowerCase());
  });

  const handleCopy = async (entry: ClipboardEntry) => {
    if (window.deskMini?.clipboard) {
      await window.deskMini.clipboard.copy(entry.text);
    } else {
      await navigator.clipboard.writeText(entry.text);
    }
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClear = async () => {
    if (window.deskMini?.clipboard) {
      await window.deskMini.clipboard.clear();
    }
    setEntries([]);
  };

  return (
    <div className="clipboard-panel">
      <div className="clipboard-header">
        <div>
          <h2 className="panel-title">剪贴板暂存</h2>
          <p className="panel-subtitle">自动记录近 2 小时内复制的内容</p>
        </div>
        <button type="button" className="btn-ghost" onClick={handleClear}>
          清空
        </button>
      </div>
      <input
        className="input-field clipboard-search"
        placeholder="搜索复制过的文字…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!window.deskMini && (
        <p className="clipboard-hint">
          开发模式下剪贴板监听需在 Electron 中运行；请使用 npm run electron:dev
        </p>
      )}
      <ul className="clipboard-list">
        {filtered.length === 0 ? (
          <li className="empty-state">
            {search ? '没有匹配的记录' : '暂无复制记录，复制一些文字后会自动出现在这里'}
          </li>
        ) : (
          filtered.map((entry) => (
            <li key={entry.id} className="clipboard-item glass-card">
              <div className="ci-meta">
                <span className="ci-time">{formatTime(entry.copiedAt)}</span>
                <span className="ci-len">{entry.text.length} 字</span>
              </div>
              <pre className="ci-text">{formatPreview(entry.text, 200)}</pre>
              <button
                type="button"
                className="btn-primary ci-copy"
                onClick={() => handleCopy(entry)}
              >
                {copiedId === entry.id ? '已复制 ✓' : '再次复制'}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
