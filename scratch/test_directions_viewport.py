import asyncio
import sys
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def test_directions():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:5173/')
        await page.wait_for_function('() => window.__cursorCharacterDebug && window.__cursorCharacterDebug.isReady()')
        
        # Viewport center is (720, 450)
        cx, cy = 720, 450
        r_x, r_y = 500, 320

        points = [
            ('CENTER', cx, cy),
            ('RIGHT', cx + r_x, cy),
            ('UP-RIGHT', cx + r_x * 0.7, cy - r_y * 0.7),
            ('UP', cx, cy - r_y),
            ('UP-LEFT', cx - r_x * 0.7, cy - r_y * 0.7),
            ('LEFT', cx - r_x, cy),
            ('DOWN-LEFT', cx - r_x * 0.7, cy + r_y * 0.7),
            ('DOWN', cx, cy + r_y),
            ('DOWN-RIGHT', cx + r_x * 0.7, cy + r_y * 0.7),
        ]

        print("Testing all directions centered on viewport (720, 450):")
        for name, x, y in points:
            await page.mouse.move(x, y)
            await page.wait_for_timeout(200)
            res = await page.evaluate('''() => {
                const s = window.__cursorCharacterDebug.state;
                return {
                    normX: s.currentNormX.toFixed(2),
                    normY: s.currentNormY.toFixed(2),
                    targetFrame: s.targetFrame.toFixed(1),
                    displayedFrame: s.displayedFrame.toFixed(1),
                    renderedFrame: s.lastRenderedFrameIndex,
                    dir: s.lastPrimaryDir
                };
            }''')
            print(f"{name:<12}: norm=({res['normX']}, {res['normY']}), target={res['targetFrame']}, displayed={res['displayedFrame']}, rendered=F{res['renderedFrame']}, dir={res['dir']}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(test_directions())
