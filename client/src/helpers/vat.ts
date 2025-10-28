// client/src/helpers/vat.ts
import { round2 } from './money';

export type VatRate = 0 | 5 | 8 | 23 | 'ZW' | 'NP';

export interface CalcInput {
    qty: number;
    priceNet: number;
    vatRate: VatRate;
    discount?: number; // %
}

export interface LineCalc {
    net: number;
    vat: number;
    gross: number;
    rate: VatRate;
}

export function calcLine(i: CalcInput): LineCalc {
    const qty = Math.max(0, i.qty || 0);
    const price = Math.max(0, i.priceNet || 0);
    const factor = 1 - Math.max(0, Math.min(100, i.discount || 0)) / 100;
    const net = round2(qty * price * factor);

    if (i.vatRate === 'ZW' || i.vatRate === 'NP') {
        return { net, vat: 0, gross: net, rate: i.vatRate };
    }
    const rate = typeof i.vatRate === 'number' ? i.vatRate : 0;
    const vat = round2(net * (rate / 100));
    const gross = round2(net + vat);
    return { net, vat, gross, rate: i.vatRate };
}

export interface Totals {
    net: number;
    vat: number;
    gross: number;
    perRate: Record<string, { net: number; vat: number; gross: number }>;
}

export function sumTotals(lines: CalcInput[]): Totals {
    const perRate = new Map<string, { net: number; vat: number; gross: number }>();
    let net = 0, vat = 0, gross = 0;

    for (const l of lines) {
        const c = calcLine(l);
        net += c.net; vat += c.vat; gross += c.gross;
        const key = String(c.rate);
        const bucket = perRate.get(key) || { net: 0, vat: 0, gross: 0 };
        bucket.net += c.net; bucket.vat += c.vat; bucket.gross += c.gross;
        perRate.set(key, bucket);
    }

    const obj: Totals = {
        net: round2(net),
        vat: round2(vat),
        gross: round2(gross),
        perRate: {}
    };
    for (const [k, v] of perRate) {
        obj.perRate[k] = { net: round2(v.net), vat: round2(v.vat), gross: round2(v.gross) };
    }
    return obj;
}