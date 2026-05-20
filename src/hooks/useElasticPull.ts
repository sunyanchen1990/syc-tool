import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const SNAP_RATIO = 0.35;

/**
 * 底部抽屉高度：拖拽时只写 DOM，避免每帧 setState 导致卡顿。
 */
export function useForecastDrawer(
  revealHeight: number,
  drawerRef: RefObject<HTMLElement | null>,
  hostRef?: RefObject<HTMLElement | null>
) {
  const [height, setHeight] = useState(0);
  const heightRef = useRef(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const rafRef = useRef<number>();
  const moveRafRef = useRef<number>();
  const pendingHeightRef = useRef(0);

  const setInteracting = useCallback(
    (on: boolean) => {
      hostRef?.current?.classList.toggle('weather-main--interacting', on);
    },
    [hostRef]
  );

  /** 固定抽屉高度，用 translate3d 位移露出，避免改 height 引发布局抖动 */
  const applyDomHeight = useCallback(
    (h: number) => {
      const clamped = Math.round(Math.max(0, Math.min(revealHeight, h)));
      heightRef.current = clamped;
      const el = drawerRef.current;
      if (el) {
        el.style.height = `${revealHeight}px`;
        el.style.transform = `translate3d(0, ${revealHeight - clamped}px, 0)`;
      }
      return clamped;
    },
    [revealHeight, drawerRef]
  );

  const syncReactHeight = useCallback((h: number) => {
    const clamped = applyDomHeight(h);
    setHeight(clamped);
  }, [applyDomHeight]);

  useEffect(() => {
    applyDomHeight(height);
  }, [height, applyDomHeight]);

  const animateTo = useCallback(
    (target: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const from = heightRef.current;
      const clamped = Math.max(0, Math.min(revealHeight, target));
      if (Math.abs(from - clamped) < 0.5) {
        syncReactHeight(clamped);
        setInteracting(false);
        return;
      }
      setInteracting(true);
      const start = performance.now();
      const duration = clamped > from ? 280 : 360;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const easing =
          clamped > from
            ? 1 - Math.pow(1 - t, 2.2)
            : 1 - Math.pow(1 - t, 2.6) * Math.cos(t * Math.PI * 0.6);
        applyDomHeight(from + (clamped - from) * easing);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else {
          syncReactHeight(clamped);
          setInteracting(false);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [revealHeight, applyDomHeight, syncReactHeight, setInteracting]
  );

  /** 卸载主区域或重新加载天气时调用，避免拖拽状态残留导致无法滑动 */
  const resetDragState = useCallback(() => {
    draggingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
  }, []);

  const close = useCallback(() => {
    resetDragState();
    animateTo(0);
  }, [animateTo, resetDragState]);
  const open = useCallback(() => animateTo(revealHeight), [animateTo, revealHeight]);
  const toggle = useCallback(() => {
    if (heightRef.current >= revealHeight * SNAP_RATIO) close();
    else open();
  }, [close, open, revealHeight]);

  const scheduleDragHeight = useCallback(
    (next: number) => {
      pendingHeightRef.current = next;
      if (moveRafRef.current) return;
      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = 0;
        applyDomHeight(pendingHeightRef.current);
      });
    },
    [applyDomHeight]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        '.forecast-card, .weather-expand-bar, .city-search, input, .hero-back-today'
      )
    ) {
      return;
    }
    draggingRef.current = true;
    setInteracting(true);
    startYRef.current = e.clientY;
    startHeightRef.current = heightRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, [setInteracting]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const dy = startYRef.current - e.clientY;
      const next = Math.max(0, Math.min(revealHeight, startHeightRef.current + dy));
      scheduleDragHeight(next);
    },
    [revealHeight, scheduleDragHeight]
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const h = heightRef.current;
    if (h >= revealHeight * SNAP_RATIO) open();
    else close();
    /* open/close 内 animateTo 会接管 interacting；若高度未变则不会动画 */
    if (heightRef.current === h) setInteracting(false);
  }, [revealHeight, open, close, setInteracting]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endDrag();
    },
    [endDrag]
  );

  const onPointerCancel = useCallback(() => endDrag(), [endDrag]);

  const bindWheel = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      let accum = 0;
      let wheelRaf = 0;
      const onWheel = (e: WheelEvent) => {
        if (draggingRef.current) return;
        const inForecast = (e.target as HTMLElement).closest('.weather-forecast-drawer');
        if (inForecast) return;
        e.preventDefault();
        accum += e.deltaY;
        if (wheelRaf) return;
        wheelRaf = requestAnimationFrame(() => {
          wheelRaf = 0;
          if (Math.abs(accum) < 36) return;
          if (accum > 0) open();
          else close();
          accum = 0;
        });
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        el.removeEventListener('wheel', onWheel);
        if (wheelRaf) cancelAnimationFrame(wheelRaf);
      };
    },
    [open, close]
  );

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
    },
    []
  );

  const isOpen = height >= revealHeight * 0.85;

  return {
    drawerHeight: height,
    isOpen,
    open,
    close,
    toggle,
    bindWheel,
    resetDragState,
    pullHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
