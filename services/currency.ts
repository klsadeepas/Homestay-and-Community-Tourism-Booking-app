// Demo exchange rate — labeled as demo in UI.
export const LKR_PER_USD = 320;
export const DEMO_RATE_UPDATED_AT = '2026-01-15';

export type Currency = 'LKR' | 'USD';

export function formatPrice(lkr: number, currency: Currency): string {
  if (currency === 'USD') {
    const usd = lkr / LKR_PER_USD;
    return `$${usd.toFixed(2)} USD`;
  }
  return `LKR ${lkr.toLocaleString()}`;
}

export function convertedNote(currency: Currency): string | null {
  if (currency === 'USD') {
    return `Demo rate 1 USD = ${LKR_PER_USD} LKR, updated ${DEMO_RATE_UPDATED_AT}. Settles in LKR.`;
  }
  return null;
}

export function paymentReference(): string {
  return `RS-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
}
