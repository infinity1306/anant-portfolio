import React from 'react';
import { ArrowUp, Mail, Globe, Code, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/5 py-16 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-2 font-display font-bold text-white text-lg">
            <span>ANANT</span>
            <span className="text-red-500">•</span>
            <span className="text-neutral-400 font-mono text-xs font-normal">Interactive Portfolio</span>
          </div>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Hardware-Accelerated Video Scrubber • Bi-Directional Gaze Engine.
          </p>
        </div>

        <div className="flex items-center gap-4 text-neutral-400 text-xs font-mono">
          <a
            href="mailto:anant@example.com"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-colors"
            aria-label="Email"
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-colors"
            aria-label="GitHub"
          >
            <Code className="w-4 h-4" />
          </a>
          <a
            href="https://anant.dev"
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-colors"
            aria-label="Website"
          >
            <Globe className="w-4 h-4" />
          </a>
          <button
            onClick={scrollToTop}
            className="w-9 h-9 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 flex items-center justify-center border border-red-500/30 transition-colors cursor-pointer ml-2"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-400 gap-4">
        <span>© {new Date().getFullYear()} Anant. All rights reserved.</span>
        <span className="flex items-center gap-1.5 text-neutral-500">
          <Sparkles className="w-3 h-3 text-red-400" />
          Awwwards Standard • Designed with Precision
        </span>
      </div>
    </footer>
  );
};

export default Footer;
