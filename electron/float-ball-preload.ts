import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('floatBall', {
  activate: () => ipcRenderer.send('float-ball:activate'),
  moveBy: (dx: number, dy: number) => ipcRenderer.send('float-ball:move-by', { dx, dy }),
  dragEnd: () => ipcRenderer.send('float-ball:drag-end'),
  onAnimateIn: (cb: () => void) => {
    ipcRenderer.on('float-ball:animate-in', () => {
      try {
        cb();
      } catch (err) {
        console.error('[float-ball] animate-in', err);
      }
    });
  },
  onMouseDelta: (cb: (delta: { dx: number; dy: number }) => void) => {
    ipcRenderer.on('float-ball:mouse-delta', (_e, delta: { dx: number; dy: number }) => {
      try {
        cb(delta);
      } catch (err) {
        console.error('[float-ball] mouse-delta', err);
      }
    });
  },
});
