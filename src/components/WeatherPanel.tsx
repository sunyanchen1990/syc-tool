import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelActivityProps, WeatherDay } from '../types';
import { useForecastDrawer } from '../hooks/useElasticPull';
import {
  DEFAULT_CITY,
  WEATHER_REFRESH_MS,
  fetchWeatherBundle,
  geocodeCity,
  getGeolocation,
  reverseGeocode,
  weatherInfo,
} from '../utils/weather';
import WeatherHero from './WeatherHero';
import './WeatherPanel.css';

const SAVED_CITY_KEY = 'deskmini-city';
/** 底部三卡抽屉完全展开高度（与 CSS 一致） */
const FORECAST_DRAWER_HEIGHT = 172;

export default function WeatherPanel({ isActive = true }: PanelActivityProps) {
  const [cityInput, setCityInput] = useState(() => localStorage.getItem(SAVED_CITY_KEY) ?? '');
  const [locationLabel, setLocationLabel] = useState('');
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const { drawerHeight, isOpen, close, toggle, bindWheel, pullHandlers } =
    useForecastDrawer(FORECAST_DRAWER_HEIGHT, drawerRef, mainRef);

  /** 查询城市会短暂卸载主区域；须在重新挂载后重新绑定滚轮（不能只看 days.length） */
  useEffect(() => {
    if (!isActive || loading || error || !days.length) return;
    const el = mainRef.current;
    if (!el) return;
    return bindWheel(el);
  }, [isActive, bindWheel, loading, error, days.length, fetchedAt]);

  const loadByCoords = useCallback(
    async (lat: number, lon: number, label: string, saveCity?: string) => {
      setError('');
      setLocationLabel(label);
      const bundle = await fetchWeatherBundle(lat, lon);
      setDays(bundle.days);
      setFetchedAt(bundle.fetchedAt);
      coordsRef.current = { lat, lon };
      setSelectedIndex(0);
      close();
      if (saveCity) {
        localStorage.setItem(SAVED_CITY_KEY, saveCity);
        setCityInput(saveCity);
      }
    },
    [close]
  );

  const load = useCallback(
    async (city: string) => {
      close();
      setLoading(true);
      setError('');
      try {
        const geo = await geocodeCity(city.trim() || DEFAULT_CITY);
        if (!geo) {
          setError('未找到该城市，请换个名称试试');
          setDays([]);
          return;
        }
        await loadByCoords(geo.lat, geo.lon, geo.label, city.trim() || DEFAULT_CITY);
      } catch {
        setError('天气加载失败，请检查网络');
      } finally {
        setLoading(false);
      }
    },
    [loadByCoords, close]
  );

  const refreshCurrent = useCallback(async () => {
    const c = coordsRef.current;
    if (!c || !locationLabel) return;
    try {
      const bundle = await fetchWeatherBundle(c.lat, c.lon);
      setDays(bundle.days);
      setFetchedAt(bundle.fetchedAt);
    } catch {
      /* 静默刷新 */
    }
  }, [locationLabel]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const saved = localStorage.getItem(SAVED_CITY_KEY);
        if (saved?.trim()) {
          await load(saved);
          return;
        }
        try {
          const pos = await getGeolocation();
          const { latitude, longitude } = pos.coords;
          const rev = await reverseGeocode(latitude, longitude);
          await loadByCoords(latitude, longitude, rev.label);
          setCityInput(rev.name);
        } catch {
          await load(DEFAULT_CITY);
        }
      } catch {
        setError('天气加载失败，请检查网络');
      } finally {
        setLoading(false);
      }
    })();
  }, [load, loadByCoords]);

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(refreshCurrent, WEATHER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [isActive, refreshCurrent]);

  const selected = days[selectedIndex] ?? days[0];
  const selectedInfo = selected ? weatherInfo(selected.snapshot.weatherCode) : null;
  const selectedMood = selectedInfo?.mood ?? 'cloudy';
  const selectedFx = selectedInfo?.fx ?? 'overcast';
  const upcoming = days.slice(1, 4);

  return (
    <div className="weather-panel">
      <div className="weather-header">
        <div>
          <h2 className="panel-title">天气预报</h2>
          <p className="panel-subtitle">
            {locationLabel || '加载中…'} · 上滑或点击条带展开未来三日 · 每小时更新
          </p>
        </div>
        <form
          className="city-search"
          onSubmit={(e) => {
            e.preventDefault();
            load(cityInput);
          }}
        >
          <input
            className="input-field"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="输入城市，如 上海"
          />
          <button type="submit" className="btn-primary">
            查询
          </button>
        </form>
      </div>

      {loading && (
        <div className="weather-loading">
          <div className="loader-orbit">
            <span>🌍</span>
          </div>
          <p>正在获取天气…</p>
        </div>
      )}

      {error && !loading && <div className="weather-error">{error}</div>}

      {!loading && !error && selected && selectedInfo && (
        <div ref={mainRef} className="weather-main" {...pullHandlers}>
          <section className="weather-hero-zone">
            <div className="weather-hero-shell">
              {selectedIndex > 0 && (
                <button
                  type="button"
                  className="hero-back-today"
                  onClick={() => setSelectedIndex(0)}
                >
                  ← 今天
                </button>
              )}
              <WeatherHero
                key={`${selected.date}-${fetchedAt}`}
                day={selected}
                meta={selectedInfo}
                mood={selectedMood}
                fx={selectedFx}
                fetchedAt={fetchedAt}
                isToday={selectedIndex === 0}
              />
            </div>

          </section>

          <button
            type="button"
            className="weather-expand-bar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? '收起未来三日' : '展开未来三日'}
          >
            <span className="hero-grab-pill" />
            <span className="hero-grab-text">
              {isOpen ? '下滑收起 · 明后三日' : '上滑或点击 · 查看明后三日'}
            </span>
          </button>

          <section
            ref={drawerRef}
            className="weather-forecast-drawer"
            aria-hidden={drawerHeight < 8}
          >
            <div className="forecast-row">
              {upcoming.map((d, i) => {
                const dayIndex = i + 1;
                const info = weatherInfo(d.weatherCode);
                return (
                  <button
                    key={d.date}
                    type="button"
                    className={`forecast-card mood-${info.mood} fx-${info.fx}${
                      selectedIndex === dayIndex ? ' active' : ''
                    }`}
                    onClick={() => setSelectedIndex(dayIndex)}
                  >
                    <span className="fc-day">{d.label}</span>
                    <span className="fc-emoji" aria-hidden>
                      {info.emoji}
                    </span>
                    <span className="fc-desc">{info.label}</span>
                    <span className="fc-precip">降水 {d.precipProbMax}%</span>
                    <span className="fc-temp">
                      <strong>{d.tempMax}°</strong>
                      <span>{d.tempMin}°</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
