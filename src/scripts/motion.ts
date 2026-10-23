import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion, setLenis } from './scroll';
import { splitIntoWords } from './split';

declare global {
  interface Window {
    __motionReady?: boolean;
  }
}

/*
 * Motion language: calm and slow. Entrances 0.8 to 1.4 s on expo.out,
 * transforms and opacity only, every reveal plays once.
 */
const EASE = 'expo.out';
const MUTED_WORD_OPACITY = 0.6;

function initSmoothScroll(): void {
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  setLenis(lenis);
}

/*
 * One-shot reveals run on IntersectionObserver: it reports elements that are
 * already in view (restored scroll, back navigation) as reliably as ones
 * scrolled into view. ScrollTrigger is kept for scrubbed effects only.
 */
type RevealHandler = (element: HTMLElement) => void;

function onFirstView(elements: Iterable<HTMLElement>, handler: RevealHandler): void {
  const observer = new IntersectionObserver(
    (entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
      entering.forEach((element, index) => {
        observer.unobserve(element);
        element.style.setProperty('--reveal-order', String(index));
        handler(element);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0 },
  );
  for (const element of elements) observer.observe(element);
}

function revealHeadings(): void {
  const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-split]'));
  // Split up front, words parked below their masks, so text never flashes unsplit.
  headings.forEach((heading) => gsap.set(splitIntoWords(heading, 'mask').words, { yPercent: 112 }));
  onFirstView(headings, (heading) => {
    const { words } = splitIntoWords(heading, 'mask');
    if (words.length === 0) return;
    gsap.to(words, { yPercent: 0, duration: 1.15, ease: EASE, stagger: 0.055 });
  });
}

function revealBlocks(): void {
  onFirstView(document.querySelectorAll<HTMLElement>('[data-reveal]'), (element) => {
    const order = Number(element.style.getPropertyValue('--reveal-order') || 0);
    gsap.to(element, { opacity: 1, y: 0, duration: 1, ease: EASE, delay: Math.min(order, 6) * 0.09 });
  });
}

function revealImages(): void {
  onFirstView(document.querySelectorAll<HTMLElement>('[data-reveal-image]'), (frame) => {
    const image = frame.querySelector('img');
    gsap.fromTo(
      frame,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' },
    );
    if (image) gsap.fromTo(image, { scale: 1.2 }, { scale: 1, duration: 1.8, ease: EASE, delay: 0.15 });
  });
}

function heroIntro(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const image = hero.querySelector('[data-hero-image] img');
  const frame = hero.querySelector('[data-hero-frame]');
  if (image) gsap.fromTo(image, { scale: 1.14 }, { scale: 1, duration: 2.2, ease: EASE });
  if (frame) {
    gsap.fromTo(frame, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.6, delay: 0.35, ease: EASE });
  }
}

function parallax(): void {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((layer) => {
    const amount = Number(layer.dataset.parallax || 7);
    gsap.fromTo(
      layer,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: layer.parentElement ?? layer, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((layer) => {
    const distance = Number(layer.dataset.drift || 80);
    gsap.to(layer, {
      y: distance,
      ease: 'none',
      scrollTrigger: { trigger: layer.closest('section') ?? layer, start: 'top top', end: 'bottom top', scrub: true },
    });
  });
}

function scrubStatements(): void {
  document.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((statement) => {
    const { words } = splitIntoWords(statement, 'plain');
    if (words.length === 0) return;
    gsap.fromTo(
      words,
      // 0.6 keeps even the muted state at 3.3:1, above the 3:1 needed for large text.
      { opacity: MUTED_WORD_OPACITY },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 },
      },
    );
  });
}

function progressTimelines(): void {
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach((timeline) => {
    const line = timeline.querySelector<HTMLElement>('[data-progress-line]');
    const steps = Array.from(timeline.querySelectorAll<HTMLElement>('[data-step]'));
    if (!line || steps.length === 0) return;

    const media = gsap.matchMedia();
    media.add({ wide: '(min-width: 64rem)', narrow: '(max-width: 63.999rem)' }, (context) => {
      const wide = Boolean(context.conditions?.wide);
      const prop = wide ? 'scaleX' : 'scaleY';
      gsap.set(line, { [prop]: 0, transformOrigin: wide ? 'left center' : 'center top' });

      gsap.to(line, {
        [prop]: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: timeline,
          start: wide ? 'top 70%' : 'top 75%',
          end: wide ? 'bottom 55%' : 'bottom 60%',
          scrub: 0.5,
          onUpdate: (self) => {
            const reached = self.progress * (steps.length - 1) + 0.02;
            steps.forEach((step, index) => step.classList.toggle('is-reached', index <= reached));
          },
        },
      });

      return () => gsap.set(line, { clearProps: 'transform' });
    });
  });
}

const REFRESH_DEBOUNCE_MS = 200;

/* Re-measure trigger positions whenever the document height changes
   (late styles, fonts, images, filtered lists). */
function refreshOnLayoutChanges(): void {
  let timer = 0;
  let lastHeight = document.body.scrollHeight;
  const observer = new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), REFRESH_DEBOUNCE_MS);
  });
  observer.observe(document.body);
  document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

function showFinalStates(): void {
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach((timeline) => {
    timeline.classList.add('is-static');
    timeline.querySelectorAll('[data-step]').forEach((step) => step.classList.add('is-reached'));
  });
}

export function initMotion(): void {
  window.__motionReady = true;

  if (prefersReducedMotion() || !document.documentElement.classList.contains('motion')) {
    document.documentElement.classList.remove('motion');
    showFinalStates();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  initSmoothScroll();
  heroIntro();
  revealHeadings();
  revealBlocks();
  revealImages();
  parallax();
  scrubStatements();
  progressTimelines();
  refreshOnLayoutChanges();
}

export function refreshScrollMeasurements(): void {
  if (document.documentElement.classList.contains('motion')) ScrollTrigger.refresh();
}

export function revealCards(cards: Element[]): void {
  if (!document.documentElement.classList.contains('motion') || cards.length === 0) return;
  gsap.fromTo(
    cards,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.07, overwrite: true, clearProps: 'transform' },
  );
}
