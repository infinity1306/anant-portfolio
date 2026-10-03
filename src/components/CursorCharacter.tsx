import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface CursorCharacterProps {
  /**
   * Path to the video asset (used as metadata / fallback).
   */
  videoSrc?: string;
  /**
   * Directory where pre-extracted WebP frame sequence is stored.
   * Defaults to '/character-frames'.
   */
  framesDir?: string;
  /**
   * Total number of frames in the sequence. Default: 240 (10s @ 24fps).
   */
  totalFrames?: number;
  /**
   * Optional custom class for the outer container.
   */
  className?: string;
  /**
   * Reference to an external tracking container (e.g. Hero section).
   * If not provided, defaults to the window/viewport.
   */
  trackTargetRef?: React.RefObject<HTMLElement | null>;
  /**
   * Dynamic speed parameter for delta-time exponential smoothing:
   * smoothing = 1 - Math.exp(-speed * deltaTime)
   * Default is 24.0.
   */
  responseSpeed?: number;
  /**
   * Backward-compatibility alias for response tuning.
   */
  smoothingFactor?: number;
  /**
   * Center dead-zone radius (0 to 1). Default is 0.05 (5%).
   */
  deadZone?: number;
  /**
   * Whether to show subtle interactive HUD metrics. Default: true.
   */
  showHud?: boolean;
  /**
   * Whether to display the Step 11 2D Direction Debug HUD.
   * Defaults to true in development mode, false in production.
   */
  showDebugHud?: boolean;
}

/**
 * Validated timeline regions derived from empirical video inspection.
 * Total video duration: 10.000s @ 24.0fps (Frames 0 to 239).
 * Note: Frames 189 to 197 (7.88s to 8.21s) contain a natural blink and are strictly EXCLUDED.
 */
export const DIRECTIONAL_REGIONS = {
  CENTER: { start: 0.00, end: 0.83, canonical: 0.00, frame: 0, label: 'CENTER / NEUTRAL' },
  UP: { start: 1.08, end: 1.58, peak: 1.58, label: 'UP' },
  UP_RIGHT: { start: 1.67, end: 2.08, peak: 2.00, label: 'UP-RIGHT' },
  RIGHT: { start: 2.50, end: 3.08, peak: 3.00, label: 'RIGHT' },
  DOWN_RIGHT: { start: 3.33, end: 3.83, peak: 3.67, label: 'DOWN-RIGHT' },
  DOWN: { start: 4.08, end: 4.75, peak: 4.67, label: 'DOWN' },
  DOWN_LEFT: { start: 5.33, end: 6.08, peak: 5.83, label: 'DOWN-LEFT' },
  LEFT: { start: 6.92, end: 7.25, peak: 7.08, label: 'LEFT' },
  UP_LEFT: { start: 7.33, end: 7.83, peak: 7.67, label: 'UP-LEFT' },
} as const;

export type DirectionRegionKey = keyof typeof DIRECTIONAL_REGIONS;

export interface DirectionMappingResult {
  region: DirectionRegionKey;
  direction: string;
  targetTime: number;
  frameContinuous: number;
  frameIndex: number;
  primaryDir: string;
  secondaryDir: string;
  primaryWeight: number;
  secondaryWeight: number;
  angle: number;
  radius: number;
}

export const CursorCharacter: React.FC<CursorCharacterProps> = ({
  videoSrc = '/video/WhatsApp Video 2026-09-29 at 3.59.58 PM.mp4',
  framesDir = '/character-frames',
  totalFrames = 240,
  className = '',
  trackTargetRef,
  responseSpeed: propResponseSpeed,
  smoothingFactor,
  deadZone = 0.05,
  showHud = true,
  showDebugHud = import.meta.env.DEV,
}) => {
  // Support both responseSpeed and smoothingFactor for seamless backward compatibility
  const responseSpeed = propResponseSpeed ?? (smoothingFactor ? smoothingFactor * 240 : 24.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudLabelRef = useRef<HTMLSpanElement>(null);

  // Debug HUD element references for zero-re-render high-performance DOM updates
  const debugXRef = useRef<HTMLSpanElement>(null);
  const debugYRef = useRef<HTMLSpanElement>(null);
  const debugAngleRef = useRef<HTMLSpanElement>(null);
  const debugRadiusRef = useRef<HTMLSpanElement>(null);
  const debugPrimaryDirRef = useRef<HTMLSpanElement>(null);
  const debugSecondaryDirRef = useRef<HTMLSpanElement>(null);
  const debugWeightsRef = useRef<HTMLSpanElement>(null);
  const debugTargetFrameRef = useRef<HTMLSpanElement>(null);
  const debugDisplayedFrameRef = useRef<HTMLSpanElement>(null);
  const debugFrameDeltaRef = useRef<HTMLSpanElement>(null);
  const debugFpsRef = useRef<HTMLSpanElement>(null);
  const debugDrawTimeRef = useRef<HTMLSpanElement>(null);
  const debugPreloadTimeRef = useRef<HTMLSpanElement>(null);

  // Cached decoded ImageBitmap objects in memory (O(1) instant GPU texture lookup)
  // Preserved across interactions to eliminate lazy decoding stutters and GC churn.
  const bitmapsRef = useRef<(ImageBitmap | null)[]>(new Array(totalFrames).fill(null));

  // High-performance pointer & animation state kept strictly in mutable refs
  // to eliminate any React re-renders during pointer interactions.
  const stateRef = useRef({
    // Pointer normalized target (-1 to +1)
    targetNormX: 0,
    targetNormY: 0,
    // Current smoothed position (-1 to +1)
    currentNormX: 0,
    currentNormY: 0,
    // Frame Tracking System: Target Frame & Displayed Frame
    targetFrame: 0,
    displayedFrame: 0,
    lastContinuousFrame: 0,
    lastRenderedFrameIndex: -1,
    lastDrawnFrameIndex: -1,
    allFramesReady: false,
    isPointerActive: false,
    // Performance & Instrumentation metrics
    preloadDuration: 0,
    lastDrawTime: 0,
    currentFps: 60,
    frameCount: 0,
    fpsLastTime: 0,
    // Capabilities
    prefersReducedMotion: false,
    isTouchDevice: false,
    // Cached container layout to avoid layout thrashing on pointermove
    containerRect: { left: 0, top: 0, width: 1, height: 1 },
    lastFrameTime: 0,
    // Directional hysteresis state
    lastPrimaryDir: 'CENTER' as DirectionRegionKey,
    sector3IsUpperLeft: false,
  });

  // Preloader State: only updated during initialization, never during pointer interactions
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; percent: number }>({
    loaded: 0,
    percent: 0,
  });
  const [isPreloaderVisible, setIsPreloaderVisible] = useState<boolean>(true);
  const [isPreloaderMounted, setIsPreloaderMounted] = useState<boolean>(true);
  const [isInteractive, setIsInteractive] = useState<boolean>(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);

  /**
   * Continuous 2D Directional Field Algorithm
   *
   * Completely removes hard 45-degree sector boundaries.
   * Treats the 8 directional poses as continuous nodes and smoothly
   * interpolates between adjacent directional states as the cursor moves.
   *
   * Coordinates:
   * normX in [-1, +1]: -1 is Left, +1 is Right
   * normY in [-1, +1]: -1 is Top (looking up), +1 is Bottom (looking down)
   *
   * Inverted Y (mathY = -normY):
   * +1 is positive Upward gaze
   * -1 is positive Downward gaze
   */
  const get2DDirectionMapping = useCallback(
    (normX: number, normY: number): DirectionMappingResult => {
      const state = stateRef.current;

      // Accessibility or touch fallback: static neutral front
      if (state.prefersReducedMotion || state.isTouchDevice) {
        return {
          region: 'CENTER',
          direction: 'CENTER / NEUTRAL',
          targetTime: 0.0,
          frameContinuous: 0.0,
          frameIndex: 0,
          primaryDir: 'CENTER',
          secondaryDir: 'CENTER',
          primaryWeight: 1.0,
          secondaryWeight: 0.0,
          angle: 0.0,
          radius: 0.0,
        };
      }

      // Convert to math polar space: Up is positive Y (+1)
      const mathX = normX;
      const mathY = -normY;

      const r = Math.sqrt(mathX * mathX + mathY * mathY);

      // 1. Center Neutral Dead-Zone
      if (r <= deadZone) {
        state.lastPrimaryDir = 'CENTER';
        return {
          region: 'CENTER',
          direction: 'CENTER / NEUTRAL',
          targetTime: 0.0,
          frameContinuous: 0.0,
          frameIndex: 0,
          primaryDir: 'CENTER',
          secondaryDir: 'CENTER',
          primaryWeight: 1.0,
          secondaryWeight: 0.0,
          angle: 0.0,
          radius: Math.round(r * 100) / 100,
        };
      }

      // Continuous radial scaling:
      // r = deadZone -> u = 0.0, r = 1.0 -> u = 1.0
      const u = Math.min(1.0, Math.max(0.0, (r - deadZone) / (1.0 - deadZone)));

      // Polar angle in degrees: [0, 360)
      let thetaDeg = Math.atan2(mathY, mathX) * (180.0 / Math.PI);
      if (thetaDeg < 0) {
        thetaDeg += 360.0;
      }

      // 2. Continuous Radial Base Node Curves
      // Smooth progression from subtle pose (start of calibrated region) to peak pose
      // Node 0: RIGHT (0 deg / 360 deg) -> Frames 56 to 72 (peak RIGHT at 72)
      const fRight = 56.0 + u * (72.0 - 56.0);

      // Node 1: UP-RIGHT (45 deg) -> Frames 38 to 48 (peak UP-RIGHT at 48)
      const fUr = 38.0 + u * (48.0 - 38.0);

      // Node 2: UP (90 deg) -> Frames 24 to 38 (peak UP at 38)
      const fUp = 24.0 + u * (38.0 - 24.0);

      // Node 3: UP-LEFT (135 deg) -> Frames 174 to 184 (peak UP-LEFT at 184)
      const fUl = 174.0 + u * (184.0 - 174.0);

      // Node 4: LEFT (180 deg) -> Frames 164 to 170 (peak LEFT at 170)
      const fLeft = 164.0 + u * (170.0 - 164.0);

      // Node 5: DOWN-LEFT (225 deg) -> Frames 124 to 140 (peak DOWN-LEFT at 140)
      const fDl = 124.0 + u * (140.0 - 124.0);

      // Node 6: DOWN (270 deg) -> Frames 98 to 112 (peak DOWN at 112)
      const fDown = 98.0 + u * (112.0 - 98.0);

      // Node 7: DOWN-RIGHT (315 deg) -> Frames 78 to 88 (peak DOWN-RIGHT at 88)
      const fDr = 78.0 + u * (88.0 - 78.0);

      const DIR_NAMES: DirectionRegionKey[] = [
        'RIGHT',
        'UP_RIGHT',
        'UP',
        'UP_LEFT',
        'LEFT',
        'DOWN_LEFT',
        'DOWN',
        'DOWN_RIGHT',
      ];

      const DIR_LABELS: Record<DirectionRegionKey, string> = {
        RIGHT: 'RIGHT',
        UP_RIGHT: 'UP-RIGHT',
        UP: 'UP',
        UP_LEFT: 'UP-LEFT',
        LEFT: 'LEFT',
        DOWN_LEFT: 'DOWN-LEFT',
        DOWN: 'DOWN',
        DOWN_RIGHT: 'DOWN-RIGHT',
        CENTER: 'CENTER',
      };

      // Determine sector (0 to 7) and angular fraction t in [0.0, 1.0)
      const sector = Math.floor(thetaDeg / 45.0) % 8;
      const t = (thetaDeg - sector * 45.0) / 45.0;

      // Angular weights: continuous linear blend between adjacent directional states
      const wA = 1.0 - t;
      const wB = t;

      const dirA = DIR_NAMES[sector];
      const dirB = DIR_NAMES[(sector + 1) % 8];

      // Small hysteresis on primary/secondary direction label (band epsilon = 0.02)
      const eps = 0.02;
      let primaryKey: DirectionRegionKey;
      let secondaryKey: DirectionRegionKey;
      let primaryW: number;
      let secondaryW: number;

      if (state.lastPrimaryDir === dirA) {
        if (t > 0.5 + eps) {
          primaryKey = dirB;
          secondaryKey = dirA;
          primaryW = wB;
          secondaryW = wA;
        } else {
          primaryKey = dirA;
          secondaryKey = dirB;
          primaryW = wA;
          secondaryW = wB;
        }
      } else if (state.lastPrimaryDir === dirB) {
        if (t < 0.5 - eps) {
          primaryKey = dirA;
          secondaryKey = dirB;
          primaryW = wA;
          secondaryW = wB;
        } else {
          primaryKey = dirB;
          secondaryKey = dirA;
          primaryW = wB;
          secondaryW = wA;
        }
      } else {
        if (t <= 0.5) {
          primaryKey = dirA;
          secondaryKey = dirB;
          primaryW = wA;
          secondaryW = wB;
        } else {
          primaryKey = dirB;
          secondaryKey = dirA;
          primaryW = wB;
          secondaryW = wA;
        }
      }
      state.lastPrimaryDir = primaryKey;

      // 3. Continuous Directional Frame Calculation
      let frameCont = 0.0;

      // Sector 0: 0 deg to 45 deg (RIGHT to UP-RIGHT)
      if (sector === 0) {
        frameCont = (1.0 - t) * fRight + t * fUr;
      }
      // Sector 1: 45 deg to 90 deg (UP-RIGHT to UP)
      else if (sector === 1) {
        frameCont = (1.0 - t) * fUr + t * fUp;
      }
      // Sector 2: 90 deg to 135 deg (UP to UP-LEFT)
      // Visual chin-up bridge through Frame 36 (UP chin-up) and Frame 188 (UP-LEFT chin-up)
      // with hysteresis around 112.5 deg (t = 0.5)
      else if (sector === 2) {
        if (state.sector3IsUpperLeft) {
          state.sector3IsUpperLeft = t > 0.5 - eps;
        } else {
          state.sector3IsUpperLeft = t > 0.5 + eps;
        }

        const targetUpBridge = 36.0;
        const targetUlBridge = 188.0;

        if (!state.sector3IsUpperLeft) {
          const tSub = t / 0.5;
          frameCont = (1.0 - tSub) * fUp + tSub * targetUpBridge;
        } else {
          const tSub = (t - 0.5) / 0.5;
          frameCont = (1.0 - tSub) * targetUlBridge + tSub * fUl;
        }
      }
      // Sector 3: 135 deg to 180 deg (UP-LEFT to LEFT)
      else if (sector === 3) {
        frameCont = (1.0 - t) * fUl + t * fLeft;
      }
      // Sector 4: 180 deg to 225 deg (LEFT to DOWN-LEFT)
      else if (sector === 4) {
        frameCont = (1.0 - t) * fLeft + t * fDl;
      }
      // Sector 5: 225 deg to 270 deg (DOWN-LEFT to DOWN)
      else if (sector === 5) {
        frameCont = (1.0 - t) * fDl + t * fDown;
      }
      // Sector 6: 270 deg to 315 deg (DOWN to DOWN-RIGHT)
      else if (sector === 6) {
        frameCont = (1.0 - t) * fDown + t * fDr;
      }
      // Sector 7: 315 deg to 360 deg (DOWN-RIGHT to RIGHT)
      else {
        frameCont = (1.0 - t) * fDr + t * fRight;
      }

      // 4. Strict Blink Exclusion Sanitization (Blink in Frames 189 to 197 strictly avoided)
      if (frameCont >= 189.0 && frameCont <= 197.0) {
        frameCont = frameCont < 193.0 ? 188.0 : 198.0;
      }

      // Convert target continuous timestamp to exact frame index (24.0 fps)
      const frameIndex = Math.min(
        totalFrames - 1,
        Math.max(0, Math.round(frameCont))
      );

      // Formulate contextual HUD label
      const primaryLabel = DIR_LABELS[primaryKey];
      const secondaryLabel = DIR_LABELS[secondaryKey];
      let qualifiedLabel = primaryLabel;
      if (primaryW < 0.65) {
        qualifiedLabel = `${primaryLabel} / ${secondaryLabel}`;
      }
      if (u < 0.3) {
        qualifiedLabel = `SLIGHT ${qualifiedLabel}`;
      } else if (u < 0.7) {
        qualifiedLabel = `MODERATE ${qualifiedLabel}`;
      }

      return {
        region: primaryKey,
        direction: qualifiedLabel,
        targetTime: Math.round((frameIndex / 24.0) * 100) / 100,
        frameContinuous: frameCont,
        frameIndex,
        primaryDir: primaryLabel,
        secondaryDir: secondaryLabel,
        primaryWeight: primaryW,
        secondaryWeight: secondaryW,
        angle: Math.round(thetaDeg * 10) / 10,
        radius: Math.round(r * 100) / 100,
      };
    },
    [deadZone, totalFrames]
  );

  // Frame URL generator helper
  const getFrameUrl = useCallback(
    (index: number) => {
      const padded = String(index).padStart(3, '0');
      return `${framesDir}/frame_${padded}.webp`;
    },
    [framesDir]
  );

  // Preloading & Frame Initialization Lifecycle
  useEffect(() => {
    let isCancelled = false;
    const state = stateRef.current;

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
    const getTargetElement = () => trackTargetRef?.current || containerRef.current || document.body;

    const updateCachedRect = () => {
      const el = getTargetElement();
      if (el) {
        const r = el.getBoundingClientRect();
        const effectiveTop = (r.top <= 80 && r.top >= -80) ? 0 : r.top;
        const availableHeight = effectiveTop > 0 ? (window.innerHeight - effectiveTop) : window.innerHeight;
        const effectiveHeight = Math.min(r.height, availableHeight);
        state.containerRect = {
          left: r.left,
          top: effectiveTop,
          width: Math.max(r.width, 1),
          height: Math.max(effectiveHeight, 1),
        };
      }
    };

    updateCachedRect();
    window.addEventListener('resize', updateCachedRect, { passive: true });
    window.addEventListener('scroll', updateCachedRect, { passive: true });

    // 3. Pointer Tracking Listener
    // Runs from the start so any cursor movement during loading is captured in state.targetNormX/Y!
    const onPointerMove = (e: PointerEvent) => {
      if (state.prefersReducedMotion || state.isTouchDevice) return;

      const rect = state.containerRect;
      const rawX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const rawY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      state.targetNormX = Math.max(-1, Math.min(1, rawX));
      state.targetNormY = Math.max(-1, Math.min(1, rawY));
      state.isPointerActive = true;
    };

    const onPointerLeave = () => {
      state.isPointerActive = false;
      state.targetNormX = 0;
      state.targetNormY = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });

    // 4. Execution Routine for Preloading All 240 WebP Frames as ImageBitmaps
    const preloadStartTime = performance.now();
    let animId: number;
    let lastLabel = '';

    // Mobile / Touch or Reduced Motion Shortcut
    if (state.prefersReducedMotion || state.isTouchDevice) {
      (async () => {
        try {
          const res = await fetch(getFrameUrl(0));
          const blob = await res.blob();
          const bitmap = await createImageBitmap(blob);
          if (isCancelled) {
            bitmap.close();
            return;
          }
          bitmapsRef.current[0] = bitmap;
          state.allFramesReady = true;

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          }

          setIsPreloaderVisible(false);
          setIsInteractive(false);
          setTimeout(() => {
            if (!isCancelled) setIsPreloaderMounted(false);
          }, 450);
        } catch (err) {
          console.error('[CursorCharacter] Error loading mobile frame 0:', err);
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

    // Desktop: Dedicated Concurrent Preloader with Controlled Concurrency
    const MAX_CONCURRENT_LOADS = 10;
    const MAX_RETRIES = 2;
    let decodedCount = 0;
    let retriedCount = 0;
    let progressUpdateScheduled = false;

    const scheduleProgressUpdate = () => {
      if (progressUpdateScheduled) return;
      progressUpdateScheduled = true;
      requestAnimationFrame(() => {
        progressUpdateScheduled = false;
        if (!isCancelled) {
          setPreloadProgress({
            loaded: decodedCount,
            percent: Math.min(100, Math.floor((decodedCount / totalFrames) * 100)),
          });
        }
      });
    };

    const loadFrameWithRetry = async (index: number, retriesLeft = MAX_RETRIES): Promise<boolean> => {
      while (retriesLeft >= 0) {
        if (isCancelled) return false;
        try {
          const response = await fetch(getFrameUrl(index));
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
            console.error(`[CursorCharacter] Failed frame ${index} after retries:`, err);
            return false;
          }
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 60));
        }
      }
      return false;
    };

    // Load Frame 0 first so canvas has instant static neutral fallback
    const initPreloader = async () => {
      const frame0Success = await loadFrameWithRetry(0);
      if (isCancelled) return;

      if (frame0Success && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        const b0 = bitmapsRef.current[0];
        if (ctx && b0) {
          ctx.drawImage(b0, 0, 0, canvasRef.current.width, canvasRef.current.height);
          state.lastDrawnFrameIndex = 0;
          state.lastRenderedFrameIndex = 0;
        }
      }

      // Queue of remaining frames 1 to totalFrames - 1
      const queue: number[] = [];
      for (let i = 1; i < totalFrames; i++) {
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

      // Launch concurrent worker pool
      const workers = Array.from({ length: MAX_CONCURRENT_LOADS }, () => worker());
      await Promise.all(workers);

      if (isCancelled) return;

      // Verify sequence validation (0 to 239)
      const allReady = bitmapsRef.current.every((bitmap) => bitmap !== null);
      const preloadDuration = performance.now() - preloadStartTime;
      state.preloadDuration = preloadDuration;

      if (import.meta.env.DEV) {
        console.log(
          `[CursorCharacter] Loaded and decoded ${decodedCount}/${totalFrames} character frames in ${preloadDuration.toFixed(
            0
          )}ms (retried: ${retriedCount})`
        );
      }

      if (!allReady) {
        setPreloadError('Some frames failed to decode. Please reload.');
        return;
      }

      // Mark All Frames Ready
      state.allFramesReady = true;
      setIsInteractive(true);
      setPreloadProgress({ loaded: totalFrames, percent: 100 });

      if (typeof window !== 'undefined') {
        (window as any).__cursorCharacterDebug = {
          state,
          bitmaps: bitmapsRef.current,
          totalFrames,
          getDecodedCount: () => bitmapsRef.current.filter(Boolean).length,
          isReady: () => state.allFramesReady,
        };
      }

      // Apply latest captured cursor position immediately
      state.currentNormX = state.targetNormX;
      state.currentNormY = state.targetNormY;
      const initialMapping = get2DDirectionMapping(state.currentNormX, state.currentNormY);
      state.targetFrame = initialMapping.frameContinuous;
      state.displayedFrame = initialMapping.frameContinuous;

      let initDrawFrame = state.displayedFrame;
      if (initDrawFrame >= 189.0 && initDrawFrame <= 197.0) {
        initDrawFrame = initDrawFrame < 193.0 ? 188.0 : 198.0;
      }
      const initialFrameIndex = Math.min(totalFrames - 1, Math.max(0, Math.round(initDrawFrame)));

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        const initBitmap = bitmapsRef.current[initialFrameIndex] || bitmapsRef.current[0];
        if (ctx && initBitmap) {
          ctx.drawImage(initBitmap, 0, 0, canvas.width, canvas.height);
          state.lastDrawnFrameIndex = initialFrameIndex;
          state.lastRenderedFrameIndex = initialFrameIndex;
        }
      }

      // Smooth fade-out of preloader overlay (300-500ms)
      setTimeout(() => {
        if (!isCancelled) {
          setIsPreloaderVisible(false);
          setTimeout(() => {
            if (!isCancelled) {
              setIsPreloaderMounted(false);
            }
          }, 450);
        }
      }, 50);

      // Start 60-240Hz High-Performance requestAnimationFrame Loop
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

        // Clamped delta time in seconds
        const deltaTime = Math.min((timeNow - state.lastFrameTime) / 1000, 0.1);
        state.lastFrameTime = timeNow;

        // 1. Delta-time based exponential smoothing for cursor coordinate vectors
        const smoothing = 1 - Math.exp(-responseSpeed * deltaTime);
        state.currentNormX += (state.targetNormX - state.currentNormX) * smoothing;
        state.currentNormY += (state.targetNormY - state.currentNormY) * smoothing;

        // 2. Map smoothed (X, Y) directly to continuous 2D direction field
        const mapping = get2DDirectionMapping(state.currentNormX, state.currentNormY);

        // Small hysteresis on target continuous frame to eliminate micro-jitter
        const hysteresis = 0.25;
        let continuousTarget = mapping.frameContinuous;
        if (Math.abs(continuousTarget - state.lastContinuousFrame) < hysteresis) {
          continuousTarget = state.lastContinuousFrame;
        } else {
          state.lastContinuousFrame = continuousTarget;
        }
        state.targetFrame = continuousTarget;

        // 3. TARGET FRAME and DISPLAYED FRAME Delta-Time System
        // Avoids hard frame skips while keeping latency to ~1 animation frame (zero input delay).
        // Discontinuous jumps across distant timeline clusters (e.g. Chin-Up bridge 36 <-> 188)
        // must snap immediately rather than interpolating through unrelated frames.
        const frameDiff = state.targetFrame - state.displayedFrame;
        if (Math.abs(frameDiff) > 15.0) {
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

        // 4. Strict Blink Exclusion Sanitization (Frames 189 to 197)
        let cleanFrame = state.displayedFrame;
        if (cleanFrame >= 189.0 && cleanFrame <= 197.0) {
          cleanFrame = cleanFrame < 193.0 ? 188.0 : 198.0;
        }

        const drawIndex = Math.min(totalFrames - 1, Math.max(0, Math.round(cleanFrame)));

        // 5. Draw to Canvas ONLY when necessary (drawIndex !== lastDrawnFrameIndex)
        // Eliminates redundant canvas work, GC pressure, and battery consumption.
        const canvas = canvasRef.current;
        if (canvas && drawIndex !== state.lastDrawnFrameIndex) {
          const bitmap = bitmapsRef.current[drawIndex];
          if (bitmap) {
            const tDraw = performance.now();
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              state.lastDrawnFrameIndex = drawIndex;
              state.lastRenderedFrameIndex = drawIndex;
            }
            state.lastDrawTime = performance.now() - tDraw;
          }
        }

        // 6. Direct DOM update for main HUD label without React re-renders
        if (hudLabelRef.current && mapping.direction !== lastLabel) {
          lastLabel = mapping.direction;
          hudLabelRef.current.textContent = mapping.direction;
        }

        // 7. Direct DOM updates for Development Performance & Direction HUD
        if (showDebugHud) {
          if (debugXRef.current) {
            const xVal = state.currentNormX;
            debugXRef.current.textContent = `${xVal >= 0 ? '+' : ''}${xVal.toFixed(2)}`;
          }
          if (debugYRef.current) {
            const yVal = state.currentNormY;
            debugYRef.current.textContent = `${yVal >= 0 ? '+' : ''}${yVal.toFixed(2)}`;
          }
          if (debugAngleRef.current) {
            debugAngleRef.current.textContent = `${mapping.angle.toFixed(1)}°`;
          }
          if (debugRadiusRef.current) {
            debugRadiusRef.current.textContent = mapping.radius.toFixed(2);
          }
          if (debugPrimaryDirRef.current) {
            debugPrimaryDirRef.current.textContent = `${mapping.primaryDir} (${(mapping.primaryWeight * 100).toFixed(0)}%)`;
          }
          if (debugSecondaryDirRef.current) {
            debugSecondaryDirRef.current.textContent = `${mapping.secondaryDir} (${(mapping.secondaryWeight * 100).toFixed(0)}%)`;
          }
          if (debugWeightsRef.current) {
            debugWeightsRef.current.textContent = `${(mapping.primaryWeight * 100).toFixed(0)}% / ${(mapping.secondaryWeight * 100).toFixed(0)}%`;
          }
          if (debugTargetFrameRef.current) {
            debugTargetFrameRef.current.textContent = `TF: ${state.targetFrame.toFixed(1)}`;
          }
          if (debugDisplayedFrameRef.current) {
            debugDisplayedFrameRef.current.textContent = `DF: ${state.displayedFrame.toFixed(1)} (F${drawIndex})`;
          }
          if (debugFrameDeltaRef.current) {
            debugFrameDeltaRef.current.textContent = `Δ: ${Math.abs(state.targetFrame - state.displayedFrame).toFixed(2)}`;
          }
          if (debugFpsRef.current) {
            debugFpsRef.current.textContent = `${state.currentFps} FPS`;
          }
          if (debugDrawTimeRef.current) {
            debugDrawTimeRef.current.textContent = `${state.lastDrawTime.toFixed(2)}ms`;
          }
          if (debugPreloadTimeRef.current) {
            debugPreloadTimeRef.current.textContent = `${state.preloadDuration.toFixed(0)}ms (${totalFrames}/${totalFrames})`;
          }
        }

        animId = requestAnimationFrame(animationLoop);
      };

      animId = requestAnimationFrame(animationLoop);
    };

    initPreloader();

    // 8. Cleanup routine: close all ImageBitmaps and detach event listeners
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

      // Cleanly free all 240 GPU ImageBitmaps on unmount
      bitmapsRef.current.forEach((bitmap) => {
        if (bitmap) {
          try {
            bitmap.close();
          } catch (_) {}
        }
      });
      bitmapsRef.current = [];
    };
  }, [get2DDirectionMapping, getFrameUrl, responseSpeed, showDebugHud, totalFrames]);

  return (
    <div
      ref={containerRef}
      className={`relative group inline-block select-none overflow-hidden rounded-3xl ${className}`}
      style={{
        boxShadow: '0 25px 80px -15px rgba(217, 37, 52, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        background: '#0a0a0c',
        transform: 'translateZ(0)', // Dedicated GPU compositing layer
      }}
    >
      {/* Ambient Crimson Aura matching the studio background */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 opacity-70 blur-3xl transition-opacity duration-700 group-hover:opacity-95"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(217, 37, 52, 0.45) 0%, rgba(217, 37, 52, 0.15) 50%, transparent 80%)',
        }}
      />

      {/* Primary Canvas Element: 848x480 native resolution, hardware accelerated */}
      <div className="relative w-full h-full overflow-hidden rounded-3xl aspect-[848/480]">
        <canvas
          ref={canvasRef}
          width={848}
          height={480}
          aria-label="Interactive character portrait reacting to cursor movement"
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(1.02) saturate(1.02)',
            transform: 'translateZ(0)',
          }}
        />

        {/* Luxury Film Grain & Vignette Overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 65%, rgba(0, 0, 0, 0.35) 100%)',
            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Subtle Outer Border Glow */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

        {/* Dedicated Premium Character Module Preloader */}
        {isPreloaderMounted && (
          <div
            id="character-preloader-overlay"
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070709]/95 backdrop-blur-md transition-opacity duration-400 ease-out select-none ${
              isPreloaderVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex flex-col items-center w-72 max-w-[85%] px-6 py-5 rounded-2xl bg-black/70 border border-white/10 shadow-2xl">
              {/* Header with Glowing Status Indicator */}
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-300 font-semibold">
                  {preloadProgress.percent === 100 ? 'READY' : 'INITIALIZING CHARACTER'}
                </span>
              </div>

              {/* Progress Track & Gradient Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2.5 relative">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  style={{ width: `${preloadProgress.percent}%` }}
                />
              </div>

              {/* Progress Details */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="text-white font-medium">{preloadProgress.percent}%</span>
                <span>{preloadProgress.loaded} / {totalFrames} FRAMES</span>
              </div>

              {preloadError && (
                <div className="mt-2 text-xs font-mono text-red-400 text-center">
                  {preloadError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Floating Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-200">
            {isInteractive ? 'Interactive Gaze' : 'Portrait'}
          </span>
        </div>

        {/* Development Performance & 2D Direction Debug HUD */}
        {showDebugHud && (
          <div
            id="debug-hud-panel"
            className="absolute top-4 right-4 z-20 pointer-events-none font-mono text-[11px] bg-black/85 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2.5 text-neutral-300 shadow-2xl flex flex-col gap-1 text-left select-none max-w-[280px]"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-red-400 font-bold mb-0.5">
              <span>Performance & Direction HUD</span>
              <span ref={debugFpsRef} className="text-emerald-400 font-bold">60 FPS</span>
            </div>
            <div id="debug-hud-coords">
              Cursor X: <span ref={debugXRef} className="text-white font-semibold">0.00</span> | Y: <span ref={debugYRef} className="text-white font-semibold">0.00</span>
            </div>
            <div id="debug-hud-polar">
              Angle: <span ref={debugAngleRef} className="text-amber-400 font-semibold">0.0°</span> | Radius: <span ref={debugRadiusRef} className="text-amber-400 font-semibold">0.00</span>
            </div>
            <div id="debug-hud-primary">
              Primary: <span ref={debugPrimaryDirRef} className="text-emerald-400 font-semibold">CENTER</span>
            </div>
            <div id="debug-hud-secondary">
              Secondary: <span ref={debugSecondaryDirRef} className="text-sky-400 font-semibold">CENTER</span>
            </div>
            <div id="debug-hud-weights">
              Weight: <span ref={debugWeightsRef} className="text-purple-400 font-semibold">100% / 0%</span>
            </div>
            <div id="debug-hud-frames" className="border-t border-white/10 pt-1 mt-0.5 flex flex-col gap-0.5">
              <div>
                <span ref={debugTargetFrameRef} className="text-amber-300 font-semibold">TF: 0.0</span> | <span ref={debugDisplayedFrameRef} className="text-white font-semibold">DF: 0.0 (F0)</span>
              </div>
              <div>
                <span ref={debugFrameDeltaRef} className="text-purple-300 font-semibold">Δ: 0.00</span> | Draw: <span ref={debugDrawTimeRef} className="text-emerald-300 font-semibold">0.00ms</span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Preload: <span ref={debugPreloadTimeRef} className="text-neutral-200">0ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Direction Status HUD Pill */}
        {showHud && isInteractive && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-neutral-300">
              <span className="text-red-400 font-medium mr-1.5">DIR:</span>
              <span ref={hudLabelRef} id="hud-direction-label">Front / Neutral</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-neutral-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Pre-decoded ImageBitmap GPU Renderer
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CursorCharacter;
