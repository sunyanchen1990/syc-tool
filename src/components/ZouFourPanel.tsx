import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PanelActivityProps } from '../types';
import type { CaptureHighlight, Cell, Difficulty, GameMove, ZouFourState } from '../utils/zouFour';
import {
  BOARD_SIZE,
  CELLS,
  applyMove,
  boardAfterMoveBeforeCapture,
  capturePatternLabel,
  chooseAiMove,
  countPieces,
  createInitialState,
  findCaptureHighlights,
  isLegalMove,
  orthogonalNeighbors,
  getLegalMoves,
  statusText,
} from '../utils/zouFour';
import { registerDemoHandler } from '../screenshot-demo';
import './ZouFourPanel.css';

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: '简单', hint: '常漏吃、漏挡' },
  { id: 'medium', label: '中级', hint: '会吃子与堵路' },
  { id: 'hard', label: '困难', hint: '算路更深' },
];

const CAPTURE_HIGHLIGHT_MS = 1100;
const CAPTURE_VANISH_MS = 480;

type CaptureAnimPhase = 'highlight' | 'vanish';

interface CaptureAnim {
  board: Cell[];
  highlights: CaptureHighlight[];
  phase: CaptureAnimPhase;
  label: string;
  mover: 'human' | 'ai';
}

function pointStyle(index: number): CSSProperties {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const denom = BOARD_SIZE - 1;
  return {
    left: `${(col / denom) * 100}%`,
    top: `${(row / denom) * 100}%`,
  };
}

function lineEndpoints(indices: number[]): { x1: number; y1: number; x2: number; y2: number } {
  const denom = BOARD_SIZE - 1;
  const toPct = (index: number) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    return { x: (col / denom) * 100, y: (row / denom) * 100 };
  };
  const a = toPct(indices[0]);
  const b = toPct(indices[indices.length - 1]);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function CaptureFxOverlay({ highlights }: { highlights: CaptureHighlight[] }) {
  const lines = useMemo(() => {
    const seen = new Set<string>();
    return highlights
      .map((h) => lineEndpoints(h.lineIndices))
      .filter((ep) => {
        const key = `${ep.x1},${ep.y1},${ep.x2},${ep.y2}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [highlights]);

  return (
    <div className="zoufour-capture-fx" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {lines.map((ep, i) => (
          <line
            key={i}
            className="zoufour-capture-line"
            x1={ep.x1}
            y1={ep.y1}
            x2={ep.x2}
            y2={ep.y2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg className="zoufour-victory-icon" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="zoufour-trophy-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="35%" stopColor="#ffd54f" />
          <stop offset="70%" stopColor="#f5b800" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path
        fill="url(#zoufour-trophy-gold)"
        d="M18 8h28l2 8h8c0 8-4 14-10 17 2 6 6 10 12 11v6H16v-6c6-1 10-5 12-11-6-3-10-9-10-17h8l2-8z"
      />
      <rect x="22" y="52" width="20" height="5" rx="1.5" fill="#c9a000" />
      <ellipse cx="32" cy="20" rx="10" ry="4" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg className="zoufour-victory-icon" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="zoufour-medal-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="40%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path fill="#475569" d="M22 6l6 14-8 4 8 4-6 14 10-10 10 10-6-14 8-4-8-4 6-14z" />
      <circle cx="32" cy="38" r="16" fill="url(#zoufour-medal-silver)" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="32" cy="38" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <path
        fill="#64748b"
        d="M32 30l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"
      />
    </svg>
  );
}

function VictoryConfetti() {
  const colors = ['#f5b800', '#ffc933', '#ff6b6b', '#34d399', '#60a5fa', '#f472b6'];
  return (
    <div className="zoufour-victory-confetti" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="zoufour-victory-confetti-piece"
          style={
            {
              '--cf-i': i,
              '--cf-x': `${(i * 17) % 100}%`,
              '--cf-delay': `${(i % 8) * 0.07}s`,
              '--cf-color': colors[i % colors.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function VictoryOverlay({
  winner,
  onPlayAgain,
}: {
  winner: 'human' | 'ai';
  onPlayAgain: () => void;
}) {
  const humanWin = winner === 'human';

  return (
    <div
      className={`zoufour-victory-overlay zoufour-victory-overlay--${winner}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zoufour-victory-title"
      aria-describedby="zoufour-victory-desc"
    >
      <div className="zoufour-victory-backdrop" aria-hidden />
      {humanWin ? <VictoryConfetti /> : null}
      <div className={`zoufour-victory-card zoufour-victory-card--${winner}`}>
        <div className="zoufour-victory-badge" aria-hidden>
          {humanWin ? <TrophyIcon /> : <MedalIcon />}
        </div>
        <p className="zoufour-victory-eyebrow">{humanWin ? '恭喜' : '本局结束'}</p>
        <h3 id="zoufour-victory-title" className="zoufour-victory-title">
          {humanWin ? '你赢了！' : '电脑获胜'}
        </h3>
        <p id="zoufour-victory-desc" className="zoufour-victory-desc">
          {humanWin
            ? '对方仅余一子、无棋可走或已判负。金色奖杯归你！'
            : '别灰心，走四子儿讲究连吃与堵路，再来一局试试？'}
        </p>
        <button type="button" className="zoufour-victory-btn" onClick={onPlayAgain}>
          再来一局
        </button>
      </div>
    </div>
  );
}

function BoardLines() {
  const n = BOARD_SIZE;
  const step = 100 / (n - 1);
  const lines: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const p = i * step;
    lines.push(
      <line key={`h${i}`} x1="0" y1={p} x2="100" y2={p} vectorEffect="non-scaling-stroke" />,
      <line key={`v${i}`} x1={p} y1="0" x2={p} y2="100" vectorEffect="non-scaling-stroke" />
    );
  }
  return (
    <div className="zoufour-board-lines" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {lines}
      </svg>
    </div>
  );
}

export default function ZouFourPanel({ isActive = true }: PanelActivityProps) {
  const [state, setState] = useState<ZouFourState>(createInitialState);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [captureAnim, setCaptureAnim] = useState<CaptureAnim | null>(null);
  const aiFrame = useRef<number>(0);
  const captureTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCaptureTimers = useCallback(() => {
    for (const t of captureTimers.current) clearTimeout(t);
    captureTimers.current = [];
  }, []);

  useEffect(
    () =>
      registerDemoHandler('zoufour', () => {
        let s = createInitialState();
        for (let i = 0; i < 8; i++) {
          const moves = getLegalMoves(s);
          if (!moves.length) break;
          s = applyMove(s, moves[0]);
        }
        setState({ ...s, selected: 8, winner: null });
        setCaptureAnim(null);
      }),
    []
  );

  const scheduleCaptureTimers = useCallback(
    (onVanish: () => void, onDone: () => void) => {
      clearCaptureTimers();
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced) {
        onDone();
        return;
      }

      captureTimers.current.push(
        setTimeout(onVanish, CAPTURE_HIGHLIGHT_MS),
        setTimeout(onDone, CAPTURE_HIGHLIGHT_MS + CAPTURE_VANISH_MS)
      );
    },
    [clearCaptureTimers]
  );

  const playCaptureAnim = useCallback(
    (
      interimBoard: Cell[],
      highlights: CaptureHighlight[],
      finalState: ZouFourState,
      mover: 'human' | 'ai'
    ) => {
      const label = highlights.map(capturePatternLabel).join(' / ');
      setCaptureAnim({
        board: interimBoard,
        highlights,
        phase: 'highlight',
        label,
        mover,
      });

      scheduleCaptureTimers(
        () => setCaptureAnim((cur) => (cur ? { ...cur, phase: 'vanish' } : null)),
        () => {
          setCaptureAnim(null);
          setState(finalState);
        }
      );
    },
    [scheduleCaptureTimers]
  );

  const applyMoveWithFx = useCallback(
    (prev: ZouFourState, move: GameMove): boolean => {
      if (!isLegalMove(prev, move)) return false;

      const player = prev.turn;
      const interim = boardAfterMoveBeforeCapture(prev.board, move, player);
      if (!interim) return false;

      const highlights = findCaptureHighlights(interim, player);
      const finalState = applyMove(prev, move);

      if (highlights.length === 0) {
        setState(finalState);
        return true;
      }

      playCaptureAnim(interim, highlights, finalState, player);
      return true;
    },
    [playCaptureAnim]
  );

  const reset = useCallback(() => {
    if (aiFrame.current) cancelAnimationFrame(aiFrame.current);
    clearCaptureTimers();
    setCaptureAnim(null);
    setState(createInitialState());
  }, [clearCaptureTimers]);

  useEffect(() => {
    if (!isActive || state.turn !== 'ai' || state.winner || captureAnim) return;

    const snapshot = state;
    aiFrame.current = requestAnimationFrame(() => {
      const move = chooseAiMove(snapshot, difficulty);
      if (!move) return;
      applyMoveWithFx(snapshot, move);
    });

    return () => {
      if (aiFrame.current) cancelAnimationFrame(aiFrame.current);
    };
  }, [isActive, state.turn, state.winner, state.board, difficulty, captureAnim, applyMoveWithFx]);

  useEffect(() => () => clearCaptureTimers(), [clearCaptureTimers]);

  const handleCell = (index: number) => {
    if (captureAnim || state.winner || state.turn !== 'human') return;

    const cell = state.board[index];

    if (cell === 'human') {
      if (state.selected === index) {
        setState({ ...state, selected: null });
        return;
      }
      setState({ ...state, selected: index });
      return;
    }

    if (cell === null && state.selected !== null) {
      applyMoveWithFx(state, { from: state.selected, to: index });
    }
  };

  const displayBoard = captureAnim?.board ?? state.board;
  const victimSet = useMemo(() => {
    if (!captureAnim) return new Set<number>();
    return new Set(captureAnim.highlights.map((h) => h.victimIndex));
  }, [captureAnim]);

  const ownCapSet = useMemo(() => {
    if (!captureAnim) return new Set<number>();
    const s = new Set<number>();
    for (const h of captureAnim.highlights) {
      s.add(h.ownIndices[0]);
      s.add(h.ownIndices[1]);
    }
    return s;
  }, [captureAnim]);

  const humanCount = countPieces(displayBoard, 'human');
  const aiCount = countPieces(displayBoard, 'ai');
  const animating = captureAnim !== null;
  const busy = animating || (state.turn === 'ai' && !state.winner);

  const moveTargets =
    !animating && state.selected !== null
      ? orthogonalNeighbors(state.selected).filter((i) => state.board[i] === null)
      : [];

  const statusMessage = captureAnim
    ? `${captureAnim.mover === 'human' ? '你' : '电脑'}吃子！形态：${captureAnim.label}（绿圈=己，红圈=被吃）`
    : statusText(state);

  return (
    <div className="zoufour-panel">
      <h2 className="panel-title">走四子儿</h2>
      <p className="panel-subtitle">
        4×4 交叉点 · 己己贴敌连吃 · 对方仅余 1 子或无棋可走即胜
      </p>

      <div className="zoufour-toolbar glass-card">
        <div className="zoufour-diff" role="group" aria-label="难度">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`zoufour-diff-btn${difficulty === d.id ? ' active' : ''}`}
              disabled={busy}
              onClick={() => setDifficulty(d.id)}
              title={d.hint}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost zoufour-reset" onClick={reset}>
          新局
        </button>
      </div>

      <p
        className={`zoufour-status${state.winner ? ' zoufour-status--end' : ''}${
          captureAnim ? ' zoufour-status--capture' : ''
        }`}
        aria-live="polite"
      >
        {statusMessage}
      </p>

      <div
        className={`zoufour-board-wrap glass-card${animating ? ' zoufour-board-wrap--capture' : ''}`}
      >
        <div className="zoufour-side-label">电脑（顶边）</div>
        <div className="zoufour-board" role="group" aria-label="走四子棋盘，棋子落在交叉点">
          <BoardLines />
          {captureAnim && captureAnim.phase === 'highlight' ? (
            <CaptureFxOverlay highlights={captureAnim.highlights} />
          ) : null}
          <div className="zoufour-points">
            {Array.from({ length: CELLS }, (_, i) => {
              const cell = displayBoard[i];
              const isSelected = !animating && state.selected === i;
              const canMoveTarget =
                state.turn === 'human' && !state.winner && moveTargets.includes(i);
              const clickable =
                !busy &&
                !state.winner &&
                state.turn === 'human' &&
                (cell === 'human' || canMoveTarget);

              const capVictim = victimSet.has(i);
              const capOwn = ownCapSet.has(i);
              const vanishing = captureAnim?.phase === 'vanish' && capVictim;

              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    'zoufour-point',
                    cell ? `zoufour-point--${cell}` : '',
                    isSelected ? 'zoufour-point--selected' : '',
                    clickable ? 'zoufour-point--clickable' : '',
                    canMoveTarget ? 'zoufour-point--target' : '',
                    capOwn && captureAnim?.phase === 'highlight'
                      ? 'zoufour-point--cap-own'
                      : '',
                    capVictim && captureAnim?.phase === 'highlight'
                      ? 'zoufour-point--cap-victim'
                      : '',
                    vanishing ? 'zoufour-point--cap-victim-out' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={pointStyle(i)}
                  disabled={!clickable}
                  onClick={() => handleCell(i)}
                  aria-label={
                    capVictim && captureAnim
                      ? '被吃的棋子'
                      : capOwn && captureAnim
                        ? '形成吃子的己方棋子'
                        : cell === 'human'
                          ? '你的棋子'
                          : cell === 'ai'
                            ? '电脑棋子'
                            : canMoveTarget
                              ? '空交叉点，可走动'
                              : '空交叉点'
                  }
                />
              );
            })}
          </div>
        </div>
        <div className="zoufour-side-label">你（底边）</div>

        <div className="zoufour-legend">
          <span>
            <i className="zoufour-dot zoufour-dot--human" /> 你 · 剩 {humanCount} 子
          </span>
          <span>
            <i className="zoufour-dot zoufour-dot--ai" /> 电脑 · 剩 {aiCount} 子
          </span>
        </div>

        {state.winner && !captureAnim ? (
          <VictoryOverlay winner={state.winner} onPlayAgain={reset} />
        ) : null}
      </div>

      <div className="zoufour-rules glass-card">
        <h3>规则</h3>
        <ul>
          <li>棋盘 4×4 交叉点；各 4 子。你放<strong>最底行</strong>，电脑放<strong>最顶行</strong>；你先手，轮流走。</li>
          <li>每次只走<strong>上下左右</strong>相邻一格，目标必须为空；禁止斜走、跳子、叠子。</li>
          <li>
            <strong>吃子</strong>（走完立刻判定）：同一横/竖线<strong>共 3 子</strong>，有两己紧挨，且敌子紧贴在这对己子的
            <strong>一端</strong>（<strong>己-己-敌</strong> 或 <strong>敌-己-己</strong>，第 4 格为空），吃掉该敌子。线上 2/4 子、两己不相邻、斜线等不吃。
          </li>
          <li>
            <strong>胜负</strong>：一方<strong>仅余 1 子</strong>或<strong>无任何合法走法</strong>，立即判负。无和棋。
          </li>
        </ul>
      </div>
    </div>
  );
}
