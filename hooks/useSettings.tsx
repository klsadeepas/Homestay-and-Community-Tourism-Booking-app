import { useContext } from 'react';
import { SettingsContext } from '@/contexts/SettingsContext';
import { t as translate } from '@/services/i18n';

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  const t = (key: string, replacements?: Record<string, string>) => translate(ctx.language, key, replacements);
  return { ...ctx, t };
}
