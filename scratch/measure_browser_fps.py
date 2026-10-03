import asyncio
import sys
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def measure_raf():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:5173/')
        await page.wait_for_function('() => window.__cursorCharacterDebug && window.__cursorCharacterDebug.isReady()')
        
        # Measure 60 frames inside browser rAF loop
        metrics = await page.evaluate('''() => new Promise(resolve => {
            const deltas = [];
            let last = performance.now();
            let count = 0;
            function step(now) {
                deltas.push(now - last);
                last = now;
                count++;
                if (count < 60) {
                    requestAnimationFrame(step);
                } else {
                    const validDeltas = deltas.slice(5);
                    const avgDt = validDeltas.reduce((a,b) => a+b, 0) / validDeltas.length;
                    resolve({ avgDt: avgDt, fps: 1000 / avgDt });
                }
            }
            requestAnimationFrame(step);
        })''')
        print(f"Browser native rAF FPS: {metrics['fps']:.1f} (avg frame interval: {metrics['avgDt']:.2f}ms)")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(measure_raf())
