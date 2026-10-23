/*
 * Word splitting for heading reveals. The original sentence stays available
 * to assistive technology in a visually hidden span; the animated words are
 * aria-hidden. Elements containing markup are never split.
 */
export interface SplitResult {
  words: HTMLElement[];
}

function createAccessibleCopy(text: string): HTMLSpanElement {
  const copy = document.createElement('span');
  copy.className = 'sr-only';
  copy.textContent = text;
  return copy;
}

export function splitIntoWords(element: HTMLElement, mode: 'mask' | 'plain'): SplitResult {
  if (element.dataset.splitDone === 'true') {
    return { words: Array.from(element.querySelectorAll<HTMLElement>('[data-word]')) };
  }

  const text = (element.textContent ?? '').trim();
  if (element.children.length > 0 || text.length === 0) {
    element.classList.add('is-split');
    return { words: [] };
  }

  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const words: HTMLElement[] = [];
  const parts = text.split(/\s+/);

  parts.forEach((part, index) => {
    const word = document.createElement('span');
    word.dataset.word = '';
    word.textContent = part;

    if (mode === 'mask') {
      word.className = 'split-word';
      const mask = document.createElement('span');
      mask.className = 'split-mask';
      mask.appendChild(word);
      visual.appendChild(mask);
    } else {
      word.className = 'scrub-word';
      visual.appendChild(word);
    }

    words.push(word);
    if (index < parts.length - 1) visual.appendChild(document.createTextNode(' '));
  });

  element.replaceChildren(createAccessibleCopy(text), visual);
  element.dataset.splitDone = 'true';
  element.classList.add('is-split');
  return { words };
}
