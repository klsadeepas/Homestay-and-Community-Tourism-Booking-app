// Field-level validators shared by every form in the app.
// Each validator returns '' when the value is acceptable, or a short,
// user-facing message for Input's `error` prop.

export type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const hasErrors = (errs: Errors): boolean => Object.values(errs).some((m) => !!m);

export function pickErrors(errs: Errors, keys: string[]): Errors {
  const out: Errors = {};
  for (const k of keys) if (errs[k]) out[k] = errs[k];
  return out;
}

export function required(value: unknown, label = 'This field'): string {
  if (value === null || value === undefined) return `${label} is required.`;
  if (typeof value === 'string' && value.trim() === '') return `${label} is required.`;
  if (Array.isArray(value) && value.length === 0) return `${label} is required.`;
  return '';
}

export function textLength(value: string, label: string, min = 0, max = Infinity): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (v.length < min) return `${label} needs at least ${min} characters.`;
  if (v.length > max) return `${label} can be up to ${max} characters.`;
  return '';
}

export function email(value: string, label = 'Email'): string {
  const v = (value || '').trim();
  if (!v) return '';
  return EMAIL_RE.test(v) ? '' : `Enter a valid ${label.toLowerCase()} (e.g. name@example.com).`;
}

// Accepts Sri Lankan mobile/landline and international formats: 0771234567,
// +94771234567, 0112345678, spaces/dashes allowed.
export function phone(value: string, label = 'Phone'): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (!/^\+?[\d\s()-]{7,20}$/.test(v)) return `${label} can only contain digits, spaces, +, - and brackets.`;
  const digits = v.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return `Enter a valid ${label.toLowerCase()} (9–15 digits).`;
  return '';
}

export function password(value: string, min = 6): string {
  const v = value || '';
  if (!v) return '';
  if (v.length < min) return `Password needs at least ${min} characters.`;
  if (/\s/.test(v)) return 'Password cannot contain spaces.';
  return '';
}

export interface NumberRule {
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  required?: boolean;
}

export function numberField(raw: string | number, rule: NumberRule): string {
  const s = String(raw ?? '').trim();
  if (!s) return rule.required === false ? '' : `${rule.label} is required.`;
  const n = Number(s);
  if (!Number.isFinite(n)) return `${rule.label} must be a number.`;
  if (rule.integer && !Number.isInteger(n)) return `${rule.label} must be a whole number.`;
  if (rule.min !== undefined && n < rule.min) return `${rule.label} must be ${rule.min} or more.`;
  if (rule.max !== undefined && n > rule.max) return `${rule.label} must be ${rule.max} or less.`;
  return '';
}

// Dates are stored as YYYY-MM-DD everywhere in this app (string sorts and
// comparisons depend on it), so the calendar is the only accepted input.
export function date(value: string, label: string, opts: { required?: boolean; minDate?: string; maxDate?: string } = {}): string {
  const v = (value || '').trim();
  if (!v) return opts.required === false ? '' : `${label} is required.`;
  if (!DATE_RE.test(v)) return `${label} must be a calendar date.`;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return `${label} is not a real date.`;
  if (opts.minDate && v < opts.minDate) return `${label} cannot be before ${opts.minDate}.`;
  if (opts.maxDate && v > opts.maxDate) return `${label} cannot be after ${opts.maxDate}.`;
  return '';
}

export function time(value: string, label = 'Time'): string {
  const v = (value || '').trim();
  if (!v) return `${label} is required.`;
  return TIME_RE.test(v) ? '' : `${label} must use 24-hour HH:MM (e.g. 14:30).`;
}

export function dateRange(from: string, to: string, fromLabel = 'Start date', toLabel = 'End date'): Errors {
  const errs: Errors = {};
  if (from && to && to < from) errs[toLabel] = `${toLabel} cannot be earlier than ${fromLabel.toLowerCase()}.`;
  return errs;
}

// Comma-separated values, e.g. "english, sinhala" or a list of blocked dates.
export function csv(value: string, label: string, itemRule: (item: string, index: number) => string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const items = raw.split(',').map((s) => s.trim());
  for (let i = 0; i < items.length; i++) {
    if (!items[i]) return `${label}: no empty entries (check position ${i + 1}).`;
    const msg = itemRule(items[i], i);
    if (msg) return msg;
  }
  return '';
}

export function oneOf(value: string, options: readonly string[], label: string): string {
  if (!value) return '';
  return options.includes(value) ? '' : `Choose a valid ${label.toLowerCase()}.`;
}

export function image(value: string, label = 'Photo'): string {
  const v = (value || '').trim();
  if (!v) return `${label} is required.`;
  if (/^(https?:\/\/|file:\/\/|content:\/\/|data:|blob:)/i.test(v)) return '';
  return `${label} must be an image picked from this device.`;
}
