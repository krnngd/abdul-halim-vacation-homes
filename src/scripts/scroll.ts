import type Lenis from 'lenis';

/*
 * Shared access to the single smooth-scroll engine (Lenis), so the menu
 * dialog and lightbox can pause it. Null when reduced motion is on.
 */
let instance: Lenis | null = null;

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

export function pauseScroll(): void {
  instance?.stop();
}

export function resumeScroll(): void {
  instance?.start();
}

export function scrollToTop(): void {
  if (instance) {
    instance.scrollTo(0, { duration: 1.4 });
    return;
  }
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
