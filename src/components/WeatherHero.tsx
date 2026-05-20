import type { WeatherDay } from '../types';
import type { WeatherMeta } from '../utils/weather';
import { heroTone, type WeatherFx } from '../utils/weather';
import WeatherHeroEffects from './WeatherHeroEffects';
import './WeatherHero.css';

interface Props {
  day: WeatherDay;
  meta: WeatherMeta;
  mood: string;
  fx: string;
  fetchedAt: number;
  isToday: boolean;
}

function formatUpdated(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WeatherHero({
  day,
  meta,
  mood,
  fx,
  fetchedAt,
  isToday,
}: Props) {
  const s = day.snapshot;
  const tone = heroTone(fx as WeatherFx);

  return (
    <article className={`weather-hero mood-${mood} fx-${fx} tone-${tone}`}>
      <div className="hero-aurora" aria-hidden>
        <span className="aurora-blob aurora-a" />
        <span className="aurora-blob aurora-b" />
        <span className="aurora-blob aurora-c" />
        <span className="hero-ring hero-ring-1" />
        <span className="hero-ring hero-ring-2" />
      </div>

      <div className="hero-bg" />
      <WeatherHeroEffects weatherCode={s.weatherCode} />

      <div className="hero-inner">
        <header className="hero-top">
          <div>
            <p className="hero-day-tag">{day.label}</p>
            <p className="hero-time-tag">
              {isToday ? '此刻' : '午间'} {s.hourLabel}
              <span className="hero-updated"> · 更新 {formatUpdated(fetchedAt)}</span>
            </p>
          </div>
          <div className={`hero-aqi-badge aqi-${s.aqiLevel}`}>
            <span className="hero-aqi-label">US AQI</span>
            <span className="hero-aqi-value">{s.aqi != null ? s.aqi : '—'}</span>
            <span className="hero-aqi-sub">{s.aqiLabel}</span>
            <span className="hero-aqi-pm">
              PM2.5 {s.pm25 != null ? `${s.pm25} µg/m³` : '暂无'}
            </span>
          </div>
        </header>

        <div className="hero-main">
          <div className="hero-icon-orbit">
            <span className="hero-emoji">{meta.emoji}</span>
          </div>

          <div className="hero-temp-block">
            <div className="hero-temp-row">
              <span className="hero-temp-now">{s.temp}</span>
              <span className="hero-temp-unit">°</span>
            </div>
            <p className="hero-condition">{meta.label}</p>
            <p className="hero-feels">
              体感 {s.feelsLike}° · 全天 {day.tempMin}° ~ {day.tempMax}°
            </p>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-icon">💧</span>
            <span className="metric-label">降水概率</span>
            <strong>{s.precipProb}%</strong>
          </div>
          <div className="metric-card">
            <span className="metric-icon">🌧️</span>
            <span className="metric-label">降水量</span>
            <strong>{s.precipitation} mm</strong>
          </div>
          <div className="metric-card">
            <span className="metric-icon">💨</span>
            <span className="metric-label">风力</span>
            <strong>
              {s.windDirLabel} {s.windSpeed} km/h
            </strong>
          </div>
          <div className="metric-card">
            <span className="metric-icon">💦</span>
            <span className="metric-label">湿度</span>
            <strong>{s.humidity}%</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
