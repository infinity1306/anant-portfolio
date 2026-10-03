import {
  CalculateCursorFrameOptions,
  DirectionMappingResult,
  DirectionRegionKey,
} from './cursorHero.types';
import { PRESET_CHARACTER_240 } from './cursorHero.constants';
import { clamp } from './cursorHero.utils';

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

/**
 * Pure mathematical directional mapping algorithm.
 *
 * Translates 2D normalized cursor coordinates (x, y in [-1, +1]) into
 * continuous polar angles, directional blends, and exact timeline frame targets.
 * Completely decoupled from React, DOM, and Canvas.
 */
export function calculateCursorFrame(options: CalculateCursorFrameOptions): DirectionMappingResult {
  const {
    x,
    y,
    deadZone = 0.05,
    frameCount = 240,
    frameMap = PRESET_CHARACTER_240,
    lastPrimaryDir = 'CENTER',
    sector3IsUpperLeft = false,
  } = options;

  // Convert to math Cartesian coordinates:
  // Math X = normX (-1 is Left, +1 is Right)
  // Math Y = -normY (+1 is Up, -1 is Down)
  const mathX = clamp(x, -1, 1);
  const mathY = -clamp(y, -1, 1);

  const r = Math.sqrt(mathX * mathX + mathY * mathY);

  // 1. Center Neutral Dead-Zone Check
  const neutralFrame = frameMap.nodes.CENTER?.frame ?? 0;
  const neutralLabel = frameMap.nodes.CENTER?.label ?? 'CENTER / NEUTRAL';

  if (r <= deadZone) {
    return {
      region: 'CENTER',
      direction: neutralLabel,
      targetTime: 0.0,
      frameContinuous: neutralFrame,
      frameIndex: neutralFrame,
      primaryDir: 'CENTER',
      secondaryDir: 'CENTER',
      primaryWeight: 1.0,
      secondaryWeight: 0.0,
      angle: 0.0,
      radius: Math.round(r * 100) / 100,
    };
  }

  // Radial scaling beyond dead zone: [0.0, 1.0]
  const u = clamp((r - deadZone) / (1.0 - deadZone), 0.0, 1.0);

  // Polar angle in degrees: [0, 360)
  let thetaDeg = Math.atan2(mathY, mathX) * (180.0 / Math.PI);
  if (thetaDeg < 0) {
    thetaDeg += 360.0;
  }

  // 2. Continuous Radial Base Node Curves from frameMap
  const nodes = frameMap.nodes;
  const fRight = nodes.RIGHT.startFrame + u * (nodes.RIGHT.peakFrame - nodes.RIGHT.startFrame);
  const fUr = nodes.UP_RIGHT.startFrame + u * (nodes.UP_RIGHT.peakFrame - nodes.UP_RIGHT.startFrame);
  const fUp = nodes.UP.startFrame + u * (nodes.UP.peakFrame - nodes.UP.startFrame);
  const fUl = nodes.UP_LEFT.startFrame + u * (nodes.UP_LEFT.peakFrame - nodes.UP_LEFT.startFrame);
  const fLeft = nodes.LEFT.startFrame + u * (nodes.LEFT.peakFrame - nodes.LEFT.startFrame);
  const fDl = nodes.DOWN_LEFT.startFrame + u * (nodes.DOWN_LEFT.peakFrame - nodes.DOWN_LEFT.startFrame);
  const fDown = nodes.DOWN.startFrame + u * (nodes.DOWN.peakFrame - nodes.DOWN.startFrame);
  const fDr = nodes.DOWN_RIGHT.startFrame + u * (nodes.DOWN_RIGHT.peakFrame - nodes.DOWN_RIGHT.startFrame);

  // Determine sector (0 to 7) and angular fraction t in [0.0, 1.0)
  const sector = Math.floor(thetaDeg / 45.0) % 8;
  const t = (thetaDeg - sector * 45.0) / 45.0;

  // Angular weights: continuous linear blend between adjacent directional states
  const wA = 1.0 - t;
  const wB = t;

  const dirA = DIR_NAMES[sector];
  const dirB = DIR_NAMES[(sector + 1) % 8];

  // Hysteresis on primary direction label (band epsilon = 0.02)
  const eps = 0.02;
  let primaryKey: DirectionRegionKey;
  let secondaryKey: DirectionRegionKey;
  let primaryW: number;
  let secondaryW: number;

  if (lastPrimaryDir === dirA) {
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
  } else if (lastPrimaryDir === dirB) {
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

  // 3. Continuous Directional Frame Calculation
  let frameCont = 0.0;

  // Sector 0: 0° to 45° (RIGHT to UP-RIGHT)
  if (sector === 0) {
    frameCont = (1.0 - t) * fRight + t * fUr;
  }
  // Sector 1: 45° to 90° (UP-RIGHT to UP)
  else if (sector === 1) {
    frameCont = (1.0 - t) * fUr + t * fUp;
  }
  // Sector 2: 90° to 135° (UP to UP-LEFT)
  // Supports optional chin-up bridge (e.g. Frame 36 UP chin-up <-> Frame 188 UP-LEFT chin-up)
  else if (sector === 2) {
    const targetUpBridge = frameMap.bridges?.upBridgeFrame ?? 36.0;
    const targetUlBridge = frameMap.bridges?.upLeftBridgeFrame ?? 188.0;

    let isUl = sector3IsUpperLeft;
    if (isUl) {
      isUl = t > 0.5 - eps;
    } else {
      isUl = t > 0.5 + eps;
    }

    if (!isUl) {
      const tSub = t / 0.5;
      frameCont = (1.0 - tSub) * fUp + tSub * targetUpBridge;
    } else {
      const tSub = (t - 0.5) / 0.5;
      frameCont = (1.0 - tSub) * targetUlBridge + tSub * fUl;
    }
  }
  // Sector 3: 135° to 180° (UP-LEFT to LEFT)
  else if (sector === 3) {
    frameCont = (1.0 - t) * fUl + t * fLeft;
  }
  // Sector 4: 180° to 225° (LEFT to DOWN-LEFT)
  else if (sector === 4) {
    frameCont = (1.0 - t) * fLeft + t * fDl;
  }
  // Sector 5: 225° to 270° (DOWN-LEFT to DOWN)
  else if (sector === 5) {
    frameCont = (1.0 - t) * fDl + t * fDown;
  }
  // Sector 6: 270° to 315° (DOWN to DOWN-RIGHT)
  else if (sector === 6) {
    frameCont = (1.0 - t) * fDown + t * fDr;
  }
  // Sector 7: 315° to 360° (DOWN-RIGHT to RIGHT)
  else {
    frameCont = (1.0 - t) * fDr + t * fRight;
  }

  // 4. Excluded Frame Ranges Sanitization (e.g. natural blink frames 189-197)
  if (frameMap.excludedFrameRanges) {
    for (const range of frameMap.excludedFrameRanges) {
      if (frameCont >= range.start && frameCont <= range.end) {
        const mid = (range.start + range.end) / 2;
        frameCont = frameCont < mid ? range.remapBefore : range.remapAfter;
        break;
      }
    }
  }

  // Integer frame index clamped to [0, frameCount - 1]
  const frameIndex = clamp(Math.round(frameCont), 0, frameCount - 1);
  const fps = frameMap.fps || 24.0;

  // Formulate Contextual HUD Direction Label
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
    targetTime: Math.round((frameIndex / fps) * 100) / 100,
    frameContinuous: frameCont,
    frameIndex,
    primaryDir: primaryLabel,
    secondaryDir: secondaryLabel,
    primaryWeight: primaryW,
    secondaryWeight: secondaryW,
    angle: Math.round(thetaDeg * 10) / 10,
    radius: Math.round(r * 100) / 100,
  };
}
