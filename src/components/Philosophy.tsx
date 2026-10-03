import React from 'react';
import { Terminal, Shield, Zap, Layers, RefreshCw } from 'lucide-react';

export const Philosophy: React.FC = () => {
  return (
    <section id="philosophy" className="py-20 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/10 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Under The Hood</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
            Architected For Natural Micro-Motion
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-8">
            Rather than relying on resource-intensive 3D models or artificial 2D skeletal warps, this system harnesses native HTML5 video frame scrubbing calibrated to continuous mathematical vector interpolation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-red-400">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Non-Blocking Seek Pipeline</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Decoupled target timestamp computation from hardware video decode events prevents buffer overflow and frame stuttering.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-red-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Dual-Zone Horizon Mapping</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Smooth timeline branching seamlessly unifies directional gaze vectors without disruptive 360° reverse loops.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-red-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">WCAG 2.2 AA Motion Hygiene</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Built-in media query listeners honor <code className="text-red-300 font-mono text-[10px]">prefers-reduced-motion</code> to protect users prone to vestibular motion triggers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-red-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Touch Device Fallback</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Coarse pointer detection automatically maintains the character at an elegant front-facing neutral portrait on mobile browsers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
