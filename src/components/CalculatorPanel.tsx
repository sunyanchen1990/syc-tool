import { useCallback, useEffect, useState } from 'react';
import type { PanelActivityProps } from '../types';
import { registerDemoHandler } from '../screenshot-demo';
import './CalculatorPanel.css';

type Op = '+' | '-' | '×' | '÷' | null;

export default function CalculatorPanel(_props: PanelActivityProps) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);

  useEffect(
    () =>
      registerDemoHandler('calculator', () => {
        setDisplay('384');
        setPrev(128);
        setOp('×');
        setFresh(false);
      }),
    []
  );

  const inputDigit = (d: string) => {
    setDisplay((cur) => {
      if (fresh || cur === '0') {
        setFresh(false);
        return d === '.' ? '0.' : d;
      }
      if (d === '.' && cur.includes('.')) return cur;
      return cur + d;
    });
  };

  const clear = () => {
    setDisplay('0');
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const toggleSign = () => {
    setDisplay((cur) => (cur.startsWith('-') ? cur.slice(1) : cur === '0' ? '0' : `-${cur}`));
  };

  const percent = () => {
    setDisplay((cur) => String(parseFloat(cur) / 100));
  };

  const applyOp = useCallback(
    (nextOp: Op) => {
      const current = parseFloat(display);
      if (prev !== null && op && !fresh) {
        let result = prev;
        switch (op) {
          case '+':
            result = prev + current;
            break;
          case '-':
            result = prev - current;
            break;
          case '×':
            result = prev * current;
            break;
          case '÷':
            result = current === 0 ? NaN : prev / current;
            break;
        }
        const text = Number.isNaN(result) ? '错误' : String(parseFloat(result.toPrecision(12)));
        setDisplay(text);
        setPrev(Number.isNaN(result) ? null : result);
      } else {
        setPrev(current);
      }
      setOp(nextOp);
      setFresh(true);
    },
    [display, prev, op, fresh]
  );

  const equals = () => {
    if (op === null) return;
    applyOp(null);
    setOp(null);
    setPrev(null);
  };

  const buttons: { label: string; className?: string; action: () => void }[] = [
    { label: 'AC', className: 'fn', action: clear },
    { label: '±', className: 'fn', action: toggleSign },
    { label: '%', className: 'fn', action: percent },
    { label: '÷', className: 'op', action: () => applyOp('÷') },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '×', className: 'op', action: () => applyOp('×') },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '-', className: 'op', action: () => applyOp('-') },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '+', className: 'op', action: () => applyOp('+') },
    { label: '0', className: 'zero', action: () => inputDigit('0') },
    { label: '.', action: () => inputDigit('.') },
    { label: '=', className: 'eq', action: equals },
  ];

  return (
    <div className="calc-panel">
      <h2 className="panel-title">计算器</h2>
      <p className="panel-subtitle">简洁好用的桌面计算器</p>
      <div className="calc-display-wrap">
        {op && prev !== null && (
          <span className="calc-history">
            {prev} {op}
          </span>
        )}
        <div className="calc-display">{display}</div>
      </div>
      <div className="calc-grid">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`calc-btn ${b.className ?? ''}`}
            onClick={b.action}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
