/**
 * Content text helpers.
 *
 * Copy lives in src/content/*.json. Two inline conventions are supported:
 *   [Label]          a pending fact, rendered as a visible placeholder chip
 *   [label](/path)   an internal link (or https URL)
 */

import { withBase } from './url.ts';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const LINK_PATTERN = /\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g;
// Links are replaced first, so any brackets left over are placeholders.
const PLACEHOLDER_PATTERN = /\[[^\]]+\]/g;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Escape, then add link and placeholder markup. Output is safe for set:html. */
export function rich(value: string, base = '/'): string {
  const escaped = escapeHtml(value);
  const linked = escaped.replace(
    LINK_PATTERN,
    (_match, label: string, href: string) => `<a class="text-link" href="${withBase(href, base)}">${label}</a>`,
  );
  return linked.replace(PLACEHOLDER_PATTERN, (match) => `<span class="ph">${match}</span>`);
}

export function hasPlaceholder(value: string): boolean {
  return value.replace(LINK_PATTERN, '').match(PLACEHOLDER_PATTERN) !== null;
}

export function splitWords(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

/** Replace {name} tokens in a content string. */
export function format(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
