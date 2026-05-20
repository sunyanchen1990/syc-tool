import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatJson, minifyJson, parseJson, validateJson } from '../utils/jsonFormat';
import {
  buildJsonTree,
  collectExpandablePaths,
  defaultExpandedPaths,
} from '../utils/jsonTree';
import JsonTreeView from './JsonTreeView';
import { registerDemoHandler } from '../screenshot-demo';
import './JsonPanel.css';

const SAMPLE = `{"name":"SYC-TOOL","features":["weather","notes"],"meta":{"version":1,"tags":["tool","json"]}}`;

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

export default function JsonPanel(_props: import('../types').PanelActivityProps) {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<2 | 4>(2);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<{ type: 'idle' | 'ok' | 'err'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => {
    if (!input.trim()) return null;
    return validateJson(input);
  }, [input]);

  const treeRoot = useMemo(() => {
    if (!validation?.valid) return null;
    const parsed = parseJson(input);
    if (!parsed.ok) return null;
    return buildJsonTree(parsed.value);
  }, [input, validation]);

  const applyDefaultExpand = useCallback((root: NonNullable<typeof treeRoot>) => {
    setExpanded(defaultExpandedPaths(root, 3));
  }, []);

  useEffect(
    () =>
      registerDemoHandler('json', () => {
        try {
          setInput(SAMPLE);
          const parsed = parseJson(SAMPLE);
          if (parsed.ok) applyDefaultExpand(buildJsonTree(parsed.value));
          setStatus({ type: 'ok', message: '已加载示例 JSON' });
        } catch {
          setInput(SAMPLE);
        }
      }),
    [applyDefaultExpand]
  );

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (!treeRoot) return;
    setExpanded(new Set(collectExpandablePaths(treeRoot)));
    setStatus({ type: 'ok', message: '已全部展开' });
  }, [treeRoot]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
    setStatus({ type: 'ok', message: '已全部收起' });
  }, []);

  const handleFormat = useCallback(() => {
    const result = formatJson(input, indent);
    if (!result.ok) {
      setStatus({ type: 'err', message: result.error });
      return;
    }
    setInput(result.output);
    const parsed = parseJson(result.output);
    if (parsed.ok) {
      applyDefaultExpand(buildJsonTree(parsed.value));
    }
    setStatus({ type: 'ok', message: `已格式化（缩进 ${indent} 空格）` });
  }, [input, indent, applyDefaultExpand]);

  const handleMinify = useCallback(() => {
    const result = minifyJson(input);
    if (!result.ok) {
      setStatus({ type: 'err', message: result.error });
      return;
    }
    setInput(result.output);
    const parsed = parseJson(result.output);
    if (parsed.ok) {
      applyDefaultExpand(buildJsonTree(parsed.value));
    }
    setStatus({ type: 'ok', message: '已压缩' });
  }, [input, applyDefaultExpand]);

  const handleCopy = useCallback(async () => {
    if (!input.trim()) return;
    const ok = await copyText(input);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [input]);

  const handleClear = () => {
    setInput('');
    setExpanded(new Set());
    setStatus({ type: 'idle', message: '' });
  };

  const handleSample = () => {
    const result = formatJson(SAMPLE, indent);
    const text = result.ok ? result.output : SAMPLE;
    setInput(text);
    const parsed = parseJson(text);
    if (parsed.ok) {
      applyDefaultExpand(buildJsonTree(parsed.value));
    }
    setStatus({ type: 'ok', message: '已填入示例' });
  };

  return (
    <div className="json-panel">
      <div className="json-header">
        <div>
          <h2 className="panel-title">JSON 格式化</h2>
          <p className="panel-subtitle">编辑区输入 · 下方树形查看结构（+ 展开 / − 收起）</p>
        </div>
        <div className="json-indent">
          <span className="json-indent-label">缩进</span>
          <button
            type="button"
            className={`json-indent-btn ${indent === 2 ? 'active' : ''}`}
            onClick={() => setIndent(2)}
          >
            2
          </button>
          <button
            type="button"
            className={`json-indent-btn ${indent === 4 ? 'active' : ''}`}
            onClick={() => setIndent(4)}
          >
            4
          </button>
        </div>
      </div>

      <div className="json-toolbar">
        <button type="button" className="btn-primary" onClick={handleFormat}>
          格式化
        </button>
        <button type="button" className="btn-ghost" onClick={handleMinify}>
          压缩
        </button>
        <button type="button" className="btn-ghost" onClick={handleExpandAll} disabled={!treeRoot}>
          全部展开
        </button>
        <button type="button" className="btn-ghost" onClick={handleCollapseAll} disabled={!treeRoot}>
          全部收起
        </button>
        <button type="button" className="btn-ghost" onClick={handleCopy} disabled={!input.trim()}>
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" className="btn-ghost" onClick={handleClear}>
          清空
        </button>
        <button type="button" className="btn-ghost" onClick={handleSample}>
          示例
        </button>
      </div>

      <div className="json-body">
        <div className="json-input-pane glass-card">
          <div className="json-pane-label">输入</div>
          <textarea
            className="json-editor"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
            }}
            placeholder='粘贴 JSON，例如 {"key": "value"}'
            spellCheck={false}
          />
        </div>

        <div className="json-tree-pane glass-card">
          <div className="json-pane-label">结构树</div>
          <div className="json-tree-scroll">
            {treeRoot ? (
              <JsonTreeView root={treeRoot} expanded={expanded} onToggle={handleToggle} />
            ) : (
              <p className="json-tree-empty">
                {validation && !validation.valid
                  ? '语法有误，修正后将显示结构树'
                  : '输入合法 JSON 后在此查看树形结构'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="json-footer">
        {validation && (
          <span className={`json-valid ${validation.valid ? 'ok' : 'err'}`}>
            {validation.valid ? '✓ 语法正确' : `✗ ${validation.error}`}
          </span>
        )}
        {!validation && input.trim() === '' && (
          <span className="json-valid muted">输入 JSON 后自动校验</span>
        )}
        {status.message && (
          <span className={`json-status ${status.type}`}>{status.message}</span>
        )}
      </div>
    </div>
  );
}
