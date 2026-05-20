import type { WeatherBundle, WeatherDay, WeatherSnapshot } from '../types';

/** 每种天气对应独立动效 id（hero 动画与背景） */
export type WeatherFx =
  | 'clear'
  | 'mainly-clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'fog'
  | 'rime-fog'
  | 'drizzle-light'
  | 'drizzle'
  | 'drizzle-heavy'
  | 'rain-light'
  | 'rain-moderate'
  | 'rain-heavy'
  | 'snow-light'
  | 'snow-moderate'
  | 'snow-heavy'
  | 'showers-light'
  | 'showers-moderate'
  | 'showers-heavy'
  | 'thunderstorm'
  | 'thunder-hail'
  | 'thunder-hail-severe';

export interface WeatherMeta {
  label: string;
  emoji: string;
  mood: string;
  fx: WeatherFx;
}

export const DEFAULT_CITY = '北京';
export const WEATHER_REFRESH_MS = 60 * 60 * 1000;
const GEO_TIMEOUT_MS = 12_000;

const WMO: Record<number, WeatherMeta> = {
  0: { label: '晴朗', emoji: '☀️', mood: 'sunny', fx: 'clear' },
  1: { label: '大部晴朗', emoji: '🌤️', mood: 'sunny', fx: 'mainly-clear' },
  2: { label: '局部多云', emoji: '⛅', mood: 'cloudy', fx: 'partly-cloudy' },
  3: { label: '阴天', emoji: '☁️', mood: 'cloudy', fx: 'overcast' },
  45: { label: '雾', emoji: '🌫️', mood: 'fog', fx: 'fog' },
  48: { label: '雾凇', emoji: '🌫️', mood: 'fog', fx: 'rime-fog' },
  51: { label: '小毛毛雨', emoji: '🌦️', mood: 'rain', fx: 'drizzle-light' },
  53: { label: '毛毛雨', emoji: '🌦️', mood: 'rain', fx: 'drizzle' },
  55: { label: '大毛毛雨', emoji: '🌧️', mood: 'rain', fx: 'drizzle-heavy' },
  61: { label: '小雨', emoji: '🌧️', mood: 'rain', fx: 'rain-light' },
  63: { label: '中雨', emoji: '🌧️', mood: 'rain', fx: 'rain-moderate' },
  65: { label: '大雨', emoji: '⛈️', mood: 'storm', fx: 'rain-heavy' },
  71: { label: '小雪', emoji: '🌨️', mood: 'snow', fx: 'snow-light' },
  73: { label: '中雪', emoji: '❄️', mood: 'snow', fx: 'snow-moderate' },
  75: { label: '大雪', emoji: '❄️', mood: 'snow', fx: 'snow-heavy' },
  80: { label: '阵雨', emoji: '🌦️', mood: 'rain', fx: 'showers-light' },
  81: { label: '中阵雨', emoji: '🌧️', mood: 'rain', fx: 'showers-moderate' },
  82: { label: '强阵雨', emoji: '⛈️', mood: 'storm', fx: 'showers-heavy' },
  95: { label: '雷暴', emoji: '⛈️', mood: 'storm', fx: 'thunderstorm' },
  96: { label: '雷暴冰雹', emoji: '⛈️', mood: 'storm', fx: 'thunder-hail' },
  99: { label: '强雷暴冰雹', emoji: '⛈️', mood: 'storm', fx: 'thunder-hail-severe' },
};

export function weatherInfo(code: number): WeatherMeta {
  return WMO[code] ?? { label: '未知', emoji: '🌡️', mood: 'cloudy', fx: 'overcast' };
}

/** 概览配色：晴亮蓝 / 一般蓝 / 阴雨雪深蓝 */
export function heroTone(fx: WeatherFx): 'bright' | 'medium' | 'dark' {
  if (
    fx === 'clear' ||
    fx === 'mainly-clear' ||
    fx === 'snow-light' ||
    fx === 'snow-moderate'
  ) {
    return 'bright';
  }
  if (
    fx === 'rain-heavy' ||
    fx === 'thunderstorm' ||
    fx === 'thunder-hail' ||
    fx === 'thunder-hail-severe' ||
    fx === 'showers-heavy' ||
    fx === 'overcast'
  ) {
    return 'dark';
  }
  return 'medium';
}

export function windDirLabel(deg: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return `${dirs[i]}风`;
}

export function dressIndex(temp: number, code: number): { label: string; tip: string } {
  const snowy = code >= 71 && code <= 77;
  const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;

  if (snowy || temp <= -5) return { label: '严寒', tip: '羽绒服、帽子手套' };
  if (temp <= 5) return { label: '寒冷', tip: '厚外套、围巾' };
  if (temp <= 12) return { label: '偏冷', tip: '夹克、长袖' };
  if (temp <= 18) return { label: '舒适', tip: '薄外套或长袖' };
  if (temp <= 25) return { label: '温暖', tip: rainy ? '短袖 + 雨具' : '短袖、薄裤' };
  if (temp <= 30) return { label: '较热', tip: '轻薄透气衣物' };
  return { label: '炎热', tip: '防晒、补水、短袖' };
}

export function aqiInfo(aqi: number | null): {
  label: string;
  level: WeatherSnapshot['aqiLevel'];
} {
  if (aqi == null || Number.isNaN(aqi)) return { label: '暂无数据', level: 'unknown' };
  const v = Math.round(aqi);
  if (v <= 50) return { label: `${v} 优`, level: 'good' };
  if (v <= 100) return { label: `${v} 良`, level: 'moderate' };
  if (v <= 150) return { label: `${v} 轻度污染`, level: 'unhealthy' };
  if (v <= 200) return { label: `${v} 中度污染`, level: 'unhealthy' };
  return { label: `${v} 重度污染`, level: 'hazardous' };
}

function dayLabel(_dateStr: string, index: number): string {
  if (index === 0) return '今天';
  if (index === 1) return '明天';
  if (index === 2) return '后天';
  if (index === 3) return '大后天';
  return `第${index + 1}天`;
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function datePart(iso: string): string {
  return iso.slice(0, 10);
}

export function getGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: GEO_TIMEOUT_MS,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ label: string; name: string }> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}` +
    '&language=zh&count=1';
  const res = await fetch(url);
  const data = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string }[];
  };
  const hit = data.results?.[0];
  if (!hit) return { label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, name: DEFAULT_CITY };
  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(' · ');
  return { label, name: hit.name };
}

export async function geocodeCity(name: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }[];
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(' · ');
  return { lat: hit.latitude, lon: hit.longitude, label };
}

type HourlyRow = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
};

function indicesForDate(times: string[], date: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (datePart(times[i]) === date) out.push(i);
  }
  return out;
}

function pickHourIndex(times: string[], date: string, mode: 'now' | 'noon'): number {
  const indices = indicesForDate(times, date);
  if (!indices.length) return 0;

  if (mode === 'noon') {
    let best = indices[0];
    let bestDiff = Infinity;
    for (const i of indices) {
      const h = new Date(times[i]).getHours();
      const diff = Math.abs(h - 12);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  const now = Date.now();
  let best = indices[0];
  let bestDiff = Infinity;
  for (const i of indices) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function buildSnapshot(
  hourly: HourlyRow,
  index: number,
  airByTime: Map<string, AirQualityHour>
): WeatherSnapshot {
  const t = hourly.temperature_2m[index] ?? 0;
  const code = hourly.weather_code[index] ?? 0;
  const dress = dressIndex(Math.round(t), code);
  const observedAt = hourly.time[index];
  const air = airByTime.get(observedAt);
  const aqi = air?.aqi ?? null;
  const pm25Raw = air?.pm25 ?? null;
  const pm25 = pm25Raw != null ? Math.round(pm25Raw * 10) / 10 : null;
  const aqiMeta = aqiInfo(aqi);

  return {
    observedAt,
    hourLabel: hourLabel(observedAt),
    temp: Math.round(t),
    feelsLike: Math.round(hourly.apparent_temperature[index] ?? t),
    humidity: Math.round(hourly.relative_humidity_2m[index] ?? 0),
    windSpeed: Math.round(hourly.wind_speed_10m[index] ?? 0),
    windDirection: Math.round(hourly.wind_direction_10m[index] ?? 0),
    windDirLabel: windDirLabel(hourly.wind_direction_10m[index] ?? 0),
    precipProb: Math.round(hourly.precipitation_probability[index] ?? 0),
    precipitation: Math.round((hourly.precipitation[index] ?? 0) * 10) / 10,
    weatherCode: code,
    dressIndex: dress.label,
    dressTip: dress.tip,
    aqi,
    aqiLabel: aqiMeta.label,
    aqiLevel: aqiMeta.level,
    pm25,
  };
}

interface AirQualityHour {
  aqi: number | null;
  pm25: number | null;
}

async function fetchAirQualityMap(lat: number, lon: number): Promise<Map<string, AirQualityHour>> {
  const map = new Map<string, AirQualityHour>();
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      '&hourly=us_aqi,pm2_5&timezone=auto&forecast_days=4';
    const res = await fetch(url);
    const data = (await res.json()) as {
      hourly?: { time: string[]; us_aqi: (number | null)[]; pm2_5: (number | null)[] };
    };
    const hourly = data.hourly;
    if (!hourly) return map;
    hourly.time.forEach((time, i) => {
      map.set(time, {
        aqi: hourly.us_aqi[i] ?? null,
        pm25: hourly.pm2_5[i] ?? null,
      });
    });
  } catch {
    /* 空气质量可选 */
  }
  return map;
}

export async function fetchWeatherBundle(lat: number, lon: number): Promise<WeatherBundle> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max' +
    '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m' +
    '&timezone=auto&forecast_days=4';

  const [forecastRes, airMap] = await Promise.all([
    fetch(forecastUrl),
    fetchAirQualityMap(lat, lon),
  ]);

  const data = (await forecastRes.json()) as {
    timezone: string;
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
    };
    hourly: HourlyRow;
  };

  const { daily, hourly } = data;
  const todayDate = daily.time[0];

  const days: WeatherDay[] = daily.time.map((date, i) => {
    const dayIndices = indicesForDate(hourly.time, date);
    const humidityAvg =
      dayIndices.length > 0
        ? Math.round(
            dayIndices.reduce((s, idx) => s + (hourly.relative_humidity_2m[idx] ?? 0), 0) /
              dayIndices.length
          )
        : 0;
    const precipProbMax =
      dayIndices.length > 0
        ? Math.max(...dayIndices.map((idx) => hourly.precipitation_probability[idx] ?? 0))
        : 0;

    const hourMode = date === todayDate ? 'now' : 'noon';
    const hourIdx = pickHourIndex(hourly.time, date, hourMode);

    return {
      date,
      label: dayLabel(date, i),
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      weatherCode: hourly.weather_code[hourIdx] ?? daily.weather_code[i],
      precipitation: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
      windMax: Math.round(daily.wind_speed_10m_max[i]),
      humidityAvg,
      precipProbMax: Math.round(precipProbMax),
      snapshot: buildSnapshot(hourly, hourIdx, airMap),
    };
  });

  return {
    days,
    fetchedAt: Date.now(),
    timezone: data.timezone,
  };
}

/** @deprecated 使用 fetchWeatherBundle */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherDay[]> {
  const bundle = await fetchWeatherBundle(lat, lon);
  return bundle.days;
}
