import { CursorHeroCharacterOptions } from './cursorHero.types';

/**
 * Generate image URL for any frame sequence convention
 */
export function generateFrameUrl(
  basePath: string,
  index: number,
  prefix = 'frame_',
  ext = 'webp',
  zeroPadding = 3
): string {
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
  const paddedIndex = String(index).padStart(zeroPadding, '0');
  return `${cleanBase}/${prefix}${paddedIndex}.${cleanExt}`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Safely compute Device Pixel Ratio with maximum clamping
 */
export function getClampedDpr(maxDpr = 2.0): number {
  if (typeof window === 'undefined') return 1;
  const rawDpr = window.devicePixelRatio || 1;
  return Math.min(rawDpr, maxDpr);
}

/**
 * Draw an ImageBitmap or HTMLImageElement onto a 2D canvas context with
 * scale, offset, and object-fit ('contain' | 'cover') support.
 */
export function drawFittedImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap | HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  options?: CursorHeroCharacterOptions
): void {
  const fit = options?.fit || 'contain';
  const scale = options?.scale ?? 1.0;
  const posX = options?.positionX ?? 0;
  const posY = options?.positionY ?? 0;

  const imgW = image.width;
  const imgH = image.height;

  let drawW = canvasWidth;
  let drawH = canvasHeight;

  if (fit === 'cover') {
    const scaleFactor = Math.max(canvasWidth / imgW, canvasHeight / imgH) * scale;
    drawW = imgW * scaleFactor;
    drawH = imgH * scaleFactor;
  } else if (fit === 'contain') {
    const scaleFactor = Math.min(canvasWidth / imgW, canvasHeight / imgH) * scale;
    drawW = imgW * scaleFactor;
    drawH = imgH * scaleFactor;
  } else {
    drawW = canvasWidth * scale;
    drawH = canvasHeight * scale;
  }

  const dx = (canvasWidth - drawW) / 2 + posX;
  const dy = (canvasHeight - drawH) / 2 + posY;

  ctx.drawImage(image, dx, dy, drawW, drawH);
}

/**
 * Calculate container bounding box without layout thrashing
 */
export function getElementBoundingBox(
  el: HTMLElement | null,
  trackViewport = false
): { left: number; top: number; width: number; height: number } {
  if (trackViewport || !el || typeof window === 'undefined') {
    return {
      left: 0,
      top: 0,
      width: typeof window !== 'undefined' ? window.innerWidth : 1440,
      height: typeof window !== 'undefined' ? window.innerHeight : 900,
    };
  }

  const r = el.getBoundingClientRect();
  // If element starts near the top of the viewport (<= 80px), include top margin
  const effectiveTop = r.top <= 80 && r.top >= -80 ? 0 : r.top;
  const availableHeight = effectiveTop > 0 ? window.innerHeight - effectiveTop : window.innerHeight;
  const effectiveHeight = Math.min(r.height, availableHeight);

  return {
    left: r.left,
    top: effectiveTop,
    width: Math.max(r.width, 1),
    height: Math.max(effectiveHeight, 1),
  };
}
