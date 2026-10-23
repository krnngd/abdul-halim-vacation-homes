import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/about/', '/leadership/', '/services/', '/standards/', '/portfolio/', '/stays/', '/partner-with-us/', '/privacy-policy/', '/terms-of-use/'];

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

test.describe('accessibility', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of PAGES) {
    test(`no serious axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('navigation', () => {
  test('marks the current section in the nav', async ({ page }) => {
    test.skip(isMobile(page), 'desktop links only');
    await page.goto('/leadership/');
    await expect(page.locator('.nav-link[aria-current="page"]')).toHaveText('About Us');
  });

  test('hides on scroll down and returns on scroll up', async ({ page }) => {
    await page.goto('/about/');
    const nav = page.locator('[data-nav]');
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 1600);
    await expect(nav).toHaveAttribute('data-hidden', '');
    await expect(nav).toHaveAttribute('data-compact', '');
    // Let the smooth scroll settle before reversing direction.
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, -400);
    await expect(nav).not.toHaveAttribute('data-hidden');
  });

  test('skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/services/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('mobile menu opens as a modal and restores focus on close', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile menu only');
    await page.goto('/');
    const button = page.locator('[data-menu-open]');
    await button.click();
    await expect(page.locator('[data-menu]')).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-menu-close]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-menu]')).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('portfolio', () => {
  test('filters by area and keeps the choice in the URL', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.getByRole('button', { name: /^Al Jafiliya/ }).click();
    await expect(page).toHaveURL(/area=al-jafiliya/);
    await expect(page.locator('[data-area-group]:visible')).toHaveCount(1);
    await expect(page.locator('[data-card]:visible')).toHaveCount(2);
    await expect(page.locator('[data-filter-status]')).toHaveText(/2 properties in Al Jafiliya/);
    await page.getByRole('button', { name: /^All areas/ }).click();
    await expect(page.locator('[data-card]:visible')).toHaveCount(9);
  });

  test('opens a filtered view from a link', async ({ page }) => {
    await page.goto('/portfolio/?area=naif-deira');
    await expect(page.getByRole('button', { name: /^Naif, Deira/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-card]:visible')).toHaveCount(1);
    await page.getByRole('button', { name: /^Al Bada/ }).click();
    await expect(page.locator('[data-filter-status]')).toHaveText("Showing 1 property in Al Bada'a");
  });

  test('lightbox pages through images and closes with Escape', async ({ page }) => {
    await page.goto('/portfolio/');
    const trigger = page.locator('[aria-controls="detail-satwa-gallery"]');
    await trigger.click();
    const dialog = page.locator('#detail-satwa-gallery');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-counter]')).toHaveText('Image 1 of 4');
    await dialog.locator('[data-next]').click();
    await expect(dialog.locator('[data-counter]')).toHaveText('Image 2 of 4');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-counter]')).toHaveText('Image 3 of 4');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('detail view shows the units placeholder', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('[aria-controls="detail-naif-building"]').click();
    await expect(page.locator('#detail-naif-building .ph')).toHaveText('[X]');
  });
});

test.describe('proposal enquiry form', () => {
  test('reports errors, then confirms without sending data anywhere', async ({ page }) => {
    const requests: string[] = [];
    await page.goto('/partner-with-us/');
    await page.waitForLoadState('networkidle');
    page.on('request', (request) => requests.push(request.url()));

    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('[data-form-summary]')).toBeVisible();
    await expect(page.getByLabel(/Full name/)).toBeFocused();
    await expect(page.getByLabel(/Full name/)).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel(/Full name/).fill('Sara Haddad');
    await page.getByLabel(/^Phone/).fill('+971 55 123 4567');
    await page.getByLabel(/^Email/).fill('not-an-email');
    await page.getByLabel(/Property location/).fill('Al Satwa');
    await page.getByLabel(/Property type/).selectOption('Villa');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.getByLabel(/^Email/)).toBeFocused();
    await expect(page.locator('[data-error-for="email"]')).toContainText('name@example.com');

    await page.getByLabel(/^Email/).fill('sara@example.ae');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('[data-form-success]')).toBeVisible();
    await expect(page.locator('[data-success-title]')).toBeFocused();
    expect(requests.filter((url) => !url.includes('/_astro/') && !url.endsWith('.webp'))).toEqual([]);
  });
});

test.describe('motion fallbacks', () => {
  test('reduced motion shows every block in its final state', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('http://localhost:4322/');
    await expect(page.locator('html')).not.toHaveClass(/motion/);
    const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
    expect(hidden).toBe(0);
    await context.close();
  });

  test('content is readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://localhost:4322/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const hidden = await page.$$eval('[data-reveal], [data-split]', (els) =>
      els.filter((el) => getComputedStyle(el).opacity !== '1' || getComputedStyle(el).visibility === 'hidden').length,
    );
    expect(hidden).toBe(0);
    await context.close();
  });

  test('scroll reveals finish when motion is allowed', async ({ page }) => {
    await page.goto('/');
    await page.locator('.what-card').first().scrollIntoViewIfNeeded();
    await expect(page.locator('.what-card').first()).toHaveCSS('opacity', '1', { timeout: 4000 });
  });
});
