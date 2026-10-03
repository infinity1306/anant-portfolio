import React, { useState } from 'react';
import { CursorHero } from './CursorHero';
import { DirectionMappingResult } from './cursorHero.types';
import { Sparkles, ArrowRight } from 'lucide-react';

export const CursorHeroDemo: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [direction, setDirection] = useState<string>('CENTER / NEUTRAL');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [loadedFrames, setLoadedFrames] = useState<number>(0);

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Standalone Reusable CursorHero Component Demo */}
      <CursorHero
        frames="/character-frames"
        frameCount={240}
        eyebrow={
          <>
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>Reusable Component Showcase</span>
            <span className="text-white/20">•</span>
            <span className="text-red-400 font-medium">Standalone Module</span>
          </>
        }
        title={
          <>
            Autonomous <span className="bg-gradient-to-r from-white via-neutral-200 to-red-400 bg-clip-text text-transparent">Cursor Hero</span> Module.
          </>
        }
        subtitle="Zero-hardcoding, self-contained interactive character hero. Drop directly into any React or Next.js project with full directional gaze interpolation."
        cta={{
          label: 'Get Component',
          href: '#docs',
          icon: <ArrowRight className="w-4 h-4" />,
        }}
        secondaryCta={{
          label: 'Documentation',
          href: '#props',
        }}
        tracking={{
          enabled: true,
          responseSpeed: 24.0,
          deadZone: 0.04,
          maxRadius: 1.0,
        }}
        onLoad={() => {
          setIsReady(true);
        }}
        onProgress={(p) => {
          setLoadedFrames(p.loaded);
        }}
        onFrameChange={(idx: number, mapping: DirectionMappingResult) => {
          setCurrentFrame(idx);
          setDirection(mapping.direction);
        }}
      />

      {/* Developer Diagnostics Panel (Rendered only in Development Mode) */}
      {import.meta.env.DEV && (
        <aside
          aria-label="Developer Diagnostics"
          className="fixed bottom-6 right-6 z-50 pointer-events-none font-mono text-[11px] bg-black/90 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-neutral-300 shadow-2xl flex flex-col gap-1.5 w-64 select-none"
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-red-400 font-bold border-b border-white/10 pb-1 mb-1">
            <span>Demo Dev Panel</span>
            <span className={isReady ? 'text-emerald-400' : 'text-amber-400'}>
              {isReady ? 'READY' : 'LOADING'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Frames:</span>
            <span className="text-white font-semibold">{loadedFrames} / 240</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Status:</span>
            <span className={isReady ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isReady ? 'READY' : 'INITIALIZING'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Current Frame:</span>
            <span className="text-amber-300 font-semibold">F{currentFrame}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Direction:</span>
            <span className="text-sky-300 font-semibold truncate max-w-[140px] text-right">{direction}</span>
          </div>
        </aside>
      )}
    </div>
  );
};

export default CursorHeroDemo;
