/** 当前标签页是否在前台（用于暂停轮询/动画，避免后台耗能） */
export interface PanelActivityProps {
  isActive?: boolean;
}

export interface ClipboardEntry {
  id: string;
  text: string;
  copiedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface TerminalRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  cwd: string;
  durationMs: number;
}

export interface TerminalInfo {
  cwd: string;
  shell: string;
  homedir: string;
  hostname: string;
  username: string;
}

export interface TerminalCompleteResult {
  matches: string[];
  replaceFrom: number;
  replaceTo: number;
}

export type TabId =
  | 'weather'
  | 'terminal'
  | 'calculator'
  | 'notes'
  | 'clipboard'
  | 'wallpaper'
  | 'wheel'
  | 'json'
  | 'toolkit'
  | 'translate'
  | 'monitor'
  | 'zoufour';

export interface SystemStatsSnapshot {
  ts: number;
  cpu: { usage: number; cores: number; model: string };
  memory: { used: number; total: number; usedPercent: number };
  disk: { used: number; total: number; usedPercent: number; mount: string };
  network: { downloadBps: number; uploadBps: number; iface: string };
  battery: {
    percent: number;
    isCharging: boolean;
    healthPercent: number | null;
    cycleCount: number | null;
    timeRemaining: number | null;
  } | null;
}

export interface WheelOption {
  id: string;
  label: string;
  color: string;
}

export interface WallpaperItem {
  id: string;
  filename: string;
  displayName: string;
  addedAt: number;
}

export interface WallpaperListItem extends WallpaperItem {
  previewUrl: string | null;
}

/** 某一时刻（按小时）的天气快照 */
export interface WeatherSnapshot {
  observedAt: string;
  hourLabel: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windDirLabel: string;
  precipProb: number;
  precipitation: number;
  weatherCode: number;
  dressIndex: string;
  dressTip: string;
  /** 美国 AQI 指数（Open-Meteo us_aqi） */
  aqi: number | null;
  aqiLabel: string;
  aqiLevel: 'good' | 'moderate' | 'unhealthy' | 'hazardous' | 'unknown';
  /** PM2.5 浓度 µg/m³ */
  pm25: number | null;
}

export interface WeatherDay {
  date: string;
  label: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitation: number;
  windMax: number;
  humidityAvg: number;
  precipProbMax: number;
  snapshot: WeatherSnapshot;
}

export interface WeatherBundle {
  days: WeatherDay[];
  fetchedAt: number;
  timezone: string;
}
