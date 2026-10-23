/*
 * Viewport (not full-page) screenshots at given sizes, final motion states.
 * Usage: node tools/viewport-shots.mjs <outDir> [baseUrl]
 */
import { chromium } from 'playwright';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const [outDir = 'shots', baseUrl = 'http://localhost:4322'] = process.argv.slice(2);
const SHOTS = [
  [1920, 1080, '/', 'home-1920', 0],
  [1920, 1080, '/leadership/', 'leadership-1920', 700],
  [1920, 1080, '/about/', 'about-1920', 0],
  [1280, 800, '/', 'home-1280', 0],
  [375, 812, '/', 'home-375', 0],
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [width, height, path, name, scrollY] of SHOTS) {
  const page = await (await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })).newPage();
  await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
  if (scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  const info = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav').getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth - innerWidth, nav: [Math.round(nav.width), Math.round(nav.height)] };
  });
  console.log(name, JSON.stringify(info));
}
await browser.close();
