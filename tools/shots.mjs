/*
 * Review helper: full-page screenshots of every page at the four target
 * widths, with reduced motion so every element is in its final state.
 * Usage: node tools/shots.mjs <baseUrl> <outDir> [page-filter]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [baseUrl = 'http://localhost:4322', outDir = 'shots', filter = ''] = process.argv.slice(2);
const PAGES = ['/', '/about/', '/leadership/', '/services/', '/standards/', '/portfolio/', '/stays/', '/partner-with-us/', '/privacy-policy/', '/404.html'];
const WIDTHS = [375, 768, 1280, 1600];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const path of PAGES.filter((p) => p.includes(filter))) {
    await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Scroll through once so lazy images load before the full-page capture.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = (path === '/' ? 'home' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '')) + `-${width}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    report.push(`${width}px ${path} overflow=${overflow}px`);
  }
  await context.close();
}

await browser.close();
console.log(report.join('\n'));
