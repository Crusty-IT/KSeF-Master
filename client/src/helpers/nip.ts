// src/helpers/nip.ts
// Walidacja numeru NIP (Poland) — 10 cyfr + suma kontrolna

export function sanitizeNip(input: string): string {
  return (input || '').replace(/\D/g, '').slice(0, 10);
}

export function isValidNip(nip: string): boolean {
  const s = sanitizeNip(nip);
  if (s.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const digits = s.split('').map(d => parseInt(d, 10));
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const control = sum % 11;
  return control === digits[9];
}
