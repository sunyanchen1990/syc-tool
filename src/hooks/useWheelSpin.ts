import { useCallback, useEffect, useRef, useState } from 'react';
import { indexAtPointer, landingRotationDeg, pickRandomIndex, spinProgress } from '../utils/wheel';

export function useWheelSpin(segmentCount: number) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [blur, setBlur] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const rotationRef = useRef(0);
  const rafRef = useRef<number>();
  const highlightTimer = useRef<number>();
  const resultTimer = useRef<number>();

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const clearTimers = useCallback(() => {
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    if (resultTimer.current) window.clearTimeout(resultTimer.current);
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearTimers();
  }, [clearTimers]);

  const resetVisual = useCallback(() => {
    setHighlightIndex(null);
    setShowResult(false);
    setResultLabel(null);
    setBlur(false);
  }, []);

  const spin = useCallback(
    (labels: string[], onDone: (index: number) => void) => {
      if (spinning || segmentCount < 2) return;
      clearTimers();
      resetVisual();

      const target = pickRandomIndex(segmentCount);
      const totalDeg = landingRotationDeg(segmentCount, target);
      const duration = 2000 + Math.random() * 1000;
      const startRot = rotationRef.current;
      const start = performance.now();

      setSpinning(true);
      setBlur(true);

      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const prog = spinProgress(t);
        const current = startRot + totalDeg * prog;
        setRotation(current);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        setSpinning(false);
        setBlur(false);
        const finalIdx = indexAtPointer(current, segmentCount);
        onDone(finalIdx);
        setHighlightIndex(finalIdx);
        setResultLabel(labels[finalIdx] ?? '');
        setShowResult(true);

        highlightTimer.current = window.setTimeout(() => {
          setHighlightIndex(null);
        }, 2000);

        resultTimer.current = window.setTimeout(() => {
          setShowResult(false);
          setResultLabel(null);
        }, 2200);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [spinning, segmentCount, rotation, clearTimers, resetVisual]
  );

  return {
    rotation,
    spinning,
    blur,
    highlightIndex,
    resultLabel,
    showResult,
    spin,
    resetVisual,
  };
}
