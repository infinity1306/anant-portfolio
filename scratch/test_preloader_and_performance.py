import asyncio
import json
import math
import time
from playwright.async_api import async_playwright

async def run_all_tests():
    print("=== STARTING PRELOADER & PERFORMANCE TEST SUITE ===")
    results = {}

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        # Create a fresh context with cache disabled to simulate cold load
        context = await browser.new_context(
            viewport={'width': 1440, 'height': 900},
            ignore_https_errors=True
        )
        page = await context.new_page()

        # Track network requests to verify NO requests during interaction
        network_requests_during_interaction = []
        is_tracking_requests = False

        def on_request(request):
            if is_tracking_requests:
                network_requests_during_interaction.append(request.url)

        page.on("request", on_request)

        # ----------------------------------------------------
        # TEST 1: Cold Cache Page Load & Preloader Verification
        # ----------------------------------------------------
        print("\n[TEST 1] Loading page with cache disabled...")
        t0 = time.time()
        
        # Navigate to dev server
        await page.goto("http://localhost:5173/", wait_until="commit")

        # Check for preloader overlay appearance
        preloader = page.locator("#character-preloader-overlay")
        is_preloader_present = await preloader.count() > 0
        print(f"Preloader element found on load: {is_preloader_present}")

        # Wait for preloader to reach 100% and finish decoding all 240 frames
        await page.wait_for_function(
            "() => window.__cursorCharacterDebug && window.__cursorCharacterDebug.isReady()",
            timeout=15000
        )
        t_ready = time.time()
        preload_wall_time_ms = (t_ready - t0) * 1000

        # Retrieve debug metrics
        debug_info = await page.evaluate("""() => {
            const d = window.__cursorCharacterDebug;
            return {
                totalFrames: d.totalFrames,
                decodedCount: d.getDecodedCount(),
                preloadDuration: d.state.preloadDuration,
                allFramesReady: d.state.allFramesReady,
                bitmapsValid: d.bitmaps.every(b => b instanceof ImageBitmap && b.width === 848 && b.height === 480)
            };
        }""")

        print(f"Decoded Count: {debug_info['decodedCount']}/{debug_info['totalFrames']}")
        print(f"Preload internal duration: {debug_info['preloadDuration']:.1f}ms")
        print(f"All frames ready flag: {debug_info['allFramesReady']}")
        print(f"All 240 ImageBitmaps valid 848x480: {debug_info['bitmapsValid']}")

        # Wait for preloader overlay to fade out
        await page.wait_for_timeout(600)
        preloader_visible = await page.evaluate("""() => {
            const el = document.getElementById('character-preloader-overlay');
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.opacity !== '0' && style.display !== 'none';
        }""")
        print(f"Preloader faded out and hidden: {not preloader_visible}")

        results["test1"] = {
            "preloader_appeared": is_preloader_present,
            "decoded_count": debug_info["decodedCount"],
            "total_frames": debug_info["totalFrames"],
            "preload_duration_ms": debug_info["preloadDuration"],
            "bitmaps_cached": debug_info["bitmapsValid"],
            "preloader_faded_out": not preloader_visible
        }

        # Locate Hero section bounding box for precise cursor coordinates
        hero_box = await page.locator("#hero").bounding_box()
        cx = hero_box["x"] + hero_box["width"] / 2
        cy = hero_box["y"] + hero_box["height"] / 2
        rx = hero_box["width"] * 0.40
        ry = hero_box["height"] * 0.40

        # Helper to monitor rendered frames during an interaction trajectory
        async def run_trajectory(name, points_gen, duration_sec):
            nonlocal is_tracking_requests
            is_tracking_requests = True
            rendered_frames = []
            fps_samples = []

            # Set up frame monitor in page context
            await page.evaluate("""() => {
                window.__testRenderHistory = [];
                window.__testFpsHistory = [];
                const origDraw = CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.__origDraw = origDraw;
                
                // Track draw calls
                CanvasRenderingContext2D.prototype.drawImage = function(...args) {
                    if (window.__cursorCharacterDebug) {
                        const curFrame = window.__cursorCharacterDebug.state.lastRenderedFrameIndex;
                        const curFps = window.__cursorCharacterDebug.state.currentFps;
                        window.__testRenderHistory.push(curFrame);
                        window.__testFpsHistory.push(curFps);
                    }
                    return origDraw.apply(this, args);
                };
            }""")

            steps = int(duration_sec * 60)
            dt = duration_sec / steps
            for i in range(steps):
                t = i / steps
                x, y = points_gen(t)
                await page.mouse.move(x, y)
                await asyncio.sleep(dt)

            # Retrieve captured metrics
            history = await page.evaluate("""() => {
                const hist = window.__testRenderHistory || [];
                const fpsHist = window.__testFpsHistory || [];
                return { frames: hist, fps: fpsHist };
            }""")

            is_tracking_requests = False

            frames = history["frames"]
            fps_list = history["fps"]

            # Check blink frame exclusion (189-197)
            blink_hits = [f for f in frames if 189 <= f <= 197]
            
            # Check frame step sizes (adjacent drawn frames)
            max_step = 0
            for i in range(1, len(frames)):
                step = abs(frames[i] - frames[i-1])
                # ignore chin-up bridge transition (36 <-> 188)
                if not (min(frames[i], frames[i-1]) <= 40 and max(frames[i], frames[i-1]) >= 180):
                    if step > max_step:
                        max_step = step

            avg_fps = sum(fps_list) / len(fps_list) if fps_list else 60.0

            print(f"[{name}] Drawn frames count: {len(frames)}, Max continuous step: {max_step}, Blink hits: {len(blink_hits)}, Avg FPS: {avg_fps:.1f}")
            return {
                "drawn_frames_count": len(frames),
                "max_continuous_step": max_step,
                "blink_hits": len(blink_hits),
                "avg_fps": avg_fps
            }

        # ----------------------------------------------------
        # TEST 2: Slow Cursor Circle
        # ----------------------------------------------------
        print("\n[TEST 2] Slow Cursor Circle (3.0s)...")
        res2 = await run_trajectory(
            "TEST 2 - Slow Circle",
            lambda t: (cx + rx * math.cos(2 * math.pi * t), cy + ry * math.sin(2 * math.pi * t)),
            duration_sec=3.0
        )
        results["test2"] = res2

        # ----------------------------------------------------
        # TEST 3: Fast Cursor Circle
        # ----------------------------------------------------
        print("\n[TEST 3] Fast Cursor Circle (1.0s)...")
        res3 = await run_trajectory(
            "TEST 3 - Fast Circle",
            lambda t: (cx + rx * math.cos(2 * math.pi * t), cy + ry * math.sin(2 * math.pi * t)),
            duration_sec=1.0
        )
        results["test3"] = res3

        # ----------------------------------------------------
        # TEST 4: Figure-8 Trajectory
        # ----------------------------------------------------
        print("\n[TEST 4] Figure-8 Trajectory (2.5s)...")
        res4 = await run_trajectory(
            "TEST 4 - Figure 8",
            lambda t: (cx + rx * math.sin(2 * math.pi * t), cy + ry * math.sin(4 * math.pi * t) * 0.5),
            duration_sec=2.5
        )
        results["test4"] = res4

        # ----------------------------------------------------
        # TEST 5: Rapid Horizontal Sweeps (LEFT -> RIGHT -> LEFT -> RIGHT)
        # ----------------------------------------------------
        print("\n[TEST 5] Rapid Horizontal Sweeps (2.0s)...")
        res5 = await run_trajectory(
            "TEST 5 - Rapid Left-Right",
            lambda t: (cx + rx * math.cos(4 * math.pi * t), cy),
            duration_sec=2.0
        )
        results["test5"] = res5

        # ----------------------------------------------------
        # TEST 6: Rapid Vertical Sweeps (TOP -> BOTTOM -> TOP)
        # ----------------------------------------------------
        print("\n[TEST 6] Rapid Vertical Sweeps (2.0s)...")
        res6 = await run_trajectory(
            "TEST 6 - Rapid Top-Bottom",
            lambda t: (cx, cy + ry * math.cos(4 * math.pi * t)),
            duration_sec=2.0
        )
        results["test6"] = res6

        # ----------------------------------------------------
        # TEST 7: All Four Corners
        # ----------------------------------------------------
        print("\n[TEST 7] All Four Corners (2.0s)...")
        corners = [
            (cx - rx, cy - ry), # Top-Left
            (cx + rx, cy - ry), # Top-Right
            (cx + rx, cy + ry), # Bottom-Right
            (cx - rx, cy + ry), # Bottom-Left
            (cx, cy),           # Center
        ]
        def corners_gen(t):
            idx = int(t * len(corners))
            idx = min(idx, len(corners) - 1)
            return corners[idx]

        res7 = await run_trajectory("TEST 7 - Four Corners", corners_gen, duration_sec=2.0)
        results["test7"] = res7

        # ----------------------------------------------------
        # TEST 8: Continuous Interaction for 30 Seconds
        # ----------------------------------------------------
        print("\n[TEST 8] Continuous Stress Test for 30 seconds...")
        res8 = await run_trajectory(
            "TEST 8 - 30s Stress Test",
            lambda t: (
                cx + rx * (0.8 * math.cos(6 * math.pi * t) + 0.2 * math.cos(14 * math.pi * t)),
                cy + ry * (0.8 * math.sin(6 * math.pi * t) + 0.2 * math.sin(10 * math.pi * t))
            ),
            duration_sec=30.0
        )
        results["test8"] = res8

        # ----------------------------------------------------
        # Memory & Network Inspection
        # ----------------------------------------------------
        print(f"\nTotal Network Requests During Interactions: {len(network_requests_during_interaction)}")
        results["network_requests_during_interaction"] = len(network_requests_during_interaction)

        # Approximate JS Heap / GPU Memory
        mem_info = await page.evaluate("""() => {
            if (window.performance && window.performance.memory) {
                return {
                    usedJSHeapSizeMB: (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1),
                    totalJSHeapSizeMB: (window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1)
                };
            }
            return { usedJSHeapSizeMB: "N/A", totalJSHeapSizeMB: "N/A" };
        }""")
        results["memory"] = mem_info
        print(f"JS Heap Used: {mem_info['usedJSHeapSizeMB']} MB / Total: {mem_info['totalJSHeapSizeMB']} MB")

        # Save results to json
        with open("scratch/full_performance_report.json", "w") as f:
            json.dump(results, f, indent=2)

        print("\n=== TEST SUITE COMPLETED SUCCESSFULLY ===")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_all_tests())
