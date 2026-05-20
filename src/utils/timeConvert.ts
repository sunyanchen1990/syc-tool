export type TimeUnit = 'ms' | 'us' | 'ns';

export const TIME_UNITS: { id: TimeUnit; label: string; divisor: number }[] = [
  { id: 'ms', label: '毫秒', divisor: 1 },
  { id: 'us', label: '微秒', divisor: 1_000 },
  { id: 'ns', label: '纳秒', divisor: 1_000_000 },
];

/** 将各精度时间戳转为毫秒（用于 Date） */
export function timestampToMs(value: bigint | number, unit: TimeUnit): number {
  const n = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
  switch (unit) {
    case 'ms':
      return Number(n);
    case 'us':
      return Number(n / 1_000n);
    case 'ns':
      return Number(n / 1_000_000n);
    default:
      return Number(n);
  }
}

export function msToUnitStrings(ms: number): Record<TimeUnit, string> {
  const msInt = Math.trunc(ms);
  return {
    ms: String(msInt),
    us: String(BigInt(msInt) * 1_000n),
    ns: String(BigInt(msInt) * 1_000_000n),
  };
}

export function detectTimeUnit(digits: string): TimeUnit | null {
  const len = digits.replace(/\D/g, '').length;
  if (len >= 18) return 'ns';
  if (len >= 15) return 'us';
  if (len >= 10) return 'ms';
  return null;
}

export function parseTimestampInput(
  raw: string,
  unit: TimeUnit
): { ok: true; ms: number; all: Record<TimeUnit, string> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: '请输入时间戳' };
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: '时间戳应为整数数字' };
  }

  try {
    const big = BigInt(trimmed);
    const ms = timestampToMs(big, unit);
    if (!Number.isFinite(ms)) {
      return { ok: false, error: '数值超出可表示范围' };
    }
    return { ok: true, ms, all: msToUnitStrings(ms) };
  } catch {
    return { ok: false, error: '无法解析时间戳' };
  }
}

export function parseDateTimeInput(
  raw: string
): { ok: true; ms: number; all: Record<TimeUnit, string> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: '请输入日期时间' };

  let ms = NaN;
  if (/^\d+$/.test(trimmed)) {
    const detected = detectTimeUnit(trimmed) ?? 'ms';
    const r = parseTimestampInput(trimmed, detected);
    if (!r.ok) return r;
    return r;
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const d = new Date(normalized);
  ms = d.getTime();

  if (Number.isNaN(ms)) {
    return { ok: false, error: '无法识别日期格式，可试 2026-05-19 12:30:00 或 ISO 格式' };
  }

  return { ok: true, ms, all: msToUnitStrings(ms) };
}

export function formatDateTimes(ms: number): { local: string; utc: string; iso: string } {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return { local: '—', utc: '—', iso: '—' };
  }
  return {
    local: d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    utc: d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
    iso: d.toISOString(),
  };
}
