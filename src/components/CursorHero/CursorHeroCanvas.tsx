import React, { forwardRef } from 'react';
import { CursorHeroCharacterOptions } from './cursorHero.types';
import { DEFAULT_CHARACTER_OPTIONS } from './cursorHero.constants';

export interface CursorHeroCanvasProps {
  character?: CursorHeroCharacterOptions;
  className?: string;
  isInteractive?: boolean;
}

export const CursorHeroCanvas = forwardRef<HTMLCanvasElement, CursorHeroCanvasProps>(
  ({ character, className = '', isInteractive = true }, ref) => {
    const opts = { ...DEFAULT_CHARACTER_OPTIONS, ...character };
    const nativeW = opts.nativeWidth ?? 848;
    const nativeH = opts.nativeHeight ?? 480;

    return (
      <div
        className={`cursor-hero__canvas-wrapper relative w-full h-full overflow-hidden rounded-3xl select-none ${className}`}
        style={{
          aspectRatio: `${nativeW} / ${nativeH}`,
          background: '#0a0a0c',
          boxShadow: '0 25px 80px -15px rgba(217, 37, 52, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          transform: 'translateZ(0)',
        }}
      >
        {/* Ambient Crimson Aura matching the studio background */}
        <div
          className="pointer-events-none absolute -inset-6 -z-10 opacity-70 blur-3xl transition-opacity duration-700"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(217, 37, 52, 0.45) 0%, rgba(217, 37, 52, 0.15) 50%, transparent 80%)',
          }}
        />

        {/* Primary Canvas Element */}
        <canvas
          ref={ref}
          width={nativeW}
          height={nativeH}
          aria-hidden="true"
          className="cursor-hero__canvas w-full h-full object-cover select-none"
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

        {/* Top Status Pill */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg select-none pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-200">
            {isInteractive ? 'Interactive Gaze' : 'Portrait'}
          </span>
        </div>
      </div>
    );
  }
);

CursorHeroCanvas.displayName = 'CursorHeroCanvas';
