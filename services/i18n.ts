import { Lang, translations } from '@/constants/i18n';

export function t(lang: Lang, key: string, replacements?: Record<string, string>): string {
  const dict = translations[lang] || translations.en;
  let out = dict[key] ?? translations.en[key] ?? key;
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      out = out.replace(`{${k}}`, v);
    });
  }
  return out;
}
