/*
 * Base-path helpers so the site works both at a domain root ("/") and
 * under a sub-path such as GitHub Pages ("/<repo>/"). Content keeps
 * root-absolute links ("/about/"); they are prefixed at render time.
 */
function normaliseBase(base: string): string {
  const trimmed = base.replace(/\/+$/, '');
  return trimmed === '' ? '' : trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function withBase(href: string, base: string): string {
  const prefix = normaliseBase(base);
  if (!href.startsWith('/') || href.startsWith('//') || prefix === '') return href;
  if (href === prefix || href.startsWith(`${prefix}/`)) return href;
  return `${prefix}${href}`;
}

export function stripBase(pathname: string, base: string): string {
  const prefix = normaliseBase(base);
  if (prefix === '' || !pathname.startsWith(prefix)) return pathname;
  const rest = pathname.slice(prefix.length);
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/** Prefix with the configured Astro base (build-time only). */
export function url(href: string): string {
  return withBase(href, import.meta.env.BASE_URL);
}
