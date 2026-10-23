/*
 * Acceptance checks against the production build (run `npm run build` first).
 * Mirrors the brief's acceptance checklist (Section 10).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

// Restricted terms are assembled from character codes so this file never contains them.
const RESTRICTED = [
  [97, 119, 113, 97, 102],
  [119, 97, 113, 102],
  [101, 110, 100, 111, 119, 109, 101, 110, 116],
].map((codes) => String.fromCharCode(...codes));
const RESTRICTED_PATTERN = new RegExp(RESTRICTED.join('|'), 'i');

// Source files the client supplied (the brief itself names the rule, and the deck is raw input).
const CLIENT_INPUTS = new Set(['PROJECT_BRIEF.md', 'Abdul Halim Vacation Homes Corporate Profile.pptx']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', '.claude']);
const TEXT_EXTENSIONS = /\.(astro|ts|mjs|js|json|css|html|md|svg|txt|xml)$/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (SKIP_DIRS.has(name)) return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const htmlFiles = existsSync(DIST) ? walk(DIST).filter((file) => file.endsWith('.html')) : [];
const pages = htmlFiles.map((file) => ({
  file,
  name: relative(DIST, file).split(sep).join('/'),
  html: readFileSync(file, 'utf8'),
}));
const contentPages = pages.filter((page) => page.name !== '404.html');

const stripScripts = (html) => html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');

test('build output exists', () => {
  assert.ok(pages.length >= 11, `expected at least 11 pages in dist, found ${pages.length}. Run npm run build first.`);
});

test('every page is marked noindex, nofollow', () => {
  for (const page of pages) {
    assert.match(page.html, /<meta name="robots" content="noindex, nofollow">/, page.name);
  }
});

test('every page has a unique title and meta description', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const page of contentPages) {
    const title = page.html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = page.html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title, `${page.name} is missing a title`);
    assert.ok(description, `${page.name} is missing a description`);
    assert.ok(!titles.has(title), `duplicate title: ${title}`);
    assert.ok(!descriptions.has(description), `duplicate description on ${page.name}`);
    titles.add(title);
    descriptions.add(description);
  }
});

test('every page has exactly one h1', () => {
  for (const page of pages) {
    const count = (page.html.match(/<h1[\s>]/g) ?? []).length;
    assert.equal(count, 1, `${page.name} has ${count} h1 elements`);
  }
});

test('headings do not skip levels', () => {
  for (const page of pages) {
    const levels = [...page.html.matchAll(/<h([1-6])[\s>]/g)].map((match) => Number(match[1]));
    levels.reduce((previous, level) => {
      assert.ok(level <= previous + 1, `${page.name}: h${previous} followed by h${level}`);
      return level;
    }, 1);
  }
});

test('every image has alt text; empty alt only on thumbnails inside labelled buttons', () => {
  for (const page of pages) {
    for (const [tag] of page.html.matchAll(/<img\b[^>]*>/g)) {
      // A bare `alt` attribute is the serialised form of alt="".
      const alt = tag.match(/\salt(?:="([^"]*)")?(?=[\s>/])/);
      assert.ok(alt, `${page.name}: image without alt: ${tag.slice(0, 120)}`);
      if (!alt[1]) assert.match(tag, /thumb-img/, `${page.name}: unexpected empty alt`);
    }
  }
});

test('image alt text never uses "Building View" style captions', () => {
  for (const page of pages) {
    assert.doesNotMatch(page.html, /alt="[^"]*(Building View|Image \d)/i, page.name);
  }
});

test('every visible placeholder is wrapped in a highlight span', () => {
  for (const page of pages) {
    const body = stripScripts(page.html).replace(/<[^>]+>/g, (tag) => (tag.startsWith('<span class="ph"') ? '<PH>' : '<>'));
    const bare = [...body.matchAll(/(<PH>)?(\[[^\]<>]+\])/g)].filter((match) => !match[1]);
    assert.deepEqual(bare.map((match) => match[2]), [], `${page.name} has unhighlighted placeholders`);
  }
});

test('placeholder highlighting is controlled by one class on <html>', () => {
  for (const page of pages) {
    assert.match(page.html, /<html[^>]*class="ph-on"/, page.name);
  }
});

test('restricted terms appear nowhere in the build output', () => {
  for (const file of walk(DIST)) {
    const name = relative(DIST, file);
    assert.doesNotMatch(name, RESTRICTED_PATTERN, `restricted term in file name: ${name}`);
    if (TEXT_EXTENSIONS.test(file)) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), RESTRICTED_PATTERN, `restricted term in ${name}`);
    }
  }
});

test('restricted terms appear nowhere in project sources or file names', () => {
  for (const file of walk(ROOT)) {
    const name = relative(ROOT, file);
    if (CLIENT_INPUTS.has(name) || name.startsWith(`dist${sep}`)) continue;
    assert.doesNotMatch(name, RESTRICTED_PATTERN, `restricted term in file name: ${name}`);
    if (TEXT_EXTENSIONS.test(file)) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), RESTRICTED_PATTERN, `restricted term in ${name}`);
    }
  }
});

test('the unconfirmed portrait is never shipped', () => {
  const shipped = walk(DIST).map((file) => relative(DIST, file));
  assert.equal(shipped.filter((name) => name.includes('leadership-portrait')).length, 0);
  for (const page of pages) assert.doesNotMatch(page.html, /leadership-portrait/, page.name);
});

test('internal links resolve to built pages or files', () => {
  for (const page of pages) {
    for (const [, href] of page.html.matchAll(/href="(\/[^"#?]*)/g)) {
      const target = href.endsWith('/') ? join(DIST, href, 'index.html') : join(DIST, href);
      assert.ok(existsSync(target), `${page.name} links to missing ${href}`);
    }
  }
});

test('no invented figures: credentials keep their placeholders', () => {
  const home = pages.find((page) => page.name === 'index.html');
  assert.ok(home);
  assert.match(home.html, /<span class="ph">\[X\]<\/span> buildings under management/);
  assert.match(home.html, /Operating since <span class="ph">\[Year\]<\/span>/);
});
