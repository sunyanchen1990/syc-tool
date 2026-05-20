import { useCallback, useEffect, useRef, useState } from 'react';
import WheelCanvas from './WheelCanvas';
import { useWheelSpin } from '../hooks/useWheelSpin';
import {
  WHEEL_LIMITS,
  applyContrastToOptions,
  isValidLabel,
  newOptionId,
  normalizeLabel,
  randomPastelColor,
  type WheelOption,
} from '../utils/wheel';
import { registerDemoHandler } from '../screenshot-demo';
import './WheelPanel.css';

type HintKind =
  | 'success'
  | 'duplicate'
  | 'empty'
  | 'length'
  | 'min-count'
  | 'max-count'
  | 'spin-min'
  | null;

export default function WheelPanel(_props: import('../types').PanelActivityProps) {
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState<HintKind>(null);
  const [wheelSize, setWheelSize] = useState(280);
  const stageRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [colorTargetId, setColorTargetId] = useState<string | null>(null);
  const hintTimer = useRef<number>();

  const {
    rotation,
    spinning,
    blur,
    highlightIndex,
    resultLabel,
    showResult,
    spin,
    resetVisual,
  } = useWheelSpin(options.length);

  const showHint = useCallback((kind: HintKind, ms = 3000) => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    setHint(kind);
    if (kind) {
      hintTimer.current = window.setTimeout(() => setHint(null), ms);
    }
  }, []);

  useEffect(() => () => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
  }, []);

  useEffect(
    () =>
      registerDemoHandler('wheel', () => {
        setOptions(
          applyContrastToOptions([
            { id: 'demo-w1', label: '火锅', color: '#f5b800' },
            { id: 'demo-w2', label: '日料', color: '#6ee7c8' },
            { id: 'demo-w3', label: '轻食', color: '#c084fc' },
            { id: 'demo-w4', label: '麻辣烫', color: '#fb7185' },
            { id: 'demo-w5', label: '沙拉', color: '#38bdf8' },
          ])
        );
        setInput('咖啡');
        resetVisual();
      }),
    [resetVisual]
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight - 88;
      setWheelSize(Math.max(200, Math.min(350, Math.min(w, h) * 0.92)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const addOption = useCallback(() => {
    const label = normalizeLabel(input);
    if (!label) {
      showHint('empty');
      return;
    }
    if (!isValidLabel(label)) {
      showHint('length');
      return;
    }
    if (options.length >= WHEEL_LIMITS.maxOptions) {
      showHint('max-count');
      return;
    }
    if (options.some((o) => o.label === label)) {
      showHint('duplicate');
      return;
    }
    const used = options.map((o) => o.color);
    const next: WheelOption = {
      id: newOptionId(),
      label,
      color: randomPastelColor(used),
    };
    setOptions((prev) => applyContrastToOptions([...prev, next]));
    setInput('');
    showHint('success', 2000);
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>('.wheel-input')?.focus();
    });
  }, [input, options, showHint]);

  const removeOption = useCallback(
    (id: string) => {
      if (options.length <= WHEEL_LIMITS.minOptions) return;
      setOptions((prev) => applyContrastToOptions(prev.filter((o) => o.id !== id)));
      resetVisual();
    },
    [options.length, resetVisual]
  );

  const clearAll = useCallback(() => {
    setOptions([]);
    setInput('');
    resetVisual();
    setHint(null);
  }, [resetVisual]);

  const openColorPicker = (id: string, color: string) => {
    setColorTargetId(id);
    const el = colorRef.current;
    if (!el) return;
    el.value = color;
    el.click();
    try {
      el.showPicker();
    } catch {
      /* 部分环境无 showPicker */
    }
  };

  const onColorChange = (hex: string) => {
    if (!colorTargetId) return;
    setOptions((prev) =>
      applyContrastToOptions(prev.map((o) => (o.id === colorTargetId ? { ...o, color: hex } : o)))
    );
  };

  const handleSpin = () => {
    if (options.length < WHEEL_LIMITS.minOptions) {
      showHint('spin-min');
      return;
    }
    spin(
      options.map((o) => o.label),
      () => {}
    );
  };

  const inputLen = [...input].length;
  const lengthWarn = input.length > 0 && inputLen > WHEEL_LIMITS.labelMax;

  return (
    <div className="wheel-panel">
      <aside className="wheel-left">
        <h2 className="wheel-panel-title">转盘选项</h2>

        <div className="wheel-input-row">
          <input
            className="wheel-input"
            type="text"
            value={input}
            maxLength={10}
            placeholder="请输入转盘选项（1-10个字符）"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOption();
              }
            }}
          />
          <button type="button" className="wheel-btn-add" onClick={addOption}>
            添加
          </button>
        </div>

        <WheelHint hint={hint} lengthWarn={lengthWarn} />

        <ul className="wheel-option-list">
          {options.map((opt) => (
            <li key={opt.id} className="wheel-option-item">
              <span className="wheel-option-label">{opt.label}</span>
              <button
                type="button"
                className="wheel-color-dot"
                style={{ backgroundColor: opt.color }}
                aria-label={`修改 ${opt.label} 颜色`}
                onClick={() => openColorPicker(opt.id, opt.color)}
              />
              <button
                type="button"
                className="wheel-btn-remove"
                aria-label={`删除 ${opt.label}`}
                disabled={options.length <= WHEEL_LIMITS.minOptions}
                onClick={() => removeOption(opt.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {options.length === WHEEL_LIMITS.minOptions && (
          <p className="wheel-min-hint-list">至少保留2个选项</p>
        )}

        {options.length > 0 && (
          <button type="button" className="wheel-btn-clear" onClick={clearAll}>
            清空所有
          </button>
        )}

        <input
          ref={colorRef}
          type="color"
          className="wheel-color-native"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => onColorChange(e.target.value)}
        />
      </aside>

      <div className="wheel-divider" aria-hidden />

      <section className="wheel-right">
        <div ref={stageRef} className="wheel-stage">
          <WheelCanvas
            options={options}
            rotation={rotation}
            spinning={spinning}
            blur={blur}
            highlightIndex={highlightIndex}
            diameter={wheelSize}
          />
        </div>

        <div className="wheel-result-slot" aria-live="polite">
          {showResult && resultLabel ? (
            <div className="wheel-result-toast" role="status">
              <span className="wheel-result-tag">抽奖结果</span>
              <strong className="wheel-result-value">{resultLabel}</strong>
            </div>
          ) : hint === 'spin-min' ? (
            <p className="wheel-spin-hint">请先添加至少2个选项</p>
          ) : null}
        </div>

        <div className="wheel-right-footer">
          <button
            type="button"
            className="wheel-btn-spin"
            disabled={spinning || options.length < WHEEL_LIMITS.minOptions}
            onClick={handleSpin}
          >
            {spinning ? '旋转中...' : '开始旋转'}
          </button>
        </div>
      </section>
    </div>
  );
}

function WheelHint({ hint, lengthWarn }: { hint: HintKind; lengthWarn: boolean }) {
  if (lengthWarn) {
    return <p className="wheel-inline-hint">最多10个字符</p>;
  }
  if (!hint) return <p className="wheel-inline-hint wheel-inline-hint--placeholder" aria-hidden>&nbsp;</p>;

  const text: Record<Exclude<HintKind, null>, string> = {
    success: '添加成功',
    duplicate: '该选项已存在',
    empty: '请输入选项内容',
    length: '最多10个字符',
    'min-count': '至少添加2个选项',
    'max-count': '最多添加12个选项',
    'spin-min': '请先添加至少2个选项',
  };

  return <p className="wheel-inline-hint">{text[hint]}</p>;
}
