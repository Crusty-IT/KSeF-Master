# Dokumentacja Deweloperska

Ten dokument jest przeznaczony dla programistów pracujących nad projektem KSeF Master.

## Setup Środowiska Deweloperskiego

1. Zainstaluj Node.js (>= 18).
2. Zainstaluj zależności: `npm install`.
3. Uruchom serwer deweloperski: `npm run dev`.
4. (Opcjonalnie) Uruchom backend KSeF Gateway.

## Struktura Projektu

```text
src/
├── components/     # Reużywalne komponenty UI
│   ├── buttons/    # Przyciski
│   ├── form/       # Pola formularzy (NIP, kwoty, itp.)
│   ├── layout/     # SideNav, Header
│   └── modal/      # Okna modalne
├── context/        # Konteksty React (AuthContext)
├── helpers/        # Funkcje pomocnicze (walutowe, vat, nip)
├── services/       # Komunikacja z API (ksefApi.ts)
└── views/          # Główne widoki stron
```

## Standardy Kodowania

-   **TypeScript**: Obowiązkowe typowanie wszystkich propsów i funkcji. Unikaj używania `any`.
-   **Komponenty Funkcyjne**: Używamy wyłącznie komponentów funkcyjnych z hookami.
-   **Nazywanie Plików**: Komponenty PascalCase (`NewInvoice.tsx`), helpery/serwisy camelCase (`ksefApi.ts`).
-   **Style**: Pliki CSS obok plików TSX, importowane bezpośrednio w komponencie.

## Proces Developmentu

1. Utwórz nowy branch dla funkcjonalności/poprawki.
2. Zaimplementuj zmiany zgodnie ze standardami.
3. Sprawdź działanie lokalnie.
4. Uruchom linter: `npm run lint`.
5. Prześlij Pull Request.

## Testowanie

Obecnie projekt koncentruje się na testach manualnych w środowisku testowym KSeF.
W przyszłości planowane jest wdrożenie:
-   Unit testów dla helperów (`vitest`).
-   Testów E2E dla kluczowych ścieżek (`Playwright`).

Aby uruchomić dostępne sprawdzenia:
```bash
npm run lint
```

## Jak dodać nową funkcjonalność?

1. Jeśli funkcja wymaga nowego widoku, dodaj folder w `src/views/`.
2. Zdefiniuj nową trasę w `src/App.tsx` przy użyciu `react-router-dom`.
3. Jeśli potrzebne są nowe wywołania API, dodaj je do `src/services/ksefApi.ts`.
4. Wykorzystaj istniejące komponenty z `src/components/`, aby zachować spójność UI.

---
[Poprzedni: Konfiguracja](CONFIGURATION.md) | [Następny: Deployment](DEPLOYMENT.md)
