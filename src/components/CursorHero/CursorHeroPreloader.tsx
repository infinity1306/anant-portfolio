import React, { useEffect, useState } from 'react';

export interface CursorHeroPreloaderProps {
  progress: { loaded: number; total: number; percent: number };
  isReady: boolean;
  error?: string | null;
  titleText?: string;
  fadeDurationMs?: number;
  className?: string;
}

export const CursorHeroPreloader: React.FC<CursorHeroPreloaderProps> = ({
  progress,
  isReady,
  error = null,
  titleText = 'INITIALIZING CHARACTER',
  fadeDurationMs = 400,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(true);

  useEffect(() => {
    if (isReady && !error) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        const unmountTimer = setTimeout(() => {
          setIsMounted(false);
        }, fadeDurationMs + 50);
        return () => clearTimeout(unmountTimer);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isReady, error, fadeDurationMs]);

  if (!isMounted) return null;

  return (
    <div
      id="character-preloader-overlay"
      data-testid="cursor-hero-preloader-overlay"
      className={`cursor-hero__preloader absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070709]/95 backdrop-blur-md transition-opacity ease-out select-none ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      } ${className}`}
      style={{
        transitionDuration: `${fadeDurationMs}ms`,
      }}
    >
      <div className="flex flex-col items-center w-72 max-w-[85%] px-6 py-5 rounded-2xl bg-black/70 border border-white/10 shadow-2xl">
        {/* Glowing Indicator Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-300 font-semibold">
            {progress.percent === 100 ? 'READY' : titleText}
          </span>
        </div>

        {/* Progress Track & Gradient Fill */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2.5 relative">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {/* Numeric Progress Counter */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span className="text-white font-medium">{progress.percent}%</span>
          <span>
            {progress.loaded} / {progress.total} FRAMES
          </span>
        </div>

        {/* Graceful Error Display */}
        {error && (
          <div className="mt-2.5 text-xs font-mono text-red-400 text-center leading-relaxed">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
