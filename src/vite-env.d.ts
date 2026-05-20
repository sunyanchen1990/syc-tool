/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

import type {
  ClipboardEntry,
  Note,
  SystemStatsSnapshot,
  TerminalCompleteResult,
  TerminalInfo,
  TerminalRunResult,
  WallpaperListItem,
} from './types';

declare global {
  interface Window {
    deskMini?: {
      notes: {
        load: () => Promise<Note[]>;
        save: (notes: Note[]) => Promise<boolean>;
      };
      clipboard: {
        list: () => Promise<ClipboardEntry[]>;
        copy: (text: string) => Promise<boolean>;
        clear: () => Promise<boolean>;
        persist: (notes: Note[]) => void;
        onUpdated: (cb: (entries: ClipboardEntry[]) => void) => () => void;
      };
      wallpaper: {
        list: () => Promise<WallpaperListItem[]>;
        upload: () => Promise<{ added: number }>;
        remove: (id: string) => Promise<boolean>;
        setDesktop: (id: string) => Promise<boolean>;
      };
      background: {
        load: () => Promise<string | null>;
        set: () => Promise<string | null>;
      };
      system: {
        getSnapshot: () => Promise<SystemStatsSnapshot>;
      };
      terminal: {
        getInfo: () => Promise<TerminalInfo>;
        run: (command: string) => Promise<TerminalRunResult>;
        resetCwd: () => Promise<string>;
        complete: (line: string, history: string[]) => Promise<TerminalCompleteResult>;
      };
    };
  }
}

export {};
