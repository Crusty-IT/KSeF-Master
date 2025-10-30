// client/src/helpers/nip.ts
export function sanitizeNip(nip: string): string {
    return (nip || '').replace(/\D/g, '').slice(0, 10);
}
export function isValidNip(nip: string): boolean {
    const s = sanitizeNip(nip);
    if (s.length !== 10) return false;
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const sum = w.reduce((acc, wv, i) => acc + wv * Number(s[i]), 0);
    const c = sum % 11;
    return c !== 10 && c === Number(s[9]);
}