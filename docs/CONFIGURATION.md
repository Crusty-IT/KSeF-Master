# Konfiguracja Projektu

Projekt KSeF Master wykorzystuje zmienne środowiskowe do konfiguracji działania aplikacji w różnych środowiskach.

## Zmienne Środowiskowe

Aplikacja używa prefixu `VITE_` dla zmiennych, które mają być dostępne w kodzie frontendowym.

| Klucz | Opis | Przykładowa wartość |
|-------|------|--------------------|
| `VITE_API_URL` | Podstawowy URL do backendu API | `http://localhost:8080` |
| `VITE_APP_NAME` | Nazwa aplikacji wyświetlana w UI | `KSeF Master` |
| `VITE_ENV` | Środowisko uruchomieniowe | `development` |

## Pliki Konfiguracyjne

### `.env`
Główny plik konfiguracyjny (nie powinien być commitowany do repozytorium, jeśli zawiera wrażliwe dane).

### `.env.local`
Lokalne nadpisania zmiennych środowiskowych.

### `.env.production`
Zmienne używane podczas budowania wersji produkcyjnej (`npm run build`).

## Przykładowe Konfiguracje

### Deweloperska (Dev)
```env
VITE_API_URL=http://localhost:8080
VITE_ENV=development
```

### Produkcyjna (Prod)
```env
VITE_API_URL=https://api.ksef-master.pl
VITE_ENV=production
```

## Inne Pliki Konfiguracyjne

-   `vite.config.ts`: Konfiguracja narzędzia budującego Vite, proxy, pluginów React.
-   `tsconfig.json`: Konfiguracja kompilatora TypeScript.
-   `eslint.config.js`: Reguły lintera dla zachowania czystości kodu.

---
[Poprzedni: API](API.md) | [Następny: Development](DEVELOPMENT.md)
