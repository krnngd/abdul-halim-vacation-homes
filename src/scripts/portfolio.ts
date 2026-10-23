import { format } from '../lib/text';
import { refreshScrollMeasurements, revealCards } from './motion';
import { pauseScroll, resumeScroll } from './scroll';

const ALL = 'all';

type PluralCopy = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

interface FilterCopy {
  resultsAnnouncement: PluralCopy;
  resultsAll: PluralCopy;
}

const pluralRules = new Intl.PluralRules(document.documentElement.lang || 'en');

function parseCopy(raw: string | undefined): PluralCopy {
  try {
    return JSON.parse(raw ?? '') as PluralCopy;
  } catch {
    return { other: '' };
  }
}

function pluralise(copy: PluralCopy, count: number): string {
  return copy[pluralRules.select(count)] ?? copy.other;
}

function initFilter(root: HTMLElement): void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-area-group]'));
  const status = root.querySelector<HTMLElement>('[data-filter-status]');
  const copy: FilterCopy = {
    resultsAnnouncement: parseCopy(root.dataset.resultsAnnouncement),
    resultsAll: parseCopy(root.dataset.resultsAll),
  };
  if (buttons.length === 0) return;

  const apply = (area: string, announce: boolean): void => {
    const known = buttons.some((button) => button.dataset.filter === area);
    const target = known ? area : ALL;

    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === target)));
    const visible = groups.filter((group) => target === ALL || group.dataset.areaGroup === target);
    groups.forEach((group) => {
      group.hidden = !visible.includes(group);
    });

    const cards = visible.flatMap((group) => Array.from(group.querySelectorAll('[data-card]')));
    if (announce && status) {
      const label = buttons.find((button) => button.dataset.filter === target)?.dataset.label ?? '';
      status.textContent =
        target === ALL
          ? format(pluralise(copy.resultsAll, cards.length), { count: cards.length })
          : format(pluralise(copy.resultsAnnouncement, cards.length), { count: cards.length, area: label });
    }

    const url = new URL(window.location.href);
    if (target === ALL) url.searchParams.delete('area');
    else url.searchParams.set('area', target);
    window.history.replaceState(null, '', url);

    if (announce) revealCards(cards);
    refreshScrollMeasurements();
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => apply(button.dataset.filter ?? ALL, true));
  });

  const initial = new URL(window.location.href).searchParams.get('area');
  if (initial) apply(initial, false);
}

function initLightbox(dialog: HTMLDialogElement): void {
  const slides = Array.from(dialog.querySelectorAll<HTMLElement>('[data-slide]'));
  const thumbs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-thumb]'));
  const counter = dialog.querySelector<HTMLElement>('[data-counter]');
  const previous = dialog.querySelector<HTMLButtonElement>('[data-prev]');
  const next = dialog.querySelector<HTMLButtonElement>('[data-next]');
  const counterTemplate = dialog.dataset.counter ?? '{n} / {total}';
  let index = 0;

  const show = (target: number): void => {
    if (slides.length === 0) return;
    index = (target + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.toggleAttribute('data-active', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-current', String(i === index)));
    if (counter) counter.textContent = format(counterTemplate, { n: index + 1, total: slides.length });
  };

  previous?.addEventListener('click', () => show(index - 1));
  next?.addEventListener('click', () => show(index + 1));
  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i)));

  dialog.addEventListener('keydown', (event) => {
    if (slides.length < 2) return;
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });

  // Close when the backdrop (outside the panel) is clicked.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => resumeScroll());
  dialog.addEventListener('lightbox:open', () => show(0));
  show(0);
}

function initDetails(root: HTMLElement): void {
  root.querySelectorAll<HTMLDialogElement>('dialog[data-lightbox]').forEach(initLightbox);

  root.querySelectorAll<HTMLButtonElement>('[data-open-detail]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    if (!(dialog instanceof HTMLDialogElement)) return;
    trigger.addEventListener('click', () => {
      dialog.dispatchEvent(new Event('lightbox:open'));
      dialog.showModal();
      pauseScroll();
      dialog.querySelector<HTMLElement>('[data-close]')?.focus();
    });
  });
}

export function initPortfolio(): void {
  const root = document.querySelector<HTMLElement>('[data-portfolio]');
  if (!root) return;
  initFilter(root);
  initDetails(root);
}
