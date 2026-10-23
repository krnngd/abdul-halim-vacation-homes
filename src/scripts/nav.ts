import { pauseScroll, prefersReducedMotion, resumeScroll, scrollToTop } from './scroll';

const COMPACT_AFTER = 24;
const HIDE_AFTER = 240;
const DIRECTION_THRESHOLD = 4;

function watchScroll(nav: HTMLElement): void {
  const allowHide = !prefersReducedMotion();
  let lastY = window.scrollY;
  let queued = false;

  const update = (): void => {
    const y = window.scrollY;
    const delta = y - lastY;
    nav.toggleAttribute('data-compact', y > COMPACT_AFTER);

    if (allowHide) {
      if (y > HIDE_AFTER && delta > DIRECTION_THRESHOLD) nav.setAttribute('data-hidden', '');
      else if (delta < -DIRECTION_THRESHOLD || y <= HIDE_AFTER) nav.removeAttribute('data-hidden');
    }

    lastY = y;
    queued = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/* A single highlight pill glides between links using clip-path (compositor friendly). */
function initHoverPill(nav: HTMLElement): void {
  const wrap = nav.querySelector<HTMLElement>('[data-nav-links]');
  const pill = wrap?.querySelector<HTMLElement>('[data-nav-hover]');
  if (!wrap || !pill) return;

  const place = (link: HTMLElement): void => {
    const bounds = wrap.getBoundingClientRect();
    const rect = link.getBoundingClientRect();
    pill.style.setProperty('--hover-l', `${rect.left - bounds.left}px`);
    pill.style.setProperty('--hover-r', `${bounds.right - rect.right}px`);
  };

  wrap.querySelectorAll<HTMLElement>('.nav-link').forEach((link) => {
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      if (!pill.hasAttribute('data-visible')) {
        pill.setAttribute('data-instant', '');
        place(link);
        void pill.offsetWidth;
        pill.removeAttribute('data-instant');
        pill.setAttribute('data-visible', '');
        return;
      }
      place(link);
    });
  });

  wrap.addEventListener('pointerleave', () => pill.removeAttribute('data-visible'));
}

function initMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-menu]');
  const openButton = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-menu-close]');
  if (!dialog || !openButton || !closeButton) return;

  openButton.addEventListener('click', () => {
    dialog.showModal();
    closeButton.focus();
    openButton.setAttribute('aria-expanded', 'true');
    pauseScroll();
  });

  closeButton.addEventListener('click', () => dialog.close());

  dialog.addEventListener('close', () => {
    openButton.setAttribute('aria-expanded', 'false');
    resumeScroll();
    openButton.focus({ preventScroll: true });
  });

  window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
    if (event.matches && dialog.open) dialog.close();
  });
}

function initBackToTop(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-back-to-top]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToTop();
      document.querySelector<HTMLElement>('.site-nav .wordmark')?.focus({ preventScroll: true });
    });
  });
}

export function initNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;
  watchScroll(nav);
  initHoverPill(nav);
  initMenu();
  initBackToTop();
}
