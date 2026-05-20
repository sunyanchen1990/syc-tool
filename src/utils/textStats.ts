export interface TextStats {
  chars: number;
  charsNoSpace: number;
  lines: number;
  words: number;
  utf8Bytes: number;
  utf16Units: number;
  chinese: number;
  letters: number;
  digits: number;
  spaces: number;
  punctuation: number;
}

const CJK =
  /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/u;
const LETTER = /[A-Za-z]/;
const DIGIT = /\d/;
const SPACE = /\s/;
const PUNCT = /[!-/:-@[-`{-~\u2000-\u206f\u3000-\u303f\uff00-\uffef]/;

export function computeTextStats(text: string): TextStats {
  const chars = [...text].length;
  let charsNoSpace = 0;
  let chinese = 0;
  let letters = 0;
  let digits = 0;
  let spaces = 0;
  let punctuation = 0;

  for (const ch of text) {
    if (SPACE.test(ch)) spaces++;
    else charsNoSpace++;
    if (CJK.test(ch)) chinese++;
    if (LETTER.test(ch)) letters++;
    if (DIGIT.test(ch)) digits++;
    if (PUNCT.test(ch)) punctuation++;
  }

  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const trimmed = text.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

  let utf8Bytes = 0;
  try {
    utf8Bytes = new TextEncoder().encode(text).length;
  } catch {
    utf8Bytes = new Blob([text]).size;
  }

  return {
    chars,
    charsNoSpace,
    lines,
    words,
    utf8Bytes,
    utf16Units: text.length,
    chinese,
    letters,
    digits,
    spaces,
    punctuation,
  };
}

export const TEXT_STAT_ITEMS: { key: keyof TextStats; label: string; hint?: string }[] = [
  { key: 'chars', label: '字符数', hint: 'Unicode 码点（含 emoji）' },
  { key: 'charsNoSpace', label: '非空白字符' },
  { key: 'lines', label: '行数' },
  { key: 'words', label: '词数', hint: '按空白分词' },
  { key: 'utf8Bytes', label: 'UTF-8 字节' },
  { key: 'utf16Units', label: 'UTF-16 单元' },
  { key: 'chinese', label: '中文/全角' },
  { key: 'letters', label: '英文字母' },
  { key: 'digits', label: '数字' },
  { key: 'spaces', label: '空白字符' },
  { key: 'punctuation', label: '标点符号' },
];
