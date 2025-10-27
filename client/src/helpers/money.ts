// src/helpers/money.ts

export function formatPLN(value: number): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseNumber(str: string): number {
  if (!str) return 0;
  // accept comma or dot as decimal separator
  const normalized = str.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return isNaN(n) ? 0 : n;
}

export function addSafe(...nums: number[]): number {
  return round2(nums.reduce((a, b) => a + b, 0));
}
