import React from 'react';
import { CursorHeroProps } from './cursorHero.types';
import { useCursorHero } from './useCursorHero';
import { CursorHeroCanvas } from './CursorHeroCanvas';
import { CursorHeroPreloader } from './CursorHeroPreloader';
import { ArrowRight } from 'lucide-react';

export const CursorHero: React.FC<CursorHeroProps> = (props) => {
  const {
    id = 'hero',
    eyebrow,
    title,
    subtitle,
    cta,
    secondaryCta,
    children,
    belowCharacter,
    character,
    preload,
    className = '',
    contentClassName = '',
    canvasClassName = '',
    preloaderClassName = '',
    showHud = true,
    showDebugHud = import.meta.env.DEV,
  } = props;

  const {
    canvasRef,
    containerRef,
    isReady,
    isInteractive,
    progress,
    error,
    hudLabelRef,
    debugRefs,
  } = useCursorHero(props);

  const preloadOpts = typeof preload === 'object' ? preload : undefined;
  const shouldShowPreloader =
    preload === false || preloadOpts?.showPreloader === false ? false : true;

  return (
    <section
      id={id}
      ref={containerRef}
      className={`cursor-hero relative w-full flex flex-col justify-center items-center px-4 sm:px-8 py-12 sm:py-16 overflow-hidden ${className}`}
    >
      {/* Dynamic Background Atmosphere */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-600/10 blur-[130px] rounded-full -z-10" />

      {/* Main Responsive Container */}
      <div className="max-w-6xl mx-auto w-full flex flex-col items-center text-center">
        {/* Render Custom Children OR Configurable Content */}
        {children ? (
          <div className={`cursor-hero__content w-full ${contentClassName}`}>{children}</div>
        ) : (
          <div className={`cursor-hero__content flex flex-col items-center ${contentClassName}`}>
            {/* Optional Eyebrow Tag */}
            {eyebrow && (
              <div className="cursor-hero__eyebrow inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-neutral-300 mb-6 shadow-sm">
                {eyebrow}
              </div>
            )}

            {/* Configurable Hero Title */}
            {title && (
              <h1 className="cursor-hero__title text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
                {title}
              </h1>
            )}

            {/* Configurable Subtitle */}
            {subtitle && (
              <p className="cursor-hero__subtitle text-base sm:text-lg text-neutral-400 max-w-2xl font-normal leading-relaxed mb-10">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Interactive Character Showcase Area */}
        <div className="cursor-hero__visual-area relative w-full max-w-3xl my-2 flex flex-col items-center">
          <div className="relative w-full overflow-hidden rounded-3xl">
            {/* Canvas Renderer */}
            <CursorHeroCanvas
              ref={canvasRef}
              character={character}
              className={canvasClassName}
              isInteractive={isInteractive}
            />

            {/* Modular Preloader */}
            {shouldShowPreloader && (
              <CursorHeroPreloader
                progress={progress}
                isReady={isReady}
                error={error}
                titleText={preloadOpts?.titleText}
                fadeDurationMs={preloadOpts?.fadeDurationMs}
                className={preloaderClassName}
              />
            )}

            {/* Development-Only Direction & Performance Debug HUD */}
            {showDebugHud && (
              <div
                id="debug-hud-panel"
                className="absolute top-4 right-4 z-20 pointer-events-none font-mono text-[11px] bg-black/85 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2.5 text-neutral-300 shadow-2xl flex flex-col gap-1 text-left select-none max-w-[280px]"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-red-400 font-bold mb-0.5">
                  <span>Performance & Direction HUD</span>
                  <span ref={debugRefs.fpsRef} className="text-emerald-400 font-bold">
                    60 FPS
                  </span>
                </div>
                <div id="debug-hud-coords">
                  Cursor X: <span ref={debugRefs.xRef} className="text-white font-semibold">0.00</span> | Y:{' '}
                  <span ref={debugRefs.yRef} className="text-white font-semibold">0.00</span>
                </div>
                <div id="debug-hud-polar">
                  Angle: <span ref={debugRefs.angleRef} className="text-amber-400 font-semibold">0.0°</span> |
                  Radius: <span ref={debugRefs.radiusRef} className="text-amber-400 font-semibold">0.00</span>
                </div>
                <div id="debug-hud-primary">
                  Primary: <span ref={debugRefs.primaryDirRef} className="text-emerald-400 font-semibold">CENTER</span>
                </div>
                <div id="debug-hud-secondary">
                  Secondary: <span ref={debugRefs.secondaryDirRef} className="text-sky-400 font-semibold">CENTER</span>
                </div>
                <div id="debug-hud-weights">
                  Weight: <span ref={debugRefs.weightsRef} className="text-purple-400 font-semibold">100% / 0%</span>
                </div>
                <div id="debug-hud-frames" className="border-t border-white/10 pt-1 mt-0.5 flex flex-col gap-0.5">
                  <div>
                    <span ref={debugRefs.targetFrameRef} className="text-amber-300 font-semibold">TF: 0.0</span> |{' '}
                    <span ref={debugRefs.displayedFrameRef} className="text-white font-semibold">DF: 0.0 (F0)</span>
                  </div>
                  <div>
                    <span ref={debugRefs.frameDeltaRef} className="text-purple-300 font-semibold">Δ: 0.00</span> | Draw:{' '}
                    <span ref={debugRefs.drawTimeRef} className="text-emerald-300 font-semibold">0.00ms</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Preload: <span ref={debugRefs.preloadTimeRef} className="text-neutral-200">0ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Direction Status HUD Pill */}
            {showHud && isInteractive && (
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                <div className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-neutral-300">
                  <span className="text-red-400 font-medium mr-1.5">DIR:</span>
                  <span ref={hudLabelRef} id="hud-direction-label">
                    Front / Neutral
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-neutral-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Pre-decoded ImageBitmap GPU Renderer
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optional Content Rendered Directly Beneath Character Showcase */}
        {belowCharacter && (
          <div className="cursor-hero__below-character w-full flex flex-col items-center">
            {belowCharacter}
          </div>
        )}

        {/* Optional Action CTAs (rendered if cta or secondaryCta are passed and children not provided) */}
        {!children && (cta || secondaryCta) && (
          <div className="cursor-hero__actions mt-10 flex flex-wrap items-center justify-center gap-4">
            {cta && (
              <a
                href={cta.href || '#'}
                onClick={cta.onClick}
                target={cta.target}
                className={`btn-primary ${cta.className || ''}`}
              >
                <span>{cta.label}</span>
                {cta.icon || <ArrowRight className="w-4 h-4" />}
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.href || '#'}
                onClick={secondaryCta.onClick}
                target={secondaryCta.target}
                className={`btn-secondary ${secondaryCta.className || ''}`}
              >
                <span>{secondaryCta.label}</span>
                {secondaryCta.icon}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CursorHero;
