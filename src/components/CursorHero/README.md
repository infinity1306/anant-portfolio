# CursorHero 🎭

> A high-performance, production-ready, cursor-following character hero component for React and Next.js applications.

`CursorHero` renders a pre-decoded WebP character sequence on a hardware-accelerated HTML5 `<canvas>`. As the visitor moves their pointer anywhere across the hero section, the character's head and gaze smoothly track the cursor in real-time with continuous directional interpolation, zero lazy-decoding hitching, and 60–240Hz refresh rates.

---

## Features

- **Zero Runtime Decode Overhead**: All frames are pre-fetched and pre-decoded into GPU memory as `ImageBitmap` objects before interaction begins.
- **Concurrent Preloader**: Controlled background loading queue (e.g. 8–12 concurrent workers) with automatic retry and authentic progress reporting (`0%` → `100%`).
- **Continuous 2D Directional Field**: Seamless 360° gaze following without hard 45° snapping.
- **Delta-Time Frame Smoothing**: Decoupled `targetFrame` and `displayedFrame` system prevents frame skipping during swift mouse sweeps while maintaining immediate (< 20ms) response latency.
- **Redundant Draw Elimination**: Canvas `drawImage` executes ONLY when the rendered frame changes, keeping CPU/GPU idle during stationary cursor periods.
- **Universal Accessibility**: Automatically honors `prefers-reduced-motion: reduce` and mobile touch devices by locking to a static neutral frame and saving network bandwidth.
- **Full Customizability**: Configurable frame counts, filenames, frame extensions, directional maps, children layout, typography, and styling.
- **Zero Heavy Dependencies**: Pure React + HTML5 Canvas API + Browser Web APIs. No Three.js, GSAP, or heavy animation runtimes required.

---

## Installation

Copy the `src/components/CursorHero/` directory into your project:

```bash
components/
└── CursorHero/
    ├── CursorHero.tsx
    ├── CursorHeroCanvas.tsx
    ├── CursorHeroPreloader.tsx
    ├── cursorHero.types.ts
    ├── cursorHero.constants.ts
    ├── cursorHero.mapping.ts
    ├── cursorHero.utils.ts
    ├── useCursorHero.ts
    └── index.ts
```

Import it directly into your page or layout:

```tsx
import { CursorHero } from '@/components/CursorHero';
```

---

## Examples

### Example 1: Minimal Hero

```tsx
import React from 'react';
import { CursorHero } from '@/components/CursorHero';

export default function Page() {
  return (
    <CursorHero
      frames="/character-frames"
      frameCount={240}
      title="Build Cinematic Web Products"
      subtitle="Creative Technologist & Interface Engineer"
      eyebrow="PORTFOLIO 2026"
      cta={{
        label: 'View Projects',
        href: '#works',
      }}
      secondaryCta={{
        label: 'Contact Me',
        href: '#contact',
      }}
    />
  );
}
```

---

### Example 2: Custom Children & Layout

You can pass arbitrary React children to completely control the hero typography, navigation, or layout:

```tsx
import React from 'react';
import { CursorHero } from '@/components/CursorHero';

export default function CustomHero() {
  return (
    <CursorHero
      frames="/character-frames"
      frameCount={240}
      tracking={{ responseSpeed: 26.0, deadZone: 0.04 }}
      character={{ scale: 1.05 }}
    >
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8">
        <span className="text-red-400 font-mono text-xs uppercase tracking-widest mb-3">
          Interactive Studio
        </span>
        <h1 className="text-6xl font-black text-white leading-tight">
          Interfaces That <span className="text-red-500">Look Back</span>.
        </h1>
        <p className="text-neutral-400 mt-4 text-lg">
          Custom children replace default title rendering while preserving all cursor tracking.
        </p>
      </div>
    </CursorHero>
  );
}
```

---

### Example 3: Different Frame Sequence (e.g. 120-frame character)

```tsx
import React from 'react';
import { CursorHero, FrameMapConfig } from '@/components/CursorHero';

// Custom directional keyframe definitions for a 120-frame animation
const custom120Map: FrameMapConfig = {
  name: 'robot-120',
  frameCount: 120,
  fps: 24.0,
  deadZone: 0.05,
  nodes: {
    RIGHT: { startFrame: 28, peakFrame: 36, label: 'RIGHT' },
    UP_RIGHT: { startFrame: 19, peakFrame: 24, label: 'UP-RIGHT' },
    UP: { startFrame: 12, peakFrame: 19, label: 'UP' },
    UP_LEFT: { startFrame: 87, peakFrame: 92, label: 'UP-LEFT' },
    LEFT: { startFrame: 82, peakFrame: 85, label: 'LEFT' },
    DOWN_LEFT: { startFrame: 62, peakFrame: 70, label: 'DOWN-LEFT' },
    DOWN: { startFrame: 49, peakFrame: 56, label: 'DOWN' },
    DOWN_RIGHT: { startFrame: 39, peakFrame: 44, label: 'DOWN-RIGHT' },
    CENTER: { frame: 0, label: 'CENTER' },
  },
};

export default function RobotHero() {
  return (
    <CursorHero
      frames="/robot-frames"
      frameCount={120}
      framePrefix="robot_"
      frameExtension="webp"
      zeroPadding={3}
      frameMap={custom120Map}
      title="Autonomous Autonomous Agent"
      subtitle="Driven by 120 keyframes"
    />
  );
}
```

---

## Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `frames` | `string` | `'/character-frames'` | Path or URL directory containing WebP frames |
| `frameCount` | `number` | `240` | Total number of frames in the sequence |
| `framePrefix` | `string` | `'frame_'` | Filename prefix (e.g. `'frame_'` for `frame_000.webp`) |
| `frameExtension` | `string` | `'webp'` | Image extension (`'webp'`, `'png'`, `'jpg'`) |
| `zeroPadding` | `number` | `3` | Padded number digits (`3` for `000` to `239`) |
| `startFrame` | `number` | `0` | Starting index (`0` or `1`) |
| `preset` | `string` | `'character-240'` | Built-in directional preset (`'character-240'`) |
| `frameMap` | `FrameMapConfig` | `undefined` | Custom directional keyframe definition |
| `eyebrow` | `ReactNode` | `undefined` | Pre-title badge / category tag |
| `title` | `ReactNode` | `undefined` | Main heading content |
| `subtitle` | `ReactNode` | `undefined` | Supporting paragraph content |
| `cta` | `CursorHeroCTA` | `undefined` | Primary action button (`{ label, href, onClick }`) |
| `secondaryCta` | `CursorHeroCTA` | `undefined` | Secondary action button |
| `children` | `ReactNode` | `undefined` | Custom markup replacing default typography layer |
| `tracking` | `CursorHeroTrackingOptions` | `{}` | Responsiveness, speed, dead-zone, and neutral return |
| `character` | `CursorHeroCharacterOptions` | `{}` | Scale, position offsets, fit (`contain`/`cover`), and max DPR |
| `preload` | `boolean \| CursorHeroPreloadOptions` | `true` | Concurrency, preloader UI visibility, and title text |
| `preloadConcurrency` | `number` | `8` | Simultaneous network requests during preloading |
| `showHud` | `boolean` | `true` | Directional pill at bottom of canvas |
| `showDebugHud` | `boolean` | `DEV ? true : false` | Real-time FPS, frame delta, and polar coordinate monitor |
| `onLoad` | `() => void` | `undefined` | Fired when all frames finish decoding and canvas is ready |
| `onProgress` | `(progress) => void` | `undefined` | Fired during preloading with `{ loaded, total, percent }` |
| `onError` | `(error) => void` | `undefined` | Fired if asset loading fails after retries |
| `onFrameChange` | `(frameIndex, dir) => void` | `undefined` | Fired when a new frame is drawn to canvas |

---

## Advanced Architecture & Headless Hook

If you wish to build completely custom markup or canvas layouts, you can use the headless hook `useCursorHero`:

```tsx
import { useCursorHero } from '@/components/CursorHero';

export function HeadlessCharacter() {
  const { canvasRef, isReady, progress } = useCursorHero({
    frames: '/character-frames',
    frameCount: 240,
    tracking: { responseSpeed: 24.0 },
  });

  return (
    <div className="relative">
      {!isReady && <div>Loading: {progress.percent}%</div>}
      <canvas ref={canvasRef} width={848} height={480} />
    </div>
  );
}
```

---

## Troubleshooting

- **Frames failing to load**: Ensure your static asset directory is located in `public/character-frames/` and files are named `frame_000.webp` through `frame_239.webp`.
- **Canvas appears blurry on high-DPI screens**: The component automatically adapts to `devicePixelRatio` up to `maxDpr` (default: 2.0).
- **Mobile devices not tracking cursor**: Mobile touch devices are intentionally set to static neutral front by default to save battery and GPU memory. Set `tracking={{ enabled: true }}` to force tracking on coarse pointers if desired.
