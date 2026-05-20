import { useEffect, useState } from 'react';
import type { WheelOption } from '../utils/wheel';
import { highlightSegmentColor, segmentLabelMetrics } from '../utils/wheel';

interface Props {
  options: WheelOption[];
  rotation: number;
  spinning: boolean;
  blur: boolean;
  highlightIndex: number | null;
  diameter: number;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

function labelTransform(cx: number, cy: number, r: number, midDeg: number) {
  const pos = polar(cx, cy, r * 0.58, midDeg);
  let rotate = midDeg + 90;
  if (rotate > 90 && rotate < 270) rotate += 180;
  return `translate(${pos.x}, ${pos.y}) rotate(${rotate})`;
}

/** 顶部固定长指针（不随转盘旋转） */
function pointerPath(cx: number, cy: number, r: number) {
  const tipY = cy - r + 2;
  const baseY = cy - r * 0.62;
  const halfW = 11;
  return `M ${cx} ${tipY} L ${cx - halfW} ${baseY} L ${cx} ${baseY + 14} L ${cx + halfW} ${baseY} Z`;
}

export default function WheelCanvas({
  options,
  rotation,
  spinning,
  blur,
  highlightIndex,
  diameter,
}: Props) {
  const [entered, setEntered] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEntered((prev) => {
      const next = new Set(prev);
      options.forEach((o) => next.add(o.id));
      return next;
    });
  }, [options]);

  const size = Math.max(200, Math.min(350, diameter));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const n = options.length;
  const step = n > 0 ? 360 / n : 0;

  return (
    <div className="wheel-canvas-wrap" style={{ width: size, height: size }}>
      <svg
        className={`wheel-svg${blur ? ' is-blur' : ''}${spinning ? ' is-spinning' : ''}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden={n === 0}
      >
        <defs>
          {options.map((opt, i) => {
            const start = -90 + i * step;
            const end = start + step;
            return (
              <clipPath key={`clip-${opt.id}`} id={`wheel-clip-${opt.id}`}>
                <path d={segmentPath(cx, cy, r, start, end)} />
              </clipPath>
            );
          })}
        </defs>

        <circle className="wheel-bg" cx={cx} cy={cy} r={r} />
        {n === 0 ? (
          <text className="wheel-empty-text" x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
            请先在左侧添加选项
          </text>
        ) : (
          <g
            className="wheel-rotor"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          >
            {options.map((opt, i) => {
              const start = -90 + i * step;
              const end = start + step;
              const mid = start + step / 2;
              const hi = highlightIndex === i;
              const fill = hi ? highlightSegmentColor(opt.color) : opt.color;
              const isNew = !entered.has(opt.id);
              const { fontSize, display } = segmentLabelMetrics(n, r, opt.label);
              return (
                <g
                  key={opt.id}
                  className={`wheel-segment${isNew ? ' is-entering' : ''}`}
                  clipPath={`url(#wheel-clip-${opt.id})`}
                  onAnimationEnd={() =>
                    setEntered((s) => {
                      const next = new Set(s);
                      next.add(opt.id);
                      return next;
                    })
                  }
                >
                  <path d={segmentPath(cx, cy, r, start, end)} fill={fill} className="wheel-slice" />
                  <text
                    className="wheel-slice-label"
                    transform={labelTransform(cx, cy, r, mid)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight={700}
                    fontSize={fontSize}
                  >
                    {display}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        <circle className="wheel-hub" cx={cx} cy={cy} r={10} />
        {n > 0 && <path className="wheel-pointer-needle" d={pointerPath(cx, cy, r)} />}
      </svg>
    </div>
  );
}
