import type { TranslateSettings } from './translateSettings';

export interface LanguageOption {
  code: string;
  name: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁体中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'it', name: '意大利语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' },
  { code: 'id', name: '印尼语' },
  { code: 'nl', name: '荷兰语' },
  { code: 'pl', name: '波兰语' },
  { code: 'tr', name: '土耳其语' },
  { code: 'hi', name: '印地语' },
  { code: 'ms', name: '马来语' },
];

export type TranslateResult =
  | { ok: true; text: string; chunked?: boolean }
  | { ok: false; error: string };

function chunkLimit(settings: TranslateSettings): number {
  switch (settings.provider) {
    case 'deepl':
      return 4000;
    case 'libretranslate':
      return 3000;
    default:
      return 480;
  }
}

function splitForTranslate(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = maxLen;
    const slice = rest.slice(0, maxLen);
    const lastBreak = Math.max(
      slice.lastIndexOf('\n'),
      slice.lastIndexOf('。'),
      slice.lastIndexOf('！'),
      slice.lastIndexOf('？'),
      slice.lastIndexOf('. '),
      slice.lastIndexOf(' ')
    );
    if (lastBreak > maxLen * 0.4) cut = lastBreak + 1;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function toLibreCode(code: string): string {
  if (code === 'zh-CN' || code === 'zh-TW') return 'zh';
  return code.split('-')[0] ?? code;
}

function toDeepLCode(code: string): string {
  const map: Record<string, string> = {
    'zh-CN': 'ZH-HANS',
    'zh-TW': 'ZH-HANT',
    en: 'EN',
    ja: 'JA',
    ko: 'KO',
    fr: 'FR',
    de: 'DE',
    es: 'ES',
    ru: 'RU',
    pt: 'PT',
    it: 'IT',
    ar: 'AR',
    th: 'TH',
    vi: 'VI',
    id: 'ID',
    nl: 'NL',
    pl: 'PL',
    tr: 'TR',
    hi: 'HI',
    ms: 'MS',
  };
  return map[code] ?? code.toUpperCase().replace(/-.*/, '');
}

async function translateMyMemory(
  text: string,
  from: string,
  to: string
): Promise<TranslateResult> {
  const q = encodeURIComponent(text);
  const langpair = encodeURIComponent(`${from}|${to}`);
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;

  const res = await fetch(url);
  if (!res.ok) return { ok: false, error: `MyMemory 响应异常（${res.status}）` };

  const data = (await res.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
    quotaFinished?: boolean;
  };

  if (data.quotaFinished) {
    return {
      ok: false,
      error: 'MyMemory 今日额度已用尽。可改用「LibreTranslate 自建」或配置 DeepL Key',
    };
  }

  const status = Number(data.responseStatus);
  if (status !== 200) return { ok: false, error: 'MyMemory 暂时不可用' };

  let translated = data.responseData?.translatedText?.trim();
  if (!translated) return { ok: false, error: '未获取到译文' };

  if (translated.includes('MYMEMORY WARNING')) {
    translated = translated.split('MYMEMORY WARNING')[0].trim();
  }

  return { ok: true, text: translated };
}

async function translateLibre(
  text: string,
  from: string,
  to: string,
  settings: TranslateSettings
): Promise<TranslateResult> {
  const base = settings.libreUrl.trim().replace(/\/$/, '');
  if (!base) {
    return { ok: false, error: '请填写 LibreTranslate 服务地址（如 http://127.0.0.1:5000）' };
  }

  const body: Record<string, string> = {
    q: text,
    source: toLibreCode(from),
    target: toLibreCode(to),
    format: 'text',
  };
  if (settings.libreApiKey.trim()) {
    body.api_key = settings.libreApiKey.trim();
  }

  let res: Response;
  try {
    res = await fetch(`${base}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: `无法连接 ${base}。请确认已启动 LibreTranslate（Docker 见界面说明）`,
    };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, error: `LibreTranslate 错误（${res.status}）${errText ? `: ${errText.slice(0, 80)}` : ''}` };
  }

  const data = (await res.json()) as { translatedText?: string; error?: string };
  if (data.error) return { ok: false, error: data.error };
  const translated = data.translatedText?.trim();
  if (!translated) return { ok: false, error: '未获取到译文' };
  return { ok: true, text: translated };
}

async function translateDeepL(
  text: string,
  from: string,
  to: string,
  settings: TranslateSettings
): Promise<TranslateResult> {
  const key = settings.deeplApiKey.trim();
  if (!key) {
    return {
      ok: false,
      error: '请填写 DeepL API Key（免费申请：deepl.com/pro#developer）',
    };
  }

  const form = new URLSearchParams();
  form.append('text', text);
  form.append('target_lang', toDeepLCode(to));
  form.append('source_lang', toDeepLCode(from));

  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    return { ok: false, error: err.message ?? `DeepL 错误（${res.status}）` };
  }

  const data = (await res.json()) as { translations?: { text: string }[] };
  const translated = data.translations?.[0]?.text?.trim();
  if (!translated) return { ok: false, error: '未获取到译文' };
  return { ok: true, text: translated };
}

async function translateChunk(
  text: string,
  from: string,
  to: string,
  settings: TranslateSettings
): Promise<TranslateResult> {
  switch (settings.provider) {
    case 'libretranslate':
      return translateLibre(text, from, to, settings);
    case 'deepl':
      return translateDeepL(text, from, to, settings);
    default:
      return translateMyMemory(text, from, to);
  }
}

export async function translateText(
  text: string,
  from: string,
  to: string,
  settings: TranslateSettings
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: '请输入要翻译的内容' };
  if (from === to) return { ok: false, error: '源语言与目标语言不能相同' };

  const limit = chunkLimit(settings);
  const chunks = splitForTranslate(trimmed, limit);
  const parts: string[] = [];

  try {
    for (const chunk of chunks) {
      const result = await translateChunk(chunk, from, to, settings);
      if (!result.ok) return result;
      parts.push(result.text);
    }
    return {
      ok: true,
      text: parts.join(''),
      chunked: chunks.length > 1,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return {
        ok: false,
        error:
          '无法连接翻译服务（可能被安全策略拦截或网络不通）。请检查网络；使用 LibreTranslate 时请确认 Docker 已启动。',
      };
    }
    return { ok: false, error: `请求失败：${msg}` };
  }
}

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function providerHint(settings: TranslateSettings): string {
  switch (settings.provider) {
    case 'libretranslate':
      return '当前：自建 LibreTranslate，无第三方日限额';
    case 'deepl':
      return '当前：DeepL（免费 Key 约 50 万字符/月）';
    default:
      return '当前：MyMemory 公共接口（有日限额）';
  }
}

/** 供界面展示的分段提示阈值 */
export function maxCharsForProvider(settings: TranslateSettings): number {
  return chunkLimit(settings);
}
