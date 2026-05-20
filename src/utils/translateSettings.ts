export type TranslateProvider = 'mymemory' | 'libretranslate' | 'deepl';

export interface TranslateSettings {
  provider: TranslateProvider;
  /** 自建 LibreTranslate 地址，如 http://127.0.0.1:5000 */
  libreUrl: string;
  libreApiKey: string;
  deeplApiKey: string;
}

export const PROVIDER_OPTIONS: {
  id: TranslateProvider;
  label: string;
  desc: string;
}[] = [
  {
    id: 'mymemory',
    label: 'MyMemory（默认）',
    desc: '免配置，有每日额度限制',
  },
  {
    id: 'libretranslate',
    label: 'LibreTranslate（推荐）',
    desc: '自建服务后本地使用，不限次数',
  },
  {
    id: 'deepl',
    label: 'DeepL',
    desc: '免费 Key 约 50 万字符/月，质量高',
  },
];

const STORAGE_KEY = 'syc-translate-settings';

export const DEFAULT_TRANSLATE_SETTINGS: TranslateSettings = {
  provider: 'mymemory',
  libreUrl: 'http://127.0.0.1:5000',
  libreApiKey: '',
  deeplApiKey: '',
};

export function loadTranslateSettings(): TranslateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRANSLATE_SETTINGS };
    return { ...DEFAULT_TRANSLATE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TRANSLATE_SETTINGS };
  }
}

export function saveTranslateSettings(settings: TranslateSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
