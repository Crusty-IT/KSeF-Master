// src/helpers/vat.ts
import { round2, addSafe } from './money';

export type VatRate = 0 | 5 | 8 | 23 | 'ZW' | 'NP';

export interface LineCalcInput {
  qty: number;
  priceNet: number;
  discount?: number; // percent 0-100
  vatRate: VatRate;
}

export interface LineCalcResult {
  net: number;
  vat: number;
  gross: number;
}

export function calcLine({ qty, priceNet, discount = 0, vatRate }: LineCalcInput): LineCalcResult {
  const q = Math.max(0, qty || 0);
  const price = Math.max(0, priceNet || 0);
  const base = round2(q * price);
  const afterDiscount = round2(base * (1 - (Math.max(0, Math.min(100, discount)) / 100)));
  const vatPercent = typeof vatRate === 'number' ? vatRate : 0;
  const vat = round2(afterDiscount * vatPercent / 100);
  const gross = addSafe(afterDiscount, vat);
  return { net: afterDiscount, vat, gross };
}

export interface VatTotals {
  byRate: Record<string, { net: number; vat: number; gross: number }>;
  net: number;
  vat: number;
  gross: number;
}

export function sumTotals(lines: LineCalcInput[]): VatTotals {
  const byRate: VatTotals['byRate'] = {};
  let net = 0, vat = 0, gross = 0;
  for (const l of lines) {
    const res = calcLine(l);
    const key = String(l.vatRate);
    if (!byRate[key]) byRate[key] = { net: 0, vat: 0, gross: 0 };
    byRate[key].net = round2(byRate[key].net + res.net);
    byRate[key].vat = round2(byRate[key].vat + res.vat);
    byRate[key].gross = round2(byRate[key].gross + res.gross);
    net = round2(net + res.net);
    vat = round2(vat + res.vat);
    gross = round2(gross + res.gross);
  }
  return { byRate, net, vat, gross };
}
