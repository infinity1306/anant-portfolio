import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-6 z-50 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <nav className="glass-panel rounded-full px-6 py-3.5 flex items-center justify-between shadow-2xl border border-white/10">
        {/* Brand */}
        <a href="#hero" className="flex items-center gap-3 group text-decoration-none">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center font-display font-bold text-white shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-white text-base tracking-tight leading-none group-hover:text-red-400 transition-colors">
              ANANT
            </span>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5">
              Creative Technologist
            </span>
          </div>
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-wider text-neutral-300">
          <a href="#hero" className="hover:text-white transition-colors">Interaction</a>
          <a href="#works" className="hover:text-white transition-colors">Works</a>
          <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
          <a href="#stack" className="hover:text-white transition-colors">Stack</a>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Available for Q4
          </div>
          <a
            href="mailto:anant@example.com"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all hover:scale-105"
          >
            <span>Let's Talk</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
