import React from 'react';

/**
 * Directional region keys
 */
export type DirectionRegionKey =
  | 'CENTER'
  | 'RIGHT'
  | 'UP_RIGHT'
  | 'UP'
  | 'UP_LEFT'
  | 'LEFT'
  | 'DOWN_LEFT'
  | 'DOWN'
  | 'DOWN_RIGHT';

/**
 * Directional timeline node configuration for a character animation sequence
 */
export interface DirectionNodeConfig {
  startFrame: number;
  peakFrame: number;
  label?: string;
}

/**
 * Full frame map configuration dictionary
 */
export interface FrameMapConfig {
  name?: string;
  frameCount: number;
  fps?: number;
  deadZone?: number;
  nodes: {
    RIGHT: DirectionNodeConfig;
    UP_RIGHT: DirectionNodeConfig;
    UP: DirectionNodeConfig;
    UP_LEFT: DirectionNodeConfig;
    LEFT: DirectionNodeConfig;
    DOWN_LEFT: DirectionNodeConfig;
    DOWN: DirectionNodeConfig;
    DOWN_RIGHT: DirectionNodeConfig;
    CENTER?: { frame: number; label?: string };
  };
  /**
   * Optional chin-up bridge across discontinuous cuts (e.g. UP chin-up to UP-LEFT chin-up)
   */
  bridges?: {
    upBridgeFrame?: number;
    upLeftBridgeFrame?: number;
  };
  /**
   * Sanitized frame ranges to strictly avoid rendering (e.g. blink frames 189-197)
   */
  excludedFrameRanges?: Array<{
    start: number;
    end: number;
    remapBefore: number;
    remapAfter: number;
  }>;
}

/**
 * Calculated directional mapping output from calculateCursorFrame()
 */
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

/**
 * Options passed to pure calculateCursorFrame() function
 */
export interface CalculateCursorFrameOptions {
  x: number; // normalized -1 to +1 (Left to Right)
  y: number; // normalized -1 to +1 (Top to Bottom)
  deadZone?: number;
  frameCount?: number;
  frameMap?: FrameMapConfig;
  lastPrimaryDir?: DirectionRegionKey;
  sector3IsUpperLeft?: boolean;
}

/**
 * Call-to-action button descriptor
 */
export interface CursorHeroCTA {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  className?: string;
  target?: string;
}

/**
 * Tracking and responsiveness configuration
 */
export interface CursorHeroTrackingOptions {
  /**
   * Whether cursor tracking is enabled. Default: true.
   */
  enabled?: boolean;
  /**
   * Response speed parameter for delta-time exponential smoothing:
   * smoothing = 1 - Math.exp(-responseSpeed * deltaTime)
   * A value of 20-28 provides immediate, butter-smooth following. Default: 24.0.
   */
  responseSpeed?: number;
  /**
   * Frame smoothing factor (0.05 to 0.40) or response rate. Default: 0.18.
   */
  smoothing?: number;
  /**
   * Dead zone radius at center (0 to 1). Default: 0.05 (5%).
   */
  deadZone?: number;
  /**
   * Maximum tracking radius clamping (0 to 1). Default: 1.0.
   */
  maxRadius?: number;
  /**
   * Whether to smoothly return character to neutral when cursor leaves the hero bounds. Default: true.
   */
  returnToNeutral?: boolean;
  /**
   * Return-to-neutral speed. Default: 12.0.
   */
  returnSpeed?: number;
  /**
   * Static frame to render on mobile / touch devices. Default: 0.
   */
  mobileFrame?: number;
  /**
   * Whether to track full viewport instead of hero bounding box. Default: false.
   */
  trackViewport?: boolean;
}

/**
 * Character canvas drawing & transformation configuration
 */
export interface CursorHeroCharacterOptions {
  /**
   * Canvas scaling multiplier. Default: 1.0.
   */
  scale?: number;
  /**
   * Horizontal offset in pixels. Default: 0.
   */
  positionX?: number;
  /**
   * Vertical offset in pixels. Default: 0.
   */
  positionY?: number;
  /**
   * Canvas object fit behavior: 'contain' | 'cover'. Default: 'contain'.
   */
  fit?: 'contain' | 'cover';
  /**
   * Max Device Pixel Ratio limit (prevents huge 4x canvases). Default: 2.0.
   */
  maxDpr?: number;
  /**
   * Aspect ratio width / height (e.g. 848/480). Default: 848/480.
   */
  aspectRatio?: number;
  /**
   * Native canvas buffer width in pixels. Default: 848.
   */
  nativeWidth?: number;
  /**
   * Native canvas buffer height in pixels. Default: 480.
   */
  nativeHeight?: number;
}

/**
 * Preload configuration
 */
export interface CursorHeroPreloadOptions {
  /**
   * Whether to preload all frames before interaction. Default: true.
   */
  enabled?: boolean;
  /**
   * Maximum concurrent frame downloads. Default: 8.
   */
  concurrency?: number;
  /**
   * Maximum retries per frame before error. Default: 2.
   */
  maxRetries?: number;
  /**
   * Whether to display the preloader overlay UI. Default: true.
   */
  showPreloader?: boolean;
  /**
   * Custom preloader title text. Default: 'INITIALIZING CHARACTER'.
   */
  titleText?: string;
  /**
   * Fade-out duration in ms after 100% completion. Default: 400.
   */
  fadeDurationMs?: number;
}

/**
 * Main CursorHero Component Props
 */
export interface CursorHeroProps {
  /**
   * Directory where frame sequence images are located.
   * Default: '/character-frames'.
   */
  frames?: string;
  /**
   * Total number of frames in the sequence.
   * Default: 240.
   */
  frameCount?: number;
  /**
   * Frame filename prefix (e.g. 'frame_').
   * Default: 'frame_'.
   */
  framePrefix?: string;
  /**
   * Frame image extension ('webp', 'png', 'jpg').
   * Default: 'webp'.
   */
  frameExtension?: string;
  /**
   * Starting frame index (0 or 1).
   * Default: 0.
   */
  startFrame?: number;
  /**
   * Zero padding width for frame numbers (e.g. 3 -> '000', '001').
   * Default: 3.
   */
  zeroPadding?: number;
  /**
   * Built-in animation preset name (e.g. 'character-240').
   * Default: 'character-240'.
   */
  preset?: string;
  /**
   * Custom directional frame map configuration (overrides preset).
   */
  frameMap?: FrameMapConfig;

  // Content Props (used when children is not provided)
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: CursorHeroCTA;
  secondaryCta?: CursorHeroCTA;

  // Custom Content Children
  children?: React.ReactNode;
  /**
   * Optional elements rendered directly beneath the interactive character showcase area
   */
  belowCharacter?: React.ReactNode;
  id?: string;

  // Subsystem Configurations
  tracking?: CursorHeroTrackingOptions;
  character?: CursorHeroCharacterOptions;
  preload?: boolean | CursorHeroPreloadOptions;
  preloadConcurrency?: number;

  // Appearance & Styling
  className?: string;
  contentClassName?: string;
  canvasClassName?: string;
  preloaderClassName?: string;

  // HUD & Diagnostics
  showHud?: boolean;
  showDebugHud?: boolean;

  // Callbacks
  onLoad?: () => void;
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
  onError?: (error: Error | string) => void;
  onFrameChange?: (frameIndex: number, direction: DirectionMappingResult) => void;
}
