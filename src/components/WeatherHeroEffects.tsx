import { weatherInfo, type WeatherFx } from '../utils/weather';
import './WeatherHeroEffects.css';

interface Props {
  weatherCode: number;
}

function SunRays({ intensity }: { intensity: 'full' | 'soft' | 'peek' }) {
  const rayCount = intensity === 'full' ? 12 : intensity === 'soft' ? 8 : 6;
  return (
    <>
      <div className={`fx-sun-glow fx-sun-glow--${intensity}`} />
      <div className={`fx-sun-rays fx-sun-rays--${intensity}`}>
        {Array.from({ length: rayCount }, (_, i) => (
          <span key={i} className="fx-sun-ray" style={{ transform: `rotate(${i * (360 / rayCount)}deg)` }} />
        ))}
      </div>
    </>
  );
}

function CloudDrift({ density }: { density: 'light' | 'normal' | 'heavy' }) {
  return (
    <div className={`fx-clouds fx-clouds--${density}`}>
      <span className="fx-cloud fx-cloud-1" />
      <span className="fx-cloud fx-cloud-2" />
      {(density === 'normal' || density === 'heavy') && <span className="fx-cloud fx-cloud-3" />}
      {density === 'heavy' && <span className="fx-cloud fx-cloud-4" />}
    </div>
  );
}

function DrizzleParticles({ variant }: { variant: 'light' | 'normal' | 'heavy' }) {
  const config = {
    light: { count: 22, className: 'fx-drizzle-particle light' },
    normal: { count: 32, className: 'fx-drizzle-particle' },
    heavy: { count: 44, className: 'fx-drizzle-particle heavy' },
  }[variant];

  return (
    <>
      {Array.from({ length: config.count }, (_, i) => (
        <span
          key={i}
          className={config.className}
          style={{
            left: `${(i * 29) % 97}%`,
            animationDelay: `${(i % 14) * 0.12}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </>
  );
}

function RainDrops({
  variant,
}: {
  variant: 'light' | 'moderate' | 'heavy' | 'storm';
}) {
  const config = {
    light: { count: 22, className: 'fx-rain-drop light' },
    moderate: { count: 34, className: 'fx-rain-drop' },
    heavy: { count: 46, className: 'fx-rain-drop heavy' },
    storm: { count: 56, className: 'fx-rain-drop storm' },
  }[variant];

  return (
    <>
      {Array.from({ length: config.count }, (_, i) => (
        <span
          key={i}
          className={config.className}
          style={{
            left: `${(i * 31) % 98}%`,
            animationDelay: `${(i % 12) * 0.06}s`,
            animationDuration: `${0.52 + (i % 6) * 0.07}s`,
            opacity: 0.3 + (i % 5) * 0.12,
          }}
        />
      ))}
    </>
  );
}

function Snowflakes({ variant }: { variant: 'light' | 'moderate' | 'heavy' }) {
  const config = {
    light: { count: 16, minDur: 3.4, sizeBase: 8 },
    moderate: { count: 26, minDur: 2.6, sizeBase: 10 },
    heavy: { count: 38, minDur: 1.9, sizeBase: 12 },
  }[variant];

  return (
    <>
      {Array.from({ length: config.count }, (_, i) => (
        <span
          key={i}
          className={`fx-snowflake fx-snowflake--${variant}`}
          style={{
            left: `${(i * 19) % 95}%`,
            animationDelay: `${(i % 11) * 0.28}s`,
            animationDuration: `${config.minDur + (i % 5) * 0.45}s`,
            fontSize: `${config.sizeBase + (i % 4) * 3}px`,
          }}
        >
          ❄
        </span>
      ))}
    </>
  );
}

function Hailstones({ variant }: { variant: 'moderate' | 'severe' }) {
  const count = variant === 'severe' ? 20 : 12;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`fx-hailstone fx-hailstone--${variant}`}
          style={{
            left: `${(i * 41) % 94}%`,
            animationDelay: `${(i % 8) * 0.11}s`,
            animationDuration: `${0.65 + (i % 4) * 0.12}s`,
          }}
        />
      ))}
    </>
  );
}

function Lightning({ variant }: { variant: 'normal' | 'frequent' | 'severe' }) {
  return <span className={`fx-lightning fx-lightning--${variant}`} />;
}

function FogLayers({ variant }: { variant: 'fog' | 'rime' }) {
  return (
    <div className={`fx-fog fx-fog--${variant}`}>
      <span className="fx-fog-layer fx-fog-1" />
      <span className="fx-fog-layer fx-fog-2" />
      <span className="fx-fog-layer fx-fog-3" />
      {variant === 'rime' && <span className="fx-rime-sparkle" />}
    </div>
  );
}

function ShowersLayer({
  rainVariant,
  pulseSpeed,
}: {
  rainVariant: 'light' | 'moderate' | 'heavy';
  pulseSpeed: 'slow' | 'normal' | 'fast';
}) {
  return (
    <div className={`fx-showers fx-showers--${pulseSpeed}`}>
      <RainDrops variant={rainVariant === 'light' ? 'light' : rainVariant === 'moderate' ? 'moderate' : 'heavy'} />
    </div>
  );
}

function renderFx(fx: WeatherFx) {
  switch (fx) {
    case 'clear':
      return <SunRays intensity="full" />;
    case 'mainly-clear':
      return (
        <>
          <SunRays intensity="soft" />
          <CloudDrift density="light" />
        </>
      );
    case 'partly-cloudy':
      return (
        <>
          <SunRays intensity="peek" />
          <CloudDrift density="normal" />
        </>
      );
    case 'overcast':
      return <CloudDrift density="heavy" />;
    case 'fog':
      return <FogLayers variant="fog" />;
    case 'rime-fog':
      return <FogLayers variant="rime" />;
    case 'drizzle-light':
      return (
        <>
          <CloudDrift density="light" />
          <DrizzleParticles variant="light" />
        </>
      );
    case 'drizzle':
      return (
        <>
          <CloudDrift density="normal" />
          <DrizzleParticles variant="normal" />
        </>
      );
    case 'drizzle-heavy':
      return (
        <>
          <CloudDrift density="heavy" />
          <DrizzleParticles variant="heavy" />
        </>
      );
    case 'rain-light':
      return (
        <>
          <CloudDrift density="light" />
          <RainDrops variant="light" />
        </>
      );
    case 'rain-moderate':
      return (
        <>
          <CloudDrift density="normal" />
          <RainDrops variant="moderate" />
        </>
      );
    case 'rain-heavy':
      return (
        <>
          <CloudDrift density="heavy" />
          <RainDrops variant="heavy" />
        </>
      );
    case 'snow-light':
      return (
        <>
          <CloudDrift density="light" />
          <Snowflakes variant="light" />
        </>
      );
    case 'snow-moderate':
      return (
        <>
          <CloudDrift density="normal" />
          <Snowflakes variant="moderate" />
        </>
      );
    case 'snow-heavy':
      return (
        <>
          <CloudDrift density="heavy" />
          <Snowflakes variant="heavy" />
        </>
      );
    case 'showers-light':
      return (
        <>
          <CloudDrift density="normal" />
          <ShowersLayer rainVariant="light" pulseSpeed="slow" />
        </>
      );
    case 'showers-moderate':
      return (
        <>
          <CloudDrift density="normal" />
          <ShowersLayer rainVariant="moderate" pulseSpeed="normal" />
        </>
      );
    case 'showers-heavy':
      return (
        <>
          <CloudDrift density="heavy" />
          <ShowersLayer rainVariant="heavy" pulseSpeed="fast" />
        </>
      );
    case 'thunderstorm':
      return (
        <>
          <CloudDrift density="heavy" />
          <RainDrops variant="storm" />
          <Lightning variant="normal" />
        </>
      );
    case 'thunder-hail':
      return (
        <>
          <CloudDrift density="heavy" />
          <RainDrops variant="storm" />
          <Hailstones variant="moderate" />
          <Lightning variant="frequent" />
        </>
      );
    case 'thunder-hail-severe':
      return (
        <>
          <CloudDrift density="heavy" />
          <RainDrops variant="storm" />
          <Hailstones variant="severe" />
          <Lightning variant="severe" />
        </>
      );
    default:
      return <CloudDrift density="normal" />;
  }
}

export default function WeatherHeroEffects({ weatherCode }: Props) {
  const fx = weatherInfo(weatherCode).fx;
  return (
    <div className={`weather-fx weather-fx--${fx}`} aria-hidden>
      {renderFx(fx)}
    </div>
  );
}
