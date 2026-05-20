export type Player = 'human' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Cell = Player | null;

export interface GameMove {
  from: number;
  to: number;
}

export interface ZouFourState {
  board: Cell[];
  turn: Player;
  winner: Player | null;
  selected: number | null;
  /** 上一步被吃掉的点位（用于界面高亮） */
  lastCaptured: number[];
}

export const BOARD_SIZE = 4;
export const CELLS = BOARD_SIZE * BOARD_SIZE;
export const PIECES_PER_PLAYER = 4;

/** 人类在底边（索引 12–15），电脑在顶边（索引 0–3） */
export const HUMAN_START = [12, 13, 14, 15] as const;
export const AI_START = [0, 1, 2, 3] as const;

export function createInitialState(): ZouFourState {
  const board: Cell[] = Array(CELLS).fill(null);
  for (const i of AI_START) board[i] = 'ai';
  for (const i of HUMAN_START) board[i] = 'human';
  return {
    board,
    turn: 'human',
    winner: null,
    selected: null,
    lastCaptured: [],
  };
}

export function opponent(p: Player): Player {
  return p === 'human' ? 'ai' : 'human';
}

export function countPieces(board: Cell[], player: Player): number {
  return board.filter((c) => c === player).length;
}

export function orthogonalNeighbors(index: number): number[] {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const n: number[] = [];
  if (row > 0) n.push(index - BOARD_SIZE);
  if (row < BOARD_SIZE - 1) n.push(index + BOARD_SIZE);
  if (col > 0) n.push(index - 1);
  if (col < BOARD_SIZE - 1) n.push(index + 1);
  return n;
}

/** 一条横/竖线（4 个交叉点）上的棋子总数 */
function countPiecesOnLine(indices: number[], board: Cell[]): number {
  let n = 0;
  for (const i of indices) {
    if (board[i] !== null) n++;
  }
  return n;
}

/** 一次吃子高亮：整条线、相邻两己、被吃的敌子 */
export interface CaptureHighlight {
  lineIndices: number[];
  ownIndices: [number, number];
  victimIndex: number;
}

/**
 * 吃子（仅走棋方走完检测）：
 * 同一条横/竖线 4 点中恰好 3 子；存在紧密相邻的两己；
 * 敌子紧贴在该「己己」对的任一端 → 吃掉该敌子。
 */
function captureHighlightsOnLine(
  indices: number[],
  board: Cell[],
  player: Player
): CaptureHighlight[] {
  if (countPiecesOnLine(indices, board) !== 3) return [];

  const enemy = opponent(player);
  const lineIndices = [...indices];
  const out: CaptureHighlight[] = [];

  for (let p = 0; p < indices.length - 1; p++) {
    const i0 = indices[p];
    const i1 = indices[p + 1];
    if (board[i0] !== player || board[i1] !== player) continue;

    if (p > 0) {
      const left = indices[p - 1];
      if (board[left] === enemy) {
        out.push({ lineIndices, ownIndices: [i0, i1], victimIndex: left });
      }
    }
    if (p + 2 < indices.length) {
      const right = indices[p + 2];
      if (board[right] === enemy) {
        out.push({ lineIndices, ownIndices: [i0, i1], victimIndex: right });
      }
    }
  }

  return out;
}

export function findCaptureHighlights(board: Cell[], player: Player): CaptureHighlight[] {
  const out: CaptureHighlight[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    const base = row * BOARD_SIZE;
    out.push(
      ...captureHighlightsOnLine([base, base + 1, base + 2, base + 3], board, player)
    );
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    out.push(
      ...captureHighlightsOnLine([col, col + 4, col + 8, col + 12], board, player)
    );
  }

  const seen = new Set<number>();
  return out.filter((h) => {
    if (seen.has(h.victimIndex)) return false;
    seen.add(h.victimIndex);
    return true;
  });
}

export function findCaptures(board: Cell[], player: Player): number[] {
  return findCaptureHighlights(board, player).map((h) => h.victimIndex);
}

/** 吃子形态文案（用于吃子动画提示） */
export function capturePatternLabel(h: CaptureHighlight): string {
  const line = h.lineIndices;
  const victimPos = line.indexOf(h.victimIndex);
  const ownPos = line.indexOf(h.ownIndices[0]);
  return victimPos < ownPos ? '敌 · 己 · 己' : '己 · 己 · 敌';
}

/** 走完子、尚未移除被吃棋子时的棋盘（供吃子动画展示） */
export function boardAfterMoveBeforeCapture(
  board: Cell[],
  move: GameMove,
  player: Player
): Cell[] | null {
  if (board[move.from] !== player || board[move.to] !== null) return null;
  const next = [...board];
  next[move.from] = null;
  next[move.to] = player;
  return next;
}

export function getLegalMovesForBoard(board: Cell[], player: Player): GameMove[] {
  const moves: GameMove[] = [];
  for (let from = 0; from < CELLS; from++) {
    if (board[from] !== player) continue;
    for (const to of orthogonalNeighbors(from)) {
      if (board[to] === null) moves.push({ from, to });
    }
  }
  return moves;
}

export function getLegalMoves(state: ZouFourState, forPlayer?: Player): GameMove[] {
  if (state.winner) return [];
  return getLegalMovesForBoard(state.board, forPlayer ?? state.turn);
}

function resolveWinnerAfterMove(board: Cell[], playerJustMoved: Player): Player | null {
  const enemy = opponent(playerJustMoved);

  if (countPieces(board, enemy) <= 1) return playerJustMoved;
  if (countPieces(board, playerJustMoved) <= 1) return enemy;

  if (getLegalMovesForBoard(board, enemy).length === 0) return playerJustMoved;

  const next = opponent(playerJustMoved);
  if (getLegalMovesForBoard(board, next).length === 0) return playerJustMoved;

  return null;
}

export function applyMove(state: ZouFourState, move: GameMove): ZouFourState {
  if (state.winner) return state;

  const player = state.turn;
  const board = [...state.board];

  if (board[move.from] !== player || board[move.to] !== null) return state;

  board[move.from] = null;
  board[move.to] = player;

  const lastCaptured = findCaptures(board, player);
  for (const i of lastCaptured) board[i] = null;

  const winner = resolveWinnerAfterMove(board, player);

  return {
    board,
    turn: winner ? player : opponent(player),
    winner,
    selected: null,
    lastCaptured,
  };
}

function movesEqual(a: GameMove, b: GameMove): boolean {
  return a.from === b.from && a.to === b.to;
}

export function isLegalMove(state: ZouFourState, move: GameMove): boolean {
  return getLegalMoves(state).some((m) => movesEqual(m, move));
}

export function tryHumanCellClick(
  state: ZouFourState,
  index: number
): { next: ZouFourState; changed: boolean } {
  if (state.winner || state.turn !== 'human') {
    return { next: state, changed: false };
  }

  const cell = state.board[index];

  if (cell === 'human') {
    if (state.selected === index) {
      return { next: { ...state, selected: null }, changed: true };
    }
    return { next: { ...state, selected: index }, changed: true };
  }

  if (cell === null && state.selected !== null) {
    const move: GameMove = { from: state.selected, to: index };
    if (!isLegalMove(state, move)) return { next: state, changed: false };
    return { next: applyMove(state, move), changed: true };
  }

  return { next: state, changed: false };
}

/** 轻量模拟：仅数组运算，供 AI 快速试招 */
function simulateMove(
  board: Cell[],
  move: GameMove,
  player: Player
): { board: Cell[]; winner: Player | null } {
  const b = board.slice();
  b[move.from] = null;
  b[move.to] = player;
  for (const i of findCaptures(b, player)) b[i] = null;
  return { board: b, winner: resolveWinnerAfterMove(b, player) };
}

function countCapturesOnMove(board: Cell[], move: GameMove, player: Player): number {
  const b = board.slice();
  b[move.from] = null;
  b[move.to] = player;
  return findCaptures(b, player).length;
}

function evaluateBoard(board: Cell[], aiPlayer: Player): number {
  const enemy = opponent(aiPlayer);
  const aiCount = countPieces(board, aiPlayer);
  const enemyCount = countPieces(board, enemy);

  if (enemyCount <= 1) return 100_000;
  if (aiCount <= 1) return -100_000;

  const aiMoves = getLegalMovesForBoard(board, aiPlayer).length;
  const enemyMoves = getLegalMovesForBoard(board, enemy).length;

  if (enemyMoves === 0) return 80_000;
  if (aiMoves === 0) return -80_000;

  let score = (aiCount - enemyCount) * 800 + (aiMoves - enemyMoves) * 45;

  for (let row = 0; row < BOARD_SIZE; row++) {
    const base = row * BOARD_SIZE;
    score += lineScoreForAi([base, base + 1, base + 2, base + 3], board, aiPlayer, enemy);
  }
  for (let col = 0; col < BOARD_SIZE; col++) {
    score += lineScoreForAi([col, col + 4, col + 8, col + 12], board, aiPlayer, enemy);
  }

  return score;
}

function lineScoreForAi(
  indices: number[],
  board: Cell[],
  me: Player,
  them: Player
): number {
  if (countPiecesOnLine(indices, board) !== 3) {
    return countPiecesOnLine(indices, board) === 4 ? -8 : 0;
  }

  let score = 0;
  for (let p = 0; p < indices.length - 1; p++) {
    const i0 = indices[p];
    const i1 = indices[p + 1];
    if (board[i0] !== me || board[i1] !== me) continue;
    if (p > 0 && board[indices[p - 1]] === them) score += 55;
    if (p + 2 < indices.length && board[indices[p + 2]] === them) score += 55;
    if (p > 0 && board[indices[p - 1]] === me) score -= 10;
  }
  return score;
}

function findWinningMoves(board: Cell[], player: Player): GameMove[] {
  return getLegalMovesForBoard(board, player).filter((m) => {
    return simulateMove(board, m, player).winner === player;
  });
}

/** 根节点 1～2 层应招，比完整 minimax 快一个数量级以上 */
function bestMoveByShallowSearch(
  board: Cell[],
  moves: GameMove[],
  ai: Player,
  lookAhead: 1 | 2
): GameMove {
  const human = opponent(ai);
  let bestScore = -Infinity;
  let best: GameMove[] = [];

  for (const move of moves) {
    const afterAi = simulateMove(board, move, ai);
    if (afterAi.winner === ai) return move;

    let score =
      afterAi.winner === human
        ? -100_000
        : evaluateBoard(afterAi.board, ai);

    if (lookAhead === 2 && afterAi.winner === null) {
      const replies = getLegalMovesForBoard(afterAi.board, human);
      if (replies.length === 0) {
        score = 80_000;
      } else {
        let worst = Infinity;
        for (const reply of replies) {
          const afterHuman = simulateMove(afterAi.board, reply, human);
          if (afterHuman.winner === human) {
            worst = -100_000;
            break;
          }
          if (afterHuman.winner === ai) {
            worst = Math.min(worst, 90_000);
            continue;
          }
          worst = Math.min(worst, evaluateBoard(afterHuman.board, ai));
        }
        score = worst;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }

  return pickRandom(best);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function chooseAiMove(state: ZouFourState, difficulty: Difficulty): GameMove | null {
  const { board } = state;
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  const ai: Player = 'ai';
  const human: Player = 'human';

  const wins = findWinningMoves(board, ai);
  if (wins.length > 0 && !(difficulty === 'easy' && Math.random() < 0.3)) {
    return pickRandom(wins);
  }

  const captures = moves
    .map((m) => ({ m, n: countCapturesOnMove(board, m, ai) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  if (captures.length > 0 && !(difficulty === 'easy' && Math.random() < 0.4)) {
    const best = captures[0].n;
    return pickRandom(captures.filter((x) => x.n === best).map((x) => x.m));
  }

  const blocks = moves.filter((m) => {
    const after = simulateMove(board, m, ai).board;
    return findWinningMoves(after, human).length > 0;
  });
  if (blocks.length > 0 && !(difficulty === 'easy' && Math.random() < 0.45)) {
    return pickRandom(blocks);
  }

  if (difficulty === 'easy') {
    return pickRandom(moves);
  }

  return bestMoveByShallowSearch(board, moves, ai, difficulty === 'hard' ? 2 : 1);
}

export function statusText(state: ZouFourState): string {
  if (state.winner === 'human') return '你赢了！对方仅余一子、无棋可走或已判负。';
  if (state.winner === 'ai') return '电脑获胜，再来一局？';
  if (state.lastCaptured.length > 0 && state.turn === 'human') {
    return `上一步吃了 ${state.lastCaptured.length} 子 · 轮到你走`;
  }
  if (state.turn === 'human') {
    return state.selected !== null
      ? '点相邻交叉点走子，或再点己子取消选择'
      : '轮到你：选一颗己子，走到相邻空交叉点';
  }
  return '电脑走棋…';
}
