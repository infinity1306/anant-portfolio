import asyncio
import json
import math
import sys
import time
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def verify_preloader_and_trajectories():
    print("=== STARTING DETAILED VERIFICATION ===")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1440, 'height': 900},
            ignore_https_errors=True
        )
        page = await context.new_page()

        # Capture console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))

        print("\n1. Navigating to http://localhost:5173/ with empty cache...")
        t_nav_start = time.time()
        await page.goto("http://localhost:5173/")

        # Check preloader appearance
        preloader_el = page.locator("#character-preloader-overlay")
        try:
            await preloader_el.wait_for(state="attached", timeout=2000)
            print("[OK] #character-preloader-overlay is attached to DOM on load")
            
            # Check text
            text_content = await preloader_el.inner_text()
            print(f"Preloader initial text content:\n{text_content}")
        except Exception as e:
            print(f"Preloader attach error: {e}")

        # Wait for all frames to be ready
        print("\n2. Waiting for all 240 frames to decode...")
        await page.wait_for_function(
            "() => window.__cursorCharacterDebug && window.__cursorCharacterDebug.isReady()",
            timeout=10000
        )
        t_loaded = time.time()
        print(f"[OK] All frames ready in {(t_loaded - t_nav_start):.2f}s")

        debug_state = await page.evaluate("""() => {
            const d = window.__cursorCharacterDebug;
            return {
                decodedCount: d.getDecodedCount(),
                totalFrames: d.totalFrames,
                preloadDuration: d.state.preloadDuration,
                allFramesReady: d.state.allFramesReady,
                bitmapsValid: d.bitmaps.every(b => b instanceof ImageBitmap && b.width === 848 && b.height === 480)
            };
        }""")

        print(f"Decoded Count: {debug_state['decodedCount']}/{debug_state['totalFrames']}")
        print(f"Preload internal duration: {debug_state['preloadDuration']:.1f}ms")
        print(f"Bitmaps valid & cached: {debug_state['bitmapsValid']}")

        # Verify fade out
        await page.wait_for_timeout(600)
        is_hidden = await page.evaluate("""() => {
            const el = document.getElementById('character-preloader-overlay');
            if (!el) return true; // unmounted
            const style = window.getComputedStyle(el);
            return style.opacity === '0' || style.display === 'none';
        }""")
        print(f"[OK] Preloader smoothly faded out / unmounted: {is_hidden}")

        # Check initial drawn frame
        initial_frame = await page.evaluate("() => window.__cursorCharacterDebug.state.lastRenderedFrameIndex")
        print(f"[OK] Initial frame drawn on canvas: Frame {initial_frame}")

        # Move mouse to test directional tracking
        hero = page.locator("#hero")
        box = await hero.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        rx = box["width"] * 0.4
        ry = box["height"] * 0.4

        print("\n3. Testing directional gaze tracking...")
        positions = [
            ("RIGHT", cx + rx, cy),
            ("UP-RIGHT", cx + rx * 0.7, cy - ry * 0.7),
            ("UP", cx, cy - ry),
            ("UP-LEFT", cx - rx * 0.7, cy - ry * 0.7),
            ("LEFT", cx - rx, cy),
            ("DOWN-LEFT", cx - rx * 0.7, cy + ry * 0.7),
            ("DOWN", cx, cy + ry),
            ("DOWN-RIGHT", cx + rx * 0.7, cy + ry * 0.7),
            ("CENTER", cx, cy)
        ]

        for name, px, py in positions:
            await page.mouse.move(px, py)
            await page.wait_for_timeout(200)
            frame_info = await page.evaluate("""() => {
                const s = window.__cursorCharacterDebug.state;
                return {
                    targetFrame: s.targetFrame,
                    displayedFrame: s.displayedFrame,
                    renderedFrame: s.lastRenderedFrameIndex,
                    lastPrimaryDir: s.lastPrimaryDir,
                    fps: s.currentFps,
                    drawTime: s.lastDrawTime
                };
            }""")
            print(f"Direction {name:<10}: Target F{frame_info['targetFrame']:.1f}, Displayed F{frame_info['displayedFrame']:.1f}, Drawn F{frame_info['renderedFrame']}, Region: {frame_info['lastPrimaryDir']}, FPS: {frame_info['fps']}, DrawTime: {frame_info['drawTime']:.2f}ms")

        # Take screenshot of hero
        await page.screenshot(path="scratch/hero_after_preload.png")
        print("\n[OK] Screenshot saved to scratch/hero_after_preload.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_preloader_and_trajectories())
