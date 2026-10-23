import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, rich, hasPlaceholder, splitWords } from '../src/lib/text.ts';

test('escapeHtml escapes markup-significant characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('rich wraps bracketed placeholders in a highlight span', () => {
  assert.equal(rich('[X] buildings under management'), '<span class="ph">[X]</span> buildings under management');
});

test('rich wraps several placeholders in one string', () => {
  assert.equal(
    rich('[Bedrooms] · [Max guests]'),
    '<span class="ph">[Bedrooms]</span> · <span class="ph">[Max guests]</span>',
  );
});

test('rich turns [label](/path) into an internal link instead of a placeholder', () => {
  assert.equal(
    rich('See our [Standards & Compliance](/standards/) page.'),
    'See our <a class="text-link" href="/standards/">Standards &amp; Compliance</a> page.',
  );
});

test('rich ignores links to unsupported protocols', () => {
  const out = rich('[click](javascript:alert(1))');
  assert.ok(!out.includes('href'), 'must not create an href for javascript: URLs');
  assert.ok(out.includes('<span class="ph">[click]</span>'));
});

test('rich escapes HTML before adding markup', () => {
  assert.equal(rich('<b>[X]</b>'), '&lt;b&gt;<span class="ph">[X]</span>&lt;/b&gt;');
});

test('rich leaves text without brackets unchanged apart from escaping', () => {
  assert.equal(rich("Al Bada'a"), 'Al Bada&#39;a');
});

test('hasPlaceholder detects bracketed placeholders only', () => {
  assert.equal(hasPlaceholder('Permit No. [Permit No.]'), true);
  assert.equal(hasPlaceholder('Department of Economy and Tourism'), false);
  assert.equal(hasPlaceholder('[Standards](/standards/)'), false);
});

test('splitWords keeps punctuation attached and drops empty parts', () => {
  assert.deepEqual(splitWords('  Licensed operators of property,  in Dubai '), [
    'Licensed', 'operators', 'of', 'property,', 'in', 'Dubai',
  ]);
});
