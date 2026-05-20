import { useCallback, useEffect, useState } from 'react';
import type { WallpaperListItem } from '../types';
import './WallpaperPanel.css';

export default function WallpaperPanel(_props: import('../types').PanelActivityProps) {
  const [items, setItems] = useState<WallpaperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const api = window.deskMini?.wallpaper;

  const refresh = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      setItems(await api.list());
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2800);
  };

  const handleUpload = async () => {
    if (!api) return;
    const res = await api.upload();
    if (res.added > 0) {
      showMsg(`已添加 ${res.added} 张壁纸`);
      await refresh();
    }
  };

  const handleSet = async (id: string) => {
    if (!api) return;
    setBusyId(id);
    try {
      await api.setDesktop(id);
      showMsg('已设为 Mac 桌面壁纸');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : '设置失败');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!api || !confirm('确定删除这张壁纸？若当前正在使用，将自动切换桌面壁纸。')) return;
    await api.remove(id);
    await refresh();
    showMsg('已删除');
  };

  if (!api) {
    return (
      <div className="wallpaper-panel">
        <h2 className="panel-title">壁纸</h2>
        <p className="empty-state">请在 Electron 应用中运行以使用壁纸功能</p>
      </div>
    );
  }

  return (
    <div className="wallpaper-panel">
      <div className="wallpaper-header">
        <div>
          <h2 className="panel-title">壁纸</h2>
          <p className="panel-subtitle">上传保存在本机，一键设为 Mac 桌面壁纸</p>
        </div>
        <button type="button" className="btn-primary" onClick={handleUpload}>
          + 上传壁纸
        </button>
      </div>

      {message && <div className="wallpaper-toast">{message}</div>}

      {loading ? (
        <p className="empty-state">加载中…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">还没有壁纸，点击「上传壁纸」从本机选择图片</p>
      ) : (
        <ul className="wallpaper-grid">
          {items.map((item) => (
            <li key={item.id} className="wallpaper-card glass-card">
              <div className="wp-thumb-wrap">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.displayName}
                    className="wp-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="wp-thumb-placeholder">无法预览</div>
                )}
              </div>
              <p className="wp-name" title={item.displayName}>
                {item.displayName}
              </p>
              <div className="wp-actions">
                <button
                  type="button"
                  className="btn-primary wp-set"
                  disabled={busyId === item.id}
                  onClick={() => handleSet(item.id)}
                >
                  {busyId === item.id ? '设置中…' : '设为桌面壁纸'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleDelete(item.id)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
