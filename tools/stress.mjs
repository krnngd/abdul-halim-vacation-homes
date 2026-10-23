/*
 * break-ui pass: drives the dev-only stress toggle and reports overflow.
 * Usage (with `npm run dev` running): node tools/stress.mjs <outDir>
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4321';
const [outDir = 'stress'] = process.argv.slice(2);
const PAGES = ['/', '/about/', '/leadership/', '/services/', '/standards/', '/portfolio/', '/stays/', '/partner-with-us/', '/privacy-policy/'];
const SCENARIOS = [
  { name: 'worst-320', width: 320, query: 'data=worst' },
  { name: 'worst-1280', width: 1280, query: 'data=worst' },
  { name: 'text200-1280', width: 1280, query: 'data=worst&text=200' },
  { name: 'text200-375', width: 375, query: 'data=worst&text=200' },
  { name: 'rtl-375', width: 375, query: 'data=worst&dir=rtl' },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const findings = [];

for (const scenario of SCENARIOS) {
  const context = await browser.newContext({ viewport: { width: scenario.width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}?${scenario.query}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll('main *, footer *, header *')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.right > width + 1 || rect.left < -1) && !el.closest('.preview-scroller, .filter-buttons, dialog, .stress');
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].filter((c) => !c.startsWith('astro-')).join('.')}`);
      const clipped = [...document.querySelectorAll('h1, h2, h3, p, dd, a, button')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
        .slice(0, 5)
        .map((el) => el.textContent.trim().slice(0, 40));
      return { overflow: document.documentElement.scrollWidth - width, offenders, clipped };
    });
    const slug = (path === '/' ? 'home' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '')) + `-${scenario.name}.png`;
    await page.screenshot({ path: join(outDir, slug), fullPage: true });
    if (result.overflow > 0 || result.offenders.length || result.clipped.length) {
      findings.push(`${scenario.name} ${path}: overflow=${result.overflow}px offenders=${result.offenders.join(', ')} clipped=${result.clipped.join(' | ')}`);
    }
  }
  await context.close();
}

await browser.close();
console.log(findings.length ? findings.join('\n') : 'No overflow or clipping found.');
