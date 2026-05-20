import { contextBridge, ipcRenderer } from 'electron';

export interface WallpaperListItem {
  id: string;
  filename: string;
  displayName: string;
  addedAt: number;
  previewUrl: string | null;
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
  createdAt?: number;
  updatedAt: number;
}

contextBridge.exposeInMainWorld('deskMini', {
  notes: {
    load: (): Promise<Note[]> => ipcRenderer.invoke('notes:load'),
    save: (notes: Note[]): Promise<boolean> => ipcRenderer.invoke('notes:save', notes),
  },
  clipboard: {
    list: (): Promise<ClipboardEntry[]> => ipcRenderer.invoke('clipboard:list'),
    copy: (text: string): Promise<boolean> => ipcRenderer.invoke('clipboard:copy', text),
    clear: (): Promise<boolean> => ipcRenderer.invoke('clipboard:clear'),
    persist: (notes: Note[]) => ipcRenderer.send('clipboard:persist', notes),
    onUpdated: (cb: (entries: ClipboardEntry[]) => void) => {
      const handler = (_: unknown, entries: ClipboardEntry[]) => cb(entries);
      ipcRenderer.on('clipboard:updated', handler);
      return () => ipcRenderer.removeListener('clipboard:updated', handler);
    },
  },
  wallpaper: {
    list: (): Promise<WallpaperListItem[]> => ipcRenderer.invoke('wallpaper:list'),
    upload: (): Promise<{ added: number }> => ipcRenderer.invoke('wallpaper:upload'),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('wallpaper:remove', id),
    setDesktop: (id: string): Promise<boolean> => ipcRenderer.invoke('wallpaper:setDesktop', id),
  },
  background: {
    load: (): Promise<string | null> => ipcRenderer.invoke('background:load'),
    set: (): Promise<string | null> => ipcRenderer.invoke('background:set'),
  },
  system: {
    getSnapshot: () => ipcRenderer.invoke('system:getSnapshot'),
  },
  terminal: {
    getInfo: () => ipcRenderer.invoke('terminal:getInfo'),
    run: (command: string) => ipcRenderer.invoke('terminal:run', command),
    resetCwd: () => ipcRenderer.invoke('terminal:resetCwd'),
    complete: (line: string, history: string[]) =>
      ipcRenderer.invoke('terminal:complete', { line, history }),
  },
});
