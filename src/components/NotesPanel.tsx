import { useCallback, useEffect, useState } from 'react';
import type { Note, PanelActivityProps } from '../types';
import './NotesPanel.css';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeNote(n: Note): Note {
  const updatedAt = n.updatedAt ?? Date.now();
  return {
    ...n,
    createdAt: n.createdAt ?? updatedAt,
    updatedAt,
  };
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKeyFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatNoteYmd(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatNoteYmdTime(ts: number): string {
  const time = new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatNoteYmd(ts)} ${time}`;
}

function formatDayGroupLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' });
  const ymd = `${y}年${m}月${d}日`;

  if (sameCalendarDay(date, now)) return `${ymd} ${weekday}（今天）`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameCalendarDay(date, yesterday)) return `${ymd} ${weekday}（昨天）`;

  return `${ymd} ${weekday}`;
}

function formatNoteDate(ts: number): string {
  return formatNoteYmdTime(ts);
}

interface NoteDayGroup {
  dayKey: string;
  label: string;
  notes: Note[];
}

function groupNotesByDay(notes: Note[]): NoteDayGroup[] {
  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  const map = new Map<string, Note[]>();

  for (const note of sorted) {
    const key = dayKeyFromTs(note.createdAt);
    const bucket = map.get(key);
    if (bucket) bucket.push(note);
    else map.set(key, [note]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, groupNotes]) => ({
      dayKey,
      label: formatDayGroupLabel(dayKey),
      notes: groupNotes,
    }));
}

export default function NotesPanel({ isActive = true }: PanelActivityProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  const persist = useCallback(async (list: Note[]) => {
    if (window.deskMini?.notes) {
      await window.deskMini.notes.save(list);
    } else {
      localStorage.setItem('deskmini-notes', JSON.stringify(list));
    }
  }, []);

  useEffect(() => {
    (async () => {
      let list: Note[] = [];
      if (window.deskMini?.notes) {
        list = await window.deskMini.notes.load();
      } else {
        try {
          list = JSON.parse(localStorage.getItem('deskmini-notes') ?? '[]');
        } catch {
          list = [];
        }
      }
      list = list.map(normalizeNote);
      if (list.length === 0) {
        const now = Date.now();
        const first: Note = {
          id: uid(),
          title: '我的便签',
          content: '',
          createdAt: now,
          updatedAt: now,
        };
        list = [first];
      }
      setNotes(list);
      setActiveId(list[0].id);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!isActive) {
      void persist(notes);
      return;
    }
    const t = setTimeout(() => persist(notes), 400);
    return () => {
      clearTimeout(t);
      void persist(notes);
    };
  }, [notes, loaded, persist, isActive]);

  const addNote = () => {
    const now = Date.now();
    const n: Note = {
      id: uid(),
      title: '新便签',
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (next.length === 0) {
        const now = Date.now();
        const blank: Note = {
          id: uid(),
          title: '我的便签',
          content: '',
          createdAt: now,
          updatedAt: now,
        };
        setActiveId(blank.id);
        return [blank];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const updateActive = (patch: Partial<Pick<Note, 'title' | 'content'>>) => {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === active.id
          ? { ...n, ...patch, updatedAt: Date.now() }
          : n
      )
    );
  };

  if (!loaded) {
    return <div className="empty-state">加载便签…</div>;
  }

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <div>
          <h2 className="panel-title">便签</h2>
          <p className="panel-subtitle">自动保存，随时记录灵感</p>
        </div>
        <button type="button" className="btn-primary" onClick={addNote}>
          + 新建
        </button>
      </div>
      <div className="notes-layout">
        <aside className="notes-list">
          {groupNotesByDay(notes).map((group) => (
            <section key={group.dayKey} className="notes-day-group">
              <h3 className="notes-day-label">{group.label}</h3>
              <ul className="notes-day-items">
                {group.notes.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`note-item ${n.id === active?.id ? 'active' : ''}`}
                      onClick={() => setActiveId(n.id)}
                    >
                      <div className="note-item-head">
                        <span className="note-item-title">{n.title || '无标题'}</span>
                        <span className="note-item-date">{formatNoteYmdTime(n.createdAt)}</span>
                      </div>
                      {n.updatedAt !== n.createdAt && (
                        <span className="note-item-edited">
                          编辑于 {formatNoteYmdTime(n.updatedAt)}
                        </span>
                      )}
                      <span className="note-item-preview">
                        {n.content.slice(0, 40) || '空白便签'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
        {active && (
          <div className="note-editor glass-card">
            <input
              className="note-title-input"
              value={active.title}
              onChange={(e) => updateActive({ title: e.target.value })}
              placeholder="标题"
            />
            <textarea
              className="note-content-input"
              value={active.content}
              onChange={(e) => updateActive({ content: e.target.value })}
              placeholder="写点什么…"
            />
            <div className="note-editor-footer">
              <span className="note-time">
                创建于 {formatNoteDate(active.createdAt)}
                {active.createdAt !== active.updatedAt && (
                  <> · 更新于 {formatNoteDate(active.updatedAt)}</>
                )}
              </span>
              <button
                type="button"
                className="btn-ghost danger"
                onClick={() => deleteNote(active.id)}
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
