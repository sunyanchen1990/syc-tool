/** 转盘工具：颜色、对比度、校验（预留扩展：概率、背景、历史） */
export const WHEEL_LIMITS = {
  minOptions: 2,
  maxOptions: 12,
  labelMin: 1,
  labelMax: 10,
} as const;

export interface WheelOption {
  id: string;
  label: string;
  color: string;
}

export interface WheelExtensionApi {
  /** 预留：自定义各扇区权重 */
  setWeights?: (weights: Record<string, number>) => void;
  /** 预留：转盘背景图 */
  setBackground?: (url: string | null) => void;
  /** 预留：持久化历史 */
  loadHistory?: () => Promise<unknown[]>;
}

export const wheelExtensionApi: WheelExtensionApi = {};

/** 深色系扇区色板（饱和 jewel tone，相邻易区分） */
const DARK_WHEEL_POOL = [
  '#1D4ED8',
  '#0E7490',
  '#047857',
  '#6D28D9',
  '#B45309',
  '#BE123C',
  '#4338CA',
  '#0F766E',
  '#7C3AED',
  '#C2410C',
  '#1E40AF',
  '#9D174D',
];

export function newOptionId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function randomPastelColor(used: string[]): string {
  const free = DARK_WHEEL_POOL.filter((c) => !used.includes(c));
  const pool = free.length ? free : DARK_WHEEL_POOL;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function normalizeLabel(raw: string): string {
  return raw.trim();
}

export function isValidLabel(label: string): boolean {
  const len = [...label].length;
  return len >= WHEEL_LIMITS.labelMin && len <= WHEEL_LIMITS.labelMax;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function nudgeColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(r + amount);
  const ng = clamp(g + amount * 0.6);
  const nb = clamp(b - amount * 0.4);
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** 相邻扇区对比度不足时微调颜色 */
export function ensureAdjacentContrast(colors: string[]): string[] {
  if (colors.length < 2) return colors;
  const out = [...colors];
  for (let i = 0; i < out.length; i++) {
    const next = out[(i + 1) % out.length]!;
    if (contrastRatio(out[i]!, next) >= 4) continue;
    out[(i + 1) % out.length] = nudgeColor(next, 22 + (i % 3) * 10);
  }
  return out;
}

export function applyContrastToOptions(options: WheelOption[]): WheelOption[] {
  const colors = ensureAdjacentContrast(options.map((o) => o.color));
  return options.map((o, i) => ({ ...o, color: colors[i]! }));
}

export function darkenHex(hex: string, pct = 0.1): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** 高亮：深色扇区略微提亮 */
export function highlightSegmentColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r * 1.14 + 12), clamp(g * 1.14 + 12), clamp(b * 1.14 + 12)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** 计算旋转角度使 targetIndex 扇区中心对准顶部指针 */
export function landingRotationDeg(segmentCount: number, targetIndex: number): number {
  const step = 360 / segmentCount;
  const centerLocal = -90 + (targetIndex + 0.5) * step;
  let land = -90 - centerLocal;
  land = ((land % 360) + 360) % 360;
  const jitter = (Math.random() - 0.5) * step * 0.25;
  const extraTurns = (4 + Math.floor(Math.random() * 3)) * 360;
  return extraTurns + land + jitter;
}

/** 根据当前旋转角判定指针（顶部）所指向的扇区 */
export function indexAtPointer(rotationDeg: number, segmentCount: number): number {
  const step = 360 / segmentCount;
  let local = (-90 - rotationDeg) % 360;
  if (local < 0) local += 360;
  const idx = Math.floor((local + 90) / step) % segmentCount;
  return (idx + segmentCount) % segmentCount;
}

/** 旋转进度曲线：加速 → 匀速 → 减速 */
export function spinProgress(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.2) {
    const u = x / 0.2;
    return 0.11 * u * u;
  }
  if (x < 0.72) {
    return 0.11 + ((x - 0.2) / 0.52) * 0.64;
  }
  const u = (x - 0.72) / 0.28;
  return 0.75 + (1 - (1 - u) ** 3) * 0.25;
}

export function pickRandomIndex(count: number): number {
  return Math.floor(Math.random() * count);
}

/** 按扇区弧长计算字号与可显示字数，避免选项多时溢出 */
export function segmentLabelMetrics(
  optionCount: number,
  wheelRadius: number,
  label: string
): { fontSize: number; display: string } {
  if (optionCount <= 0) return { fontSize: 14, display: label };
  const stepRad = ((360 / optionCount) * Math.PI) / 180;
  const textRadius = wheelRadius * 0.58;
  const arcWidth = stepRad * textRadius;
  const fontSize = Math.round(Math.max(9, Math.min(16, arcWidth / 1.65)));
  const maxChars = Math.max(1, Math.floor(arcWidth / (fontSize * 0.62)));
  const chars = [...label];
  if (chars.length <= maxChars) return { fontSize, display: label };
  if (maxChars <= 1) return { fontSize, display: chars[0] ?? '' };
  return { fontSize, display: `${chars.slice(0, maxChars - 1).join('')}…` };
}
