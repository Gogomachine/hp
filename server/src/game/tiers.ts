// Тиры турниров (CLAUDE.md).

export interface TierMeta {
  entryFee: number; // USD
  label: string;
  color: string;
}

export const TIERS: Record<string, TierMeta> = {
  micro: { entryFee: 1, label: 'Микро', color: '#5dcaa5' },
  standard: { entryFee: 5, label: 'Стандарт', color: '#7f77dd' },
  pro: { entryFee: 20, label: 'Про', color: '#ef9f27' },
};

export const MAX_PLAYERS = 4;

export function isTier(tier: string): boolean {
  return Object.prototype.hasOwnProperty.call(TIERS, tier);
}
