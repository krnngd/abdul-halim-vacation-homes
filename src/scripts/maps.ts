/*
 * Click-to-load map facade: no third-party request until the visitor asks
 * for the map. The address query comes from site.json, not from user input.
 */
export function initMaps(): void {
  document.querySelectorAll<HTMLElement>('[data-map]').forEach((container) => {
    const button = container.querySelector<HTMLButtonElement>('[data-map-load]');
    const query = container.dataset.mapQuery;
    const title = container.dataset.mapTitle ?? 'Map';
    if (!button || !query) return;

    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
      frame.title = title;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.className = 'map-frame';
      container.querySelector('[data-map-facade]')?.replaceWith(frame);
      container.setAttribute('data-map-loaded', '');
      frame.focus();
    });
  });
}
