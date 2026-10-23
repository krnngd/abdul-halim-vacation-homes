import { validateEnquiry, type FieldRule, type ValidationMessages } from './validation';

/*
 * Front-end only (sample site): validates, then shows a confirmation.
 * Nothing is sent anywhere and the values are discarded on reset.
 */
interface FormConfig {
  rules: FieldRule[];
  messages: ValidationMessages & { summary: string };
}

function readConfig(form: HTMLFormElement): FormConfig | null {
  const source = form.querySelector<HTMLScriptElement>('script[data-form-config]');
  if (!source?.textContent) return null;
  try {
    return JSON.parse(source.textContent) as FormConfig;
  } catch (error: unknown) {
    console.error('[site] enquiry form config is invalid', error);
    return null;
  }
}

function readValues(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  return Object.fromEntries(Array.from(data.entries(), ([key, value]) => [key, String(value)]));
}

function showFieldError(form: HTMLFormElement, name: string, message: string | undefined): void {
  const control = form.elements.namedItem(name);
  const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  if (!(control instanceof HTMLElement) || !error) return;

  const text = error.querySelector<HTMLElement>('[data-error-text]');
  if (message) {
    control.setAttribute('aria-invalid', 'true');
    if (text) text.textContent = message;
    error.hidden = false;
  } else {
    control.removeAttribute('aria-invalid');
    error.hidden = true;
  }
}

export function initEnquiryForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-enquiry-form]');
  const success = document.querySelector<HTMLElement>('[data-form-success]');
  const summary = form?.querySelector<HTMLElement>('[data-form-summary]');
  if (!form || !success || !summary) return;

  const config = readConfig(form);
  if (!config) return;
  const { rules, messages } = config;
  const touched = new Set<string>();

  const validateField = (name: string): void => {
    const rule = rules.find((candidate) => candidate.name === name);
    if (!rule) return;
    const errors = validateEnquiry(readValues(form), [rule], messages);
    showFieldError(form, name, errors[name]);
  };

  form.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.value.trim() !== '') touched.add(target.name);
    if (touched.has(target.name)) validateField(target.name);
  });

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.getAttribute('aria-invalid') === 'true') {
      validateField((target as HTMLInputElement).name);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const errors = validateEnquiry(readValues(form), rules, messages);
    rules.forEach((rule) => {
      touched.add(rule.name);
      showFieldError(form, rule.name, errors[rule.name]);
    });

    const invalid = rules.filter((rule) => errors[rule.name]);
    if (invalid.length > 0) {
      summary.textContent = messages.summary;
      summary.hidden = false;
      const first = form.elements.namedItem(invalid[0].name);
      if (first instanceof HTMLElement) first.focus();
      return;
    }

    summary.hidden = true;
    form.reset();
    touched.clear();
    form.hidden = true;
    success.hidden = false;
    success.querySelector<HTMLElement>('[data-success-title]')?.focus();
  });

  success.querySelector<HTMLButtonElement>('[data-form-reset]')?.addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLElement>('input, select, textarea')?.focus();
  });
}
