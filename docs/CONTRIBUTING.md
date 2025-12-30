# Jak kontrybuować (Contributing)

Dziękujemy za zainteresowanie rozwojem KSeF Master! Poniżej znajdziesz wytyczne dotyczące procesu kontrybucji.

## Proces Pull Request

1.  **Forkuj repozytorium** i utwórz swój branch od gałęzi `develop`.
2.  **Zaktualizuj dokumentację** (jeśli dodajesz nową funkcjonalność lub zmieniasz istniejącą).
3.  **Dodaj testy**, jeśli to możliwe.
4.  **Upewnij się, że linter nie zgłasza błędów** (`npm run lint`).
5.  **Opisz swoje zmiany** w opisie Pull Request, linkując do odpowiednich zgłoszeń (issues).
6.  PR musi zostać zaakceptowany przez przynajmniej jednego maintainera przed mergem.

## Style Guide

### JavaScript / TypeScript
- Używamy 4 spacji do wcięcia.
- Stosujemy średniki.
- Preferujemy `const` zamiast `let`.
- Używamy arrow functions dla krótkich funkcji.

### CSS
- BEM (Block Element Modifier) jest zalecaną metodologią nazewnictwa klas (choć obecnie projekt stosuje luźniejszą strukturę).
- Unikaj używania `!important`.

## Code Review Guidelines

Podczas recenzji kodu zwracamy uwagę na:
-   **Czytelność**: Czy kod jest łatwy do zrozumienia?
-   **Bezpieczeństwo**: Czy dane wejściowe są walidowane? Czy nie wyciekają tokeny?
-   **Wydajność**: Czy nie ma niepotrzebnych re-renderów w React?
-   **Zgodność z typami**: Czy TypeScript jest używany poprawnie?

---
[Poprzedni: Deployment](DEPLOYMENT.md) | [Następny: Changelog](CHANGELOG.md)
