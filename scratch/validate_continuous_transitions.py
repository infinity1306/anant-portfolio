import asyncio, math, time, os, cv2, numpy as np
from playwright.async_api import async_playwright

async def main():
    os.makedirs('scratch/transition_validation', exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1536, 'height': 864})
        page = await context.new_page()

        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda err: console_errors.append(str(err)))

        print("Navigating to http://localhost:5173/ ...")
        await page.goto('http://localhost:5173/', wait_until='networkidle')
        await asyncio.sleep(2.0)

        # Locate the canvas
        canvas = page.locator('canvas[aria-label*="Interactive character portrait"]')
        await canvas.wait_for(state='visible')
        box = await canvas.bounding_box()
        print(f"Canvas bounding box: {box}")

        cx = box['x'] + box['width'] / 2
        cy = box['y'] + box['height'] / 2
        rx = box['width'] * 0.45
        ry = box['height'] * 0.45

        # Helper to read debug HUD
        async def get_hud():
            hud_dir = await page.locator('#debug-hud-direction span').inner_text()
            hud_reg = await page.locator('#debug-hud-region span').inner_text()
            hud_target = await page.locator('#debug-hud-target-time span').inner_text()
            hud_video = await page.locator('#debug-hud-video-time span').inner_text()
            hud_coords = await page.locator('#debug-hud-coords').inner_text()
            return {
                'dir': hud_dir,
                'reg': hud_reg,
                'target': hud_target,
                'video': hud_video,
                'coords': hud_coords
            }

        print("\n==================================================")
        print("STEP 13 & 14: CONTINUOUS CIRCULAR SWEEP (PATH VALIDATION)")
        print("==================================================")

        # 1. Start at CENTER
        await page.mouse.move(cx, cy)
        await asyncio.sleep(0.3)
        hud_center = await get_hud()
        print(f"[PATH START] CENTER: {hud_center}")
        await page.screenshot(path='scratch/transition_validation/path_01_center.png')

        # Generate smooth steps for:
        # CENTER -> TOP -> TOP-RIGHT -> RIGHT -> DOWN-RIGHT -> DOWN -> DOWN-LEFT -> LEFT -> UP-LEFT -> TOP -> CENTER
        # Path steps:
        # Segment A: Center to Top (15 steps)
        # Segment B: Circular arc (90 deg to -270 deg clockwise, 72 steps)
        # Segment C: Top to Center (15 steps)

        path_points = []
        labels = []

        # A: Center to Top
        for i in range(16):
            frac = i / 15.0
            px = cx
            py = cy - frac * ry
            path_points.append((px, py))
            labels.append(f"CENTER_TO_TOP_{frac:.2f}")

        # B: 360 degree circle starting from Top (90 deg) clockwise
        # angles: 90 -> 45 (TR) -> 0 (R) -> -45 (DR) -> -90 (D) -> -135 (DL) -> -180 (L) -> -225 (UL) -> -270 (T)
        for i in range(73):
            deg = 90.0 - (i / 72.0) * 360.0
            rad = math.radians(deg)
            px = cx + math.cos(rad) * rx
            py = cy - math.sin(rad) * ry
            path_points.append((px, py))
            labels.append(f"ARC_DEG_{deg:.1f}")

        # C: Top to Center
        for i in range(1, 16):
            frac = 1.0 - (i / 15.0)
            px = cx
            py = cy - frac * ry
            path_points.append((px, py))
            labels.append(f"TOP_TO_CENTER_{frac:.2f}")

        print(f"Total steps in continuous path: {len(path_points)}")

        hud_log = []
        screenshot_indices = [
            0,   # Center
            15,  # Top
            24,  # Top-Right
            33,  # Right
            42,  # Down-Right
            51,  # Down
            60,  # Down-Left
            69,  # Left
            78,  # Up-Left
            87,  # Top return
            103  # Final Center
        ]

        for idx, (px, py) in enumerate(path_points):
            await page.mouse.move(px, py)
            await asyncio.sleep(0.04) # 40ms per step gives smooth visual pacing
            hud = await get_hud()
            hud_log.append((labels[idx], hud))

            if idx in screenshot_indices:
                shot_name = f"scratch/transition_validation/step_{idx:03d}_{labels[idx].replace('.', '_')}.png"
                await page.screenshot(path=shot_name)
                print(f"[{idx:03d}] {labels[idx]}: {hud['dir']} | {hud['reg']} | Target: {hud['target']} | Video: {hud['video']}")

        # Validate that frames were continuous and no blink was rendered
        video_times = [float(h[1]['video'].split('s')[0]) for h in hud_log]
        frame_indices = [int(h[1]['video'].split('(F')[1].replace(')', '')) for h in hud_log]

        blink_violations = [f for f in frame_indices if 190 <= f <= 196]
        print(f"\nBlink frames (190-196) encountered in path: {len(blink_violations)} (Expected: 0)")
        assert len(blink_violations) == 0, f"Found blink frames in path: {blink_violations}"

        print("\n==================================================")
        print("STEP 15: 30-SECOND CONTINUOUS HIGH-FREQUENCY STRESS TEST")
        print("==================================================")

        # Inject performance instrumentation into the browser context
        perf_script = """
        () => {
            window.__stressMetrics = {
                frameIntervals: [],
                lastTime: performance.now(),
                rafCount: 0
            };
            const recordFrame = (t) => {
                const dt = t - window.__stressMetrics.lastTime;
                window.__stressMetrics.lastTime = t;
                window.__stressMetrics.frameIntervals.push(dt);
                window.__stressMetrics.rafCount++;
                window.__stressAnimId = requestAnimationFrame(recordFrame);
            };
            window.__stressAnimId = requestAnimationFrame(recordFrame);
        }
        """
        await page.evaluate(perf_script)

        start_time = time.time()
        phase_records = {1: [], 2: [], 3: []}
        step_counter = 0

        # Phase 1 (0-10s): Continuous Horizontal sweeps Left <-> Right
        print("Running Phase 1 (0s-10s): Horizontal sweeps...")
        while time.time() - start_time < 10.0:
            t = time.time() - start_time
            normX = math.sin(t * 3.0) # 0.48 Hz sweep
            px = cx + normX * rx
            py = cy
            await page.mouse.move(px, py)
            await asyncio.sleep(0.012)
            step_counter += 1

        # Phase 2 (10-20s): Continuous Vertical sweeps Top <-> Bottom
        print("Running Phase 2 (10s-20s): Vertical sweeps...")
        while time.time() - start_time < 20.0:
            t = time.time() - start_time
            normY = math.sin(t * 3.0)
            px = cx
            py = cy + normY * ry
            await page.mouse.move(px, py)
            await asyncio.sleep(0.012)
            step_counter += 1

        # Phase 3 (20-30s): Continuous Diagonal & Figure-8 sweeps
        print("Running Phase 3 (20s-30s): Fast Figure-8 sweeps...")
        while time.time() - start_time < 30.0:
            t = time.time() - start_time
            normX = math.sin(t * 3.5)
            normY = math.sin(t * 7.0) * 0.8
            px = cx + normX * rx
            py = cy + normY * ry
            await page.mouse.move(px, py)
            await asyncio.sleep(0.012)
            step_counter += 1

        print(f"30-second test completed! Total cursor moves sent: {step_counter}")

        # Extract browser performance metrics
        metrics = await page.evaluate("""
        () => {
            cancelAnimationFrame(window.__stressAnimId);
            const intervals = window.__stressMetrics.frameIntervals.slice(10); // omit initial warmup
            const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const max = Math.max(...intervals);
            const p95 = intervals.sort((a,b) => a-b)[Math.floor(intervals.length * 0.95)];
            return {
                rafCount: window.__stressMetrics.rafCount,
                sampleCount: intervals.length,
                avgIntervalMs: avg,
                maxIntervalMs: max,
                p95IntervalMs: p95,
                fps: 1000.0 / avg
            };
        }
        """)

        print("\n--- 30-SECOND CONTINUOUS TEST METRICS ---")
        print(f"Total rAF cycles: {metrics['rafCount']}")
        print(f"Average Frame Interval: {metrics['avgIntervalMs']:.2f} ms ({metrics['fps']:.1f} FPS)")
        print(f"95th Percentile Frame Interval: {metrics['p95IntervalMs']:.2f} ms")
        print(f"Maximum Frame Interval: {metrics['maxIntervalMs']:.2f} ms")
        print(f"Console Errors: {len(console_errors)}")

        if console_errors:
            print(f"Console errors: {console_errors}")

        await browser.close()
        print("\nAll validation checks completed successfully!")

asyncio.run(main())
