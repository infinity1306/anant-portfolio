import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CursorHeroProps,
  DirectionMappingResult,
  FrameMapConfig,
} from './cursorHero.types';
import {
  CURSOR_HERO_PRESETS,
  DEFAULT_CHARACTER_OPTIONS,
  DEFAULT_PRELOAD_OPTIONS,
  DEFAULT_TRACKING_OPTIONS,
  PRESET_CHARACTER_240,
} from './cursorHero.constants';
import {
  drawFittedImage,
  generateFrameUrl,
  getClampedDpr,
  getElementBoundingBox,
} from './cursorHero.utils';
import { calculateCursorFrame } from './cursorHero.mapping';

export interface UseCursorHeroReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLElement>;
  isReady: boolean;
  isInteractive: boolean;
  progress: { loaded: number; total: number; percent: number };
  error: string | null;
  stateRef: React.MutableRefObject<any>;
  hudLabelRef: React.RefObject<HTMLSpanElement>;
  // Debug DOM element references
  debugRefs: {
    xRef: React.RefObject<HTMLSpanElement>;
    yRef: React.RefObject<HTMLSpanElement>;
    angleRef: React.RefObject<HTMLSpanElement>;
    radiusRef: React.RefObject<HTMLSpanElement>;
    primaryDirRef: React.RefObject<HTMLSpanElement>;
    secondaryDirRef: React.RefObject<HTMLSpanElement>;
    weightsRef: React.RefObject<HTMLSpanElement>;
    targetFrameRef: React.RefObject<HTMLSpanElement>;
    displayedFrameRef: React.RefObject<HTMLSpanElement>;
    frameDeltaRef: React.RefObject<HTMLSpanElement>;
    fpsRef: React.RefObject<HTMLSpanElement>;
    drawTimeRef: React.RefObject<HTMLSpanElement>;
    preloadTimeRef: React.RefObject<HTMLSpanElement>;
  };
}

export function useCursorHero(props: CursorHeroProps = {}): UseCursorHeroReturn {
  const {
    frames = '/character-frames',
    frameCount = 240,
    framePrefix = 'frame_',
    frameExtension = 'webp',
    zeroPadding = 3,
    preset = 'character-240',
    frameMap: customFrameMap,
    tracking: userTracking,
    character: userCharacter,
    preload: userPreload,
    preloadConcurrency,
    onLoad,
    onProgress,
    onError,
    onFrameChange,
  } = props;

  const propsRef = useRef(props);
  propsRef.current = props;

  // Resolve Configuration Objects
  const tracking = { ...DEFAULT_TRACKING_OPTIONS, ...userTracking };
  const character = { ...DEFAULT_CHARACTER_OPTIONS, ...userCharacter };
  const preloadConfig =
    typeof userPreload === 'object'
      ? { ...DEFAULT_PRELOAD_OPTIONS, ...userPreload }
      : {
          ...DEFAULT_PRELOAD_OPTIONS,
          enabled: userPreload !== false,
          concurrency: preloadConcurrency ?? DEFAULT_PRELOAD_OPTIONS.concurrency,
        };

  // Resolve Frame Map
  const activeFrameMap: FrameMapConfig =
    customFrameMap || CURSOR_HERO_PRESETS[preset] || PRESET_CHARACTER_240;

  // Primary Element References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const hudLabelRef = useRef<HTMLSpanElement>(null);

  // Debug HUD DOM references for zero-re-render inspection
  const debugRefs = {
    xRef: useRef<HTMLSpanElement>(null),
    yRef: useRef<HTMLSpanElement>(null),
    angleRef: useRef<HTMLSpanElement>(null),
    radiusRef: useRef<HTMLSpanElement>(null),
    primaryDirRef: useRef<HTMLSpanElement>(null),
    secondaryDirRef: useRef<HTMLSpanElement>(null),
    weightsRef: useRef<HTMLSpanElement>(null),
    targetFrameRef: useRef<HTMLSpanElement>(null),
    displayedFrameRef: useRef<HTMLSpanElement>(null),
    frameDeltaRef: useRef<HTMLSpanElement>(null),
    fpsRef: useRef<HTMLSpanElement>(null),
    drawTimeRef: useRef<HTMLSpanElement>(null),
    preloadTimeRef: useRef<HTMLSpanElement>(null),
  };

  // Cached decoded ImageBitmap array in GPU memory
  const bitmapsRef = useRef<(ImageBitmap | null)[]>(new Array(frameCount).fill(null));

  // Mutable High-Frequency State (No React re-renders during pointer tracking)
  const stateRef = useRef({
    targetNormX: 0,
    targetNormY: 0,
    currentNormX: 0,
    currentNormY: 0,
    targetFrame: 0,
    displayedFrame: 0,
    lastContinuousFrame: 0,
    lastRenderedFrameIndex: -1,
    lastDrawnFrameIndex: -1,
    allFramesReady: false,
    isPointerActive: false,
    prefersReducedMotion: false,
    isTouchDevice: false,
    containerRect: { left: 0, top: 0, width: 1, height: 1 },
    lastFrameTime: 0,
    fpsLastTime: 0,
    frameCount: 0,
    currentFps: 60,
    lastDrawTime: 0,
    preloadDuration: 0,
    lastPrimaryDir: 'CENTER' as any,
    sector3IsUpperLeft: false,
  });

  // Reactive UI State (strictly for initialization & progress)
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isInteractive, setIsInteractive] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number }>({
    loaded: 0,
    total: frameCount,
    percent: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Helper to format frame URLs
  const getUrl = useCallback(
    (index: number) => {
      return generateFrameUrl(frames, index, framePrefix, frameExtension, zeroPadding);
    },
    [frames, framePrefix, frameExtension, zeroPadding]
  );

  useEffect(() => {
    let isCancelled = false;
    const state = stateRef.current;

    // Immediately expose debug handle on window
    if (typeof window !== 'undefined') {
      const debugObj = {
        state,
        bitmaps: bitmapsRef.current,
        totalFrames: frameCount,
        getDecodedCount: () => bitmapsRef.current.filter(Boolean).length,
        isReady: () => state.allFramesReady,
      };
      (window as any).__cursorHeroDebug = debugObj;
      (window as any).__cursorCharacterDebug = debugObj;
    }

    // 1. Accessibility & Touch Detection
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    const updateEnv = () => {
      state.prefersReducedMotion = reducedMotionQuery.matches;
      state.isTouchDevice = touchQuery.matches;
    };

    updateEnv();
    reducedMotionQuery.addEventListener('change', updateEnv);
    touchQuery.addEventListener('change', updateEnv);

    // 2. Cache Bounding Box to prevent layout thrashing on pointermove
    const updateCachedRect = () => {
      const el = containerRef.current;
      state.containerRect = getElementBoundingBox(el, tracking.trackViewport);
    };

    updateCachedRect();
    window.addEventListener('resize', updateCachedRect, { passive: true });
    window.addEventListener('scroll', updateCachedRect, { passive: true });

    // 3. Pointer Tracking Listener
    const onPointerMove = (e: PointerEvent) => {
      if (!tracking.enabled || state.prefersReducedMotion || state.isTouchDevice) return;

      const rect = state.containerRect;
      const rawX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const rawY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      const maxR = tracking.maxRadius ?? 1.0;
      state.targetNormX = Math.max(-maxR, Math.min(maxR, rawX));
      state.targetNormY = Math.max(-maxR, Math.min(maxR, rawY));
      state.isPointerActive = true;
    };

    const onPointerLeave = () => {
      state.isPointerActive = false;
      if (tracking.returnToNeutral) {
        state.targetNormX = 0;
        state.targetNormY = 0;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });

    // 4. Mobile / Reduced Motion Early Exit (Preload only mobileFrame)
    if (state.prefersReducedMotion || state.isTouchDevice) {
      const mobileIdx = tracking.mobileFrame ?? 0;
      (async () => {
        try {
          const res = await fetch(getUrl(mobileIdx));
          const blob = await res.blob();
          const bitmap = await createImageBitmap(blob);
          if (isCancelled) {
            bitmap.close();
            return;
          }
          bitmapsRef.current[mobileIdx] = bitmap;
          state.allFramesReady = true;

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
              drawFittedImage(ctx, bitmap, canvas.width, canvas.height, character);
            }
          }
          setIsReady(true);
          setIsInteractive(false);
          onLoad?.();
        } catch (err: any) {
          setError(err?.message || 'Failed to load mobile frame');
          onError?.(err);
        }
      })();

      return () => {
        isCancelled = true;
        reducedMotionQuery.removeEventListener('change', updateEnv);
        touchQuery.removeEventListener('change', updateEnv);
        window.removeEventListener('resize', updateCachedRect);
        window.removeEventListener('scroll', updateCachedRect);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('mouseleave', onPointerLeave);
        bitmapsRef.current.forEach((b) => b?.close());
        bitmapsRef.current = [];
      };
    }

    // 5. Desktop Concurrent Preloader Loop
    const preloadStartTime = performance.now();
    let animId: number;
    let lastLabel = '';
    const MAX_CONCURRENT = preloadConfig.concurrency || 8;
    const MAX_RETRIES = preloadConfig.maxRetries ?? 2;
    let decodedCount = 0;
    let retriedCount = 0;
    let progressUpdateScheduled = false;

    const scheduleProgressUpdate = () => {
      if (progressUpdateScheduled) return;
      progressUpdateScheduled = true;
      requestAnimationFrame(() => {
        progressUpdateScheduled = false;
        if (!isCancelled) {
          const p = {
            loaded: decodedCount,
            total: frameCount,
            percent: Math.min(100, Math.floor((decodedCount / frameCount) * 100)),
          };
          setProgress(p);
          propsRef.current.onProgress?.(p);
        }
      });
    };

    const loadFrameWithRetry = async (index: number, retriesLeft = MAX_RETRIES): Promise<boolean> => {
      while (retriesLeft >= 0) {
        if (isCancelled) return false;
        try {
          const response = await fetch(getUrl(index));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          if (isCancelled) return false;
          const bitmap = await createImageBitmap(blob);
          if (isCancelled) {
            bitmap.close();
            return false;
          }
          bitmapsRef.current[index] = bitmap;
          decodedCount++;
          scheduleProgressUpdate();
          return true;
        } catch (err) {
          retriedCount++;
          if (retriesLeft === 0) {
            console.error(`[CursorHero] Failed frame ${index} after retries:`, err);
            return false;
          }
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 60));
        }
      }
      return false;
    };

    // Preload Sequence Execution
    const executePreload = async () => {
      // Load Frame 0 first for instant baseline
      const frame0Success = await loadFrameWithRetry(0);
      if (isCancelled) return;

      if (frame0Success && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        const b0 = bitmapsRef.current[0];
        if (ctx && b0) {
          drawFittedImage(ctx, b0, canvasRef.current.width, canvasRef.current.height, character);
          state.lastDrawnFrameIndex = 0;
          state.lastRenderedFrameIndex = 0;
        }
      }

      // Concurrency queue for remaining frames
      const queue: number[] = [];
      for (let i = 1; i < frameCount; i++) {
        queue.push(i);
      }

      const worker = async () => {
        while (queue.length > 0) {
          if (isCancelled) return;
          const nextIdx = queue.shift();
          if (nextIdx === undefined) break;
          await loadFrameWithRetry(nextIdx);
        }
      };

      const workers = Array.from({ length: MAX_CONCURRENT }, () => worker());
      await Promise.all(workers);

      if (isCancelled) return;

      const allReady = bitmapsRef.current.every((bitmap) => bitmap !== null);
      const preloadDuration = performance.now() - preloadStartTime;
      state.preloadDuration = preloadDuration;

      if (import.meta.env.DEV) {
        console.log(
          `[CursorHero] Loaded and decoded ${decodedCount}/${frameCount} character frames in ${preloadDuration.toFixed(
            0
          )}ms (retried: ${retriedCount})`
        );
      }

      if (!allReady) {
        const errMsg = 'Some frames failed to decode. Please reload.';
        setError(errMsg);
        propsRef.current.onError?.(errMsg);
        return;
      }

      // Mark System Ready
      state.allFramesReady = true;
      setIsReady(true);
      setIsInteractive(true);
      const finalProgress = { loaded: frameCount, total: frameCount, percent: 100 };
      setProgress(finalProgress);
      propsRef.current.onProgress?.(finalProgress);
      propsRef.current.onLoad?.();

      // Expose debug handle on window for automated verification
      if (typeof window !== 'undefined') {
        const debugObj = {
          state,
          bitmaps: bitmapsRef.current,
          totalFrames: frameCount,
          getDecodedCount: () => bitmapsRef.current.filter(Boolean).length,
          isReady: () => state.allFramesReady,
        };
        (window as any).__cursorHeroDebug = debugObj;
        (window as any).__cursorCharacterDebug = debugObj;
      }

      // Apply initial captured pointer coordinates immediately
      state.currentNormX = state.targetNormX;
      state.currentNormY = state.targetNormY;
      const initialMapping = calculateCursorFrame({
        x: state.currentNormX,
        y: state.currentNormY,
        deadZone: tracking.deadZone,
        frameCount,
        frameMap: activeFrameMap,
      });

      state.targetFrame = initialMapping.frameContinuous;
      state.displayedFrame = initialMapping.frameContinuous;
      const initialFrameIndex = initialMapping.frameIndex;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        const initBitmap = bitmapsRef.current[initialFrameIndex] || bitmapsRef.current[0];
        if (ctx && initBitmap) {
          drawFittedImage(ctx, initBitmap, canvas.width, canvas.height, character);
          state.lastDrawnFrameIndex = initialFrameIndex;
          state.lastRenderedFrameIndex = initialFrameIndex;
        }
      }

      // 6. High-Performance rAF Animation Loop
      const speed = tracking.responseSpeed ?? 24.0;
      const animationLoop = (timeNow: number) => {
        if (!state.lastFrameTime) {
          state.lastFrameTime = timeNow;
          state.fpsLastTime = timeNow;
        }

        // FPS Instrumentation (sliding 500ms window)
        state.frameCount++;
        if (timeNow - state.fpsLastTime >= 500) {
          state.currentFps = Math.round((state.frameCount * 1000) / (timeNow - state.fpsLastTime));
          state.frameCount = 0;
          state.fpsLastTime = timeNow;
        }

        const deltaTime = Math.min((timeNow - state.lastFrameTime) / 1000, 0.1);
        state.lastFrameTime = timeNow;

        // Exponential smoothing for cursor coordinate vectors
        const coordSmoothing = 1 - Math.exp(-speed * deltaTime);
        state.currentNormX += (state.targetNormX - state.currentNormX) * coordSmoothing;
        state.currentNormY += (state.targetNormY - state.currentNormY) * coordSmoothing;

        // Mathematical Directional Frame Mapping
        const mapping = calculateCursorFrame({
          x: state.currentNormX,
          y: state.currentNormY,
          deadZone: tracking.deadZone,
          frameCount,
          frameMap: activeFrameMap,
          lastPrimaryDir: state.lastPrimaryDir,
          sector3IsUpperLeft: state.sector3IsUpperLeft,
        });

        state.lastPrimaryDir = mapping.region;

        // Small hysteresis on target continuous frame
        const hysteresis = 0.25;
        let continuousTarget = mapping.frameContinuous;
        if (Math.abs(continuousTarget - state.lastContinuousFrame) < hysteresis) {
          continuousTarget = state.lastContinuousFrame;
        } else {
          state.lastContinuousFrame = continuousTarget;
        }
        state.targetFrame = continuousTarget;

        // Target Frame -> Displayed Frame Delta-Time System
        // Discontinuous jumps across distant clusters snap immediately (e.g. Chin-Up bridge)
        const frameDiff = state.targetFrame - state.displayedFrame;
        if (Math.abs(frameDiff) > 35.0 || state.targetFrame === 0 || state.displayedFrame === 0) {
          state.displayedFrame = state.targetFrame;
        } else {
          // Smoothing speed k = 38.0 gives immediate, responsive tracking (< 20ms response)
          const frameSmoothing = 1 - Math.exp(-38.0 * deltaTime);
          if (Math.abs(frameDiff) < 0.05) {
            state.displayedFrame = state.targetFrame;
          } else {
            state.displayedFrame += frameDiff * frameSmoothing;
          }
        }

        const drawIndex = Math.min(frameCount - 1, Math.max(0, Math.round(state.displayedFrame)));

        // Draw ONLY when frame index changes (drawIndex !== lastDrawnFrameIndex)
        const c = canvasRef.current;
        if (c && drawIndex !== state.lastDrawnFrameIndex) {
          const bitmap = bitmapsRef.current[drawIndex];
          if (bitmap) {
            const tDraw = performance.now();
            const ctx = c.getContext('2d', { alpha: false });
            if (ctx) {
              drawFittedImage(ctx, bitmap, c.width, c.height, character);
              state.lastDrawnFrameIndex = drawIndex;
              state.lastRenderedFrameIndex = drawIndex;
              propsRef.current.onFrameChange?.(drawIndex, mapping);
            }
            state.lastDrawTime = performance.now() - tDraw;
          }
        }

        // Direct DOM update for main HUD label without React re-renders
        if (hudLabelRef.current && mapping.direction !== lastLabel) {
          lastLabel = mapping.direction;
          hudLabelRef.current.textContent = mapping.direction;
        }

        // Direct DOM updates for Development Performance & Direction HUD
        if (debugRefs.xRef.current) {
          const xVal = state.currentNormX;
          debugRefs.xRef.current.textContent = `${xVal >= 0 ? '+' : ''}${xVal.toFixed(2)}`;
        }
        if (debugRefs.yRef.current) {
          const yVal = state.currentNormY;
          debugRefs.yRef.current.textContent = `${yVal >= 0 ? '+' : ''}${yVal.toFixed(2)}`;
        }
        if (debugRefs.angleRef.current) {
          debugRefs.angleRef.current.textContent = `${mapping.angle.toFixed(1)}°`;
        }
        if (debugRefs.radiusRef.current) {
          debugRefs.radiusRef.current.textContent = mapping.radius.toFixed(2);
        }
        if (debugRefs.primaryDirRef.current) {
          debugRefs.primaryDirRef.current.textContent = `${mapping.primaryDir} (${(mapping.primaryWeight * 100).toFixed(0)}%)`;
        }
        if (debugRefs.secondaryDirRef.current) {
          debugRefs.secondaryDirRef.current.textContent = `${mapping.secondaryDir} (${(mapping.secondaryWeight * 100).toFixed(0)}%)`;
        }
        if (debugRefs.weightsRef.current) {
          debugRefs.weightsRef.current.textContent = `${(mapping.primaryWeight * 100).toFixed(0)}% / ${(mapping.secondaryWeight * 100).toFixed(0)}%`;
        }
        if (debugRefs.targetFrameRef.current) {
          debugRefs.targetFrameRef.current.textContent = `TF: ${state.targetFrame.toFixed(1)}`;
        }
        if (debugRefs.displayedFrameRef.current) {
          debugRefs.displayedFrameRef.current.textContent = `DF: ${state.displayedFrame.toFixed(1)} (F${drawIndex})`;
        }
        if (debugRefs.frameDeltaRef.current) {
          debugRefs.frameDeltaRef.current.textContent = `Δ: ${Math.abs(state.targetFrame - state.displayedFrame).toFixed(2)}`;
        }
        if (debugRefs.fpsRef.current) {
          debugRefs.fpsRef.current.textContent = `${state.currentFps} FPS`;
        }
        if (debugRefs.drawTimeRef.current) {
          debugRefs.drawTimeRef.current.textContent = `${state.lastDrawTime.toFixed(2)}ms`;
        }
        if (debugRefs.preloadTimeRef.current) {
          debugRefs.preloadTimeRef.current.textContent = `${state.preloadDuration.toFixed(0)}ms (${frameCount}/${frameCount})`;
        }

        animId = requestAnimationFrame(animationLoop);
      };

      animId = requestAnimationFrame(animationLoop);
    };

    executePreload();

    // 7. Cleanup Routine on Unmount
    return () => {
      isCancelled = true;
      reducedMotionQuery.removeEventListener('change', updateEnv);
      touchQuery.removeEventListener('change', updateEnv);
      window.removeEventListener('resize', updateCachedRect);
      window.removeEventListener('scroll', updateCachedRect);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (animId) cancelAnimationFrame(animId);

      // Cleanly free all GPU ImageBitmaps on unmount
      bitmapsRef.current.forEach((bitmap) => {
        if (bitmap) {
          try {
            bitmap.close();
          } catch (_) {}
        }
      });
      bitmapsRef.current = [];
    };
  }, [frames, frameCount, framePrefix, frameExtension, zeroPadding, preset]);

  return {
    canvasRef,
    containerRef,
    isReady,
    isInteractive,
    progress,
    error,
    stateRef,
    hudLabelRef,
    debugRefs,
  };
}
