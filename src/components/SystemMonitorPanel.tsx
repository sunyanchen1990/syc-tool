import { useEffect, useState } from 'react';
import type { PanelActivityProps, SystemStatsSnapshot } from '../types';
import { formatBps, formatBytes } from '../utils/formatBytes';
import './SystemMonitorPanel.css';

const POLL_MS = 1500;

function MetricBar({
  label,
  value,
  percent,
  detail,
}: {
  label: string;
  value: string;
  percent: number;
  detail?: string;
}) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="monitor-metric glass-card">
      <div className="monitor-metric-head">
        <span className="monitor-metric-label">{label}</span>
        <span className="monitor-metric-value">{value}</span>
      </div>
      <div className="monitor-bar-track">
        <div className="monitor-bar-fill" style={{ width: `${p}%` }} />
      </div>
      {detail && <p className="monitor-metric-detail">{detail}</p>}
    </div>
  );
}

export default function SystemMonitorPanel({ isActive = true }: PanelActivityProps) {
  const [stats, setStats] = useState<SystemStatsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const api = window.deskMini?.system;
    if (!api) {
      setError('请在桌面版 SYC-TOOL 中打开本页');
      return;
    }
    setAvailable(true);
    if (!isActive) return;

    let alive = true;

    const tick = async () => {
      try {
        const snap = await api.getSnapshot();
        if (alive) {
          setStats(snap);
          setError('');
        }
      } catch {
        if (alive) setError('读取系统信息失败');
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [isActive]);

  if (!available) {
    return (
      <div className="monitor-panel">
        <h2 className="panel-title">系统状态</h2>
        <p className="monitor-error">{error || '加载中…'}</p>
      </div>
    );
  }

  return (
    <div className="monitor-panel">
      <h2 className="panel-title">系统状态</h2>
      <p className="panel-subtitle">实时刷新 · 约每 {POLL_MS / 1000} 秒</p>

      {error && <p className="monitor-error">{error}</p>}

      {stats && (
        <div className="monitor-grid">
          <MetricBar
            label="CPU 使用率"
            value={`${stats.cpu.usage}%`}
            percent={stats.cpu.usage}
            detail={stats.cpu.model}
          />
          <MetricBar
            label="内存"
            value={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
            percent={stats.memory.usedPercent}
            detail={`已用 ${stats.memory.usedPercent}%`}
          />
          <MetricBar
            label={`磁盘 ${stats.disk.mount}`}
            value={`${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}`}
            percent={stats.disk.usedPercent}
            detail={`已用 ${stats.disk.usedPercent}%`}
          />

          <div className="monitor-metric glass-card">
            <div className="monitor-metric-head">
              <span className="monitor-metric-label">网络 ({stats.network.iface})</span>
            </div>
            <div className="monitor-net-row">
              <span>↓ 下载</span>
              <strong>{formatBps(stats.network.downloadBps)}</strong>
            </div>
            <div className="monitor-net-row">
              <span>↑ 上传</span>
              <strong>{formatBps(stats.network.uploadBps)}</strong>
            </div>
          </div>

          <div className="monitor-metric glass-card monitor-battery">
            <div className="monitor-metric-head">
              <span className="monitor-metric-label">电池</span>
              {stats.battery && (
                <span className="monitor-metric-value">
                  {stats.battery.percent}% {stats.battery.isCharging ? '充电中' : ''}
                </span>
              )}
            </div>
            {!stats.battery ? (
              <p className="monitor-metric-detail">未检测到电池（台式机或外接供电）</p>
            ) : (
              <>
                <div className="monitor-bar-track">
                  <div
                    className="monitor-bar-fill monitor-bar-fill--battery"
                    style={{ width: `${stats.battery.percent}%` }}
                  />
                </div>
                <div className="monitor-battery-grid">
                  <div>
                    <span className="monitor-stat-label">健康度</span>
                    <strong>
                      {stats.battery.healthPercent != null
                        ? `${stats.battery.healthPercent}%`
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="monitor-stat-label">循环次数</span>
                    <strong>
                      {stats.battery.cycleCount != null
                        ? stats.battery.cycleCount.toLocaleString('zh-CN')
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="monitor-stat-label">剩余时间</span>
                    <strong>
                      {stats.battery.timeRemaining != null && stats.battery.timeRemaining >= 0
                        ? `${Math.round(stats.battery.timeRemaining)} 分钟`
                        : '—'}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
