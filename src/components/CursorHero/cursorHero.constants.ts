import { FrameMapConfig } from './cursorHero.types';

/**
 * Calibrated 240-frame character animation mapping.
 * Derived empirically from source video keyframes:
 * Total frames: 240 (Frames 0 to 239 @ 24.0fps).
 * Excluded: Frames 189 to 197 contain natural blink.
 */
export const PRESET_CHARACTER_240: FrameMapConfig = {
  name: 'character-240',
  frameCount: 240,
  fps: 24.0,
  deadZone: 0.05,
  nodes: {
    RIGHT: { startFrame: 56.0, peakFrame: 72.0, label: 'RIGHT' },
    UP_RIGHT: { startFrame: 38.0, peakFrame: 48.0, label: 'UP-RIGHT' },
    UP: { startFrame: 24.0, peakFrame: 38.0, label: 'UP' },
    UP_LEFT: { startFrame: 174.0, peakFrame: 184.0, label: 'UP-LEFT' },
    LEFT: { startFrame: 164.0, peakFrame: 170.0, label: 'LEFT' },
    DOWN_LEFT: { startFrame: 124.0, peakFrame: 140.0, label: 'DOWN-LEFT' },
    DOWN: { startFrame: 98.0, peakFrame: 112.0, label: 'DOWN' },
    DOWN_RIGHT: { startFrame: 78.0, peakFrame: 88.0, label: 'DOWN-RIGHT' },
    CENTER: { frame: 0, label: 'CENTER / NEUTRAL' },
  },
  bridges: {
    upBridgeFrame: 36.0,
    upLeftBridgeFrame: 188.0,
  },
  excludedFrameRanges: [
    {
      start: 189.0,
      end: 197.0,
      remapBefore: 188.0,
      remapAfter: 198.0,
    },
  ],
};

/**
 * Dictionary of available built-in presets
 */
export const CURSOR_HERO_PRESETS: Record<string, FrameMapConfig> = {
  'character-240': PRESET_CHARACTER_240,
};

/**
 * Default tracking parameters
 */
export const DEFAULT_TRACKING_OPTIONS = {
  enabled: true,
  responseSpeed: 24.0,
  smoothing: 0.18,
  deadZone: 0.05,
  maxRadius: 1.0,
  returnToNeutral: true,
  returnSpeed: 12.0,
  mobileFrame: 0,
  trackViewport: false,
} as const;

/**
 * Default character canvas sizing and placement
 */
export const DEFAULT_CHARACTER_OPTIONS = {
  scale: 1.0,
  positionX: 0,
  positionY: 0,
  fit: 'contain' as const,
  maxDpr: 2.0,
  aspectRatio: 848 / 480,
  nativeWidth: 848,
  nativeHeight: 480,
};

/**
 * Default preloading configuration
 */
export const DEFAULT_PRELOAD_OPTIONS = {
  enabled: true,
  concurrency: 8,
  maxRetries: 2,
  showPreloader: true,
  titleText: 'INITIALIZING CHARACTER',
  fadeDurationMs: 400,
};
