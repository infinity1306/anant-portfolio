import asyncio
import sys
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        
        async def delay_frame(route):
            await asyncio.sleep(0.015)
            await route.continue_()

        await page.route("**/character-frames/*.webp", delay_frame)
        await page.goto("http://localhost:5173/")
        
        # Wait until preloader is visible and showing progress
        await page.wait_for_selector("#character-preloader-overlay")
        await page.wait_for_timeout(400)
        
        # Capture screenshot while preloader is active and in mid-progress
        await page.screenshot(path="scratch/preloader_active.png")
        print("[OK] Captured scratch/preloader_active.png")

        # Now unroute to let it finish
        await page.unroute("**/character-frames/*.webp")
        await page.wait_for_function("() => window.__cursorCharacterDebug && window.__cursorCharacterDebug.isReady()")
        await page.wait_for_timeout(600)
        print("[OK] Preload completed and faded out")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture())
