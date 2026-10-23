/*
 * Pure validation for the proposal enquiry form. No DOM access, so it can
 * be unit tested and reused if a real endpoint is added later.
 */
export type FieldKind = 'text' | 'email' | 'phone' | 'select' | 'integer';

export interface FieldRule {
  name: string;
  label: string;
  required: boolean;
  kind?: FieldKind;
}

export interface ValidationMessages {
  required: string;
  select: string;
  email: string;
  phone: string;
  units: string;
}

export type ValidationErrors = Readonly<Record<string, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_ALLOWED = /^\+?[\d\s()-]+$/;
const MIN_PHONE_DIGITS = 7;

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return PHONE_ALLOWED.test(value) && digits.length >= MIN_PHONE_DIGITS;
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function checkField(rule: FieldRule, raw: string, messages: ValidationMessages): string | undefined {
  const value = raw.trim();
  const kind = rule.kind ?? 'text';

  if (value.length === 0) {
    if (!rule.required) return undefined;
    return kind === 'select' ? messages.select : messages.required.replace('{field}', rule.label.toLowerCase());
  }

  if (kind === 'email' && !EMAIL_PATTERN.test(value)) return messages.email;
  if (kind === 'phone' && !isValidPhone(value)) return messages.phone;
  if (kind === 'integer' && !isPositiveInteger(value)) return messages.units;
  return undefined;
}

export function validateEnquiry(
  values: Readonly<Record<string, string>>,
  rules: readonly FieldRule[],
  messages: ValidationMessages,
): ValidationErrors {
  return rules.reduce<Record<string, string>>((errors, rule) => {
    const message = checkField(rule, values[rule.name] ?? '', messages);
    return message ? { ...errors, [rule.name]: message } : errors;
  }, {});
}
