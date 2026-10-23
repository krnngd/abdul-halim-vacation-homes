import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withBase, stripBase } from '../src/lib/url.ts';
import { rich } from '../src/lib/text.ts';

test('withBase leaves root-absolute paths alone when the base is /', () => {
  assert.equal(withBase('/about/', '/'), '/about/');
  assert.equal(withBase('/', '/'), '/');
});

test('withBase prefixes root-absolute paths with a sub-path base', () => {
  assert.equal(withBase('/about/', '/preview/'), '/preview/about/');
  assert.equal(withBase('/', '/preview/'), '/preview/');
  assert.equal(withBase('/portfolio/?area=al-satwa', '/preview'), '/preview/portfolio/?area=al-satwa');
});

test('withBase never touches external, protocol, hash or relative links', () => {
  for (const href of ['https://wa.me/971551205005', 'tel:+971551205005', '#top', 'mailto:a@b.ae', 'about/']) {
    assert.equal(withBase(href, '/preview/'), href);
  }
});

test('withBase does not double-prefix', () => {
  assert.equal(withBase('/preview/about/', '/preview/'), '/preview/about/');
});

test('stripBase returns the site-relative path used for active-link matching', () => {
  assert.equal(stripBase('/preview/leadership/', '/preview/'), '/leadership/');
  assert.equal(stripBase('/preview/', '/preview/'), '/');
  assert.equal(stripBase('/preview', '/preview/'), '/');
  assert.equal(stripBase('/about/', '/'), '/about/');
});

test('rich prefixes inline internal links with the base', () => {
  assert.equal(
    rich('See our [Standards](/standards/) page.', '/preview/'),
    'See our <a class="text-link" href="/preview/standards/">Standards</a> page.',
  );
});
