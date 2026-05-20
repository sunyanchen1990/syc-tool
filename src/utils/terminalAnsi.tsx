import type { ReactNode } from 'react';

const ANSI_RE = /\x1b\[[0-9;]*m/g;

const CODE_CLASS: Record<number, string> = {
  0: '',
  1: 'ansi-bold',
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-yellow',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  36: 'ansi-cyan',
  90: 'ansi-dim',
};

function classesForCodes(codes: number[]): string {
  const set = new Set<string>();
  for (const c of codes) {
    if (c === 0) {
      set.clear();
      continue;
    }
    const cls = CODE_CLASS[c];
    if (cls) set.add(cls);
  }
  return [...set].join(' ');
}

/** 将带 ANSI 的文本拆成带样式的 span（仅常见 SGR 码） */
export function ansiToSpans(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let codes: number[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(ANSI_RE.source, 'g');

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      const chunk = text.slice(last, match.index);
      const cls = classesForCodes(codes);
      parts.push(
        cls ? (
          <span key={`${last}-${match.index}`} className={cls}>
            {chunk}
          </span>
        ) : (
          chunk
        )
      );
    }
    const body = match[0].slice(2, -1);
    const next = body
      .split(';')
      .filter(Boolean)
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n));
    if (body === '' || body === '0') codes = [];
    else codes = [...codes, ...next];
    last = re.lastIndex;
  }

  if (last < text.length) {
    const chunk = text.slice(last);
    const cls = classesForCodes(codes);
    parts.push(
      cls ? (
        <span key={`${last}-end`} className={cls}>
          {chunk}
        </span>
      ) : (
        chunk
      )
    );
  }

  return parts.length ? parts : [text];
}
