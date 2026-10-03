import React from 'react';
import { ExternalLink, Layers, Sparkles, Terminal, Activity } from 'lucide-react';

interface Project {
  title: string;
  category: string;
  description: string;
  tags: string[];
  metrics: string;
}

const PROJECTS: Project[] = [
  {
    title: 'Aura Interactive Engine',
    category: 'Creative Engineering / WebGL',
    description: 'Hardware-accelerated gaze tracking interface for luxury product storytelling and interactive character hero canvases.',
    tags: ['WebGL', 'HTML5 Video', 'React', 'GLSL'],
    metrics: '60 FPS • <12ms Latency',
  },
  {
    title: 'Chronos Digital Terminal',
    category: 'Design Systems & Motion',
    description: 'Ultra-low latency algorithmic trading interface featuring custom canvas data visualizers and micro-haptic physics.',
    tags: ['TypeScript', 'Design Systems', 'WebSockets', 'Canvas API'],
    metrics: '99.99% Uptime • 120Hz',
  },
  {
    title: 'Vani Voice Assistant System',
    category: 'Edge AI & Onnx Runtime',
    description: 'Real-time neural voice inference architecture with custom acoustic feature extractors and conversational state graphs.',
    tags: ['C++', 'ONNX', 'TypeScript', 'Audio Worklet'],
    metrics: '85ms TTFT • Local On-Device',
  },
];

export const Works: React.FC = () => {
  return (
    <section id="works" className="py-24 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Curated Portfolio</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Selected Works & Experiments
          </h2>
        </div>
        <p className="text-neutral-400 text-sm max-w-md mt-4 md:mt-0 font-normal">
          A blend of engineering precision and high-fidelity interaction design built for discerning global products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PROJECTS.map((proj, idx) => (
          <div
            key={idx}
            className="group glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-red-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-4">
                <span>0{idx + 1} // {proj.category}</span>
                <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-red-400 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors mb-3">
                {proj.title}
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-6 font-normal">
                {proj.description}
              </p>
            </div>

            <div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {proj.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-1 rounded-md bg-white/[0.04] text-[11px] font-mono text-neutral-300 border border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Activity className="w-3 h-3" />
                  {proj.metrics}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Works;
