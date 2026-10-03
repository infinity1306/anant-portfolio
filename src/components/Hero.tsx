import React from 'react';
import { CursorHero } from './CursorHero';
import { ArrowRight, Eye, Sparkles, Cpu, Compass, MousePointer } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <CursorHero
      id="hero"
      frames="/character-frames"
      frameCount={240}
      tracking={{
        enabled: true,
        responseSpeed: 24.0,
        deadZone: 0.04,
        maxRadius: 1.0,
        returnToNeutral: true,
      }}
      eyebrow={
        <>
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>Awwwards-Level Interactive Hero</span>
          <span className="text-white/20">•</span>
          <span className="text-red-400 font-medium">Timeline Scrubber</span>
        </>
      }
      title={
        <>
          Living Interfaces That{' '}
          <span className="bg-gradient-to-r from-white via-neutral-200 to-red-400 bg-clip-text text-transparent">
            Gaze Back
          </span>{' '}
          At You.
        </>
      }
      subtitle={
        <>
          Hi, I am <strong className="text-white font-semibold">Anant</strong>. I design and build high-performance creative engineering systems, fluid micro-interactions, and cinematic web products.
        </>
      }
      belowCharacter={
        <div className="w-full flex flex-col items-center">
          {/* Interactive Hint Underneath */}
          <div className="mt-5 flex items-center justify-center gap-3 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10">
              <MousePointer className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              <span>Move your cursor anywhere across the hero section</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-time gaze interpolation</span>
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a href="#works" className="btn-primary">
              <span>Explore Selected Works</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#philosophy" className="btn-secondary">
              <span>Technical Architecture</span>
              <Cpu className="w-4 h-4 text-neutral-400" />
            </a>
          </div>

          {/* Floating Feature Cards (Bento Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-16 text-left">
            <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-red-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-3">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">Timeline Scrubbing</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Native HTML5 paused video frame indexing with 60 FPS lerp interpolation and zero decode lag.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-red-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-3">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">Dual-Vector Mapping</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Normalized X axis drives head yaw while subtle Y elevation adds vertical gaze depth.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-red-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">Universal Access</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Automatic touch detection, dead-zone anti-jitter, and prefers-reduced-motion compliance.
              </p>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default Hero;
