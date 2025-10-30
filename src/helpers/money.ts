// client/src/helpers/money.ts
export const nfPL2 = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function formatPLN(n: number): string {
    return nfPL2.format(round2(n));
}
export function parseNumberLike(input: string): number | undefined {
    if (!input) return undefined;
    const normalized = input.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return undefined;
    const v = Number(normalized);
    return Number.isFinite(v) ? v : undefined;
}