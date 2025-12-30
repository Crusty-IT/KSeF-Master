# KSeF Master

KSeF Master to zaawansowana aplikacja webowa typu SPA (Single Page Application) służąca do kompleksowej obsługi Krajowego Systemu e-Faktur (KSeF). Projekt został stworzony z myślą o firmach i biurach rachunkowych, które potrzebują intuicyjnego interfejsu do zarządzania fakturami ustrukturyzowanymi.

## Główne Funkcjonalności

-   **Autentykacja KSeF**: Bezpieczne logowanie przy użyciu NIP i tokena sesyjnego.
-   **Wystawianie Faktur**: Kreator faktur ustrukturyzowanych zgodnych ze schemą FA(2).
-   **Przeglądanie Faktur**: Lista faktur wystawionych i odebranych z możliwością filtrowania.
-   **Pobieranie PDF**: Automatyczne generowanie wizualizacji faktur w formacie PDF.
-   **Raportowanie**: Moduł analityczny prezentujący podsumowania finansowe.
-   **Baza Kontrahentów**: Zarządzanie danymi klientów i dostawców.
-   **Ciemny Motyw**: Nowoczesny interfejs UI zoptymalizowany pod kątem komfortu pracy.

## Wymagania Systemowe

-   **Node.js**: 18.x lub nowszy.
-   **Przeglądarka**: Najnowsza wersja Chrome, Firefox, Safari lub Edge.
-   **Dostęp do internetu**: Niezbędny do komunikacji z bramką KSeF.

## Szybki Start

1.  Zainstaluj zależności:
    ```bash
    npm install
    ```
2.  Skonfiguruj zmienne środowiskowe w pliku `.env` (patrz [Konfiguracja](docs/CONFIGURATION.md)).
3.  Uruchom aplikację w trybie deweloperskim:
    ```bash
    npm run dev
    ```
4.  Otwórz `http://localhost:5173` w przeglądarce.

## Dokumentacja Szczegółowa

Pełna dokumentacja projektu znajduje się w folderze `docs/`:

1.  [**Instalacja**](docs/INSTALLATION.md) – Szczegółowy setup środowiska.
2.  [**Architektura**](docs/ARCHITECTURE.md) – Opis struktury projektu i flow danych.
3.  [**API**](docs/API.md) – Dokumentacja punktów styku z backendem.
4.  [**Konfiguracja**](docs/CONFIGURATION.md) – Opis zmiennych środowiskowych.
5.  [**Development**](docs/DEVELOPMENT.md) – Wytyczne dla programistów.
6.  [**Deployment**](docs/DEPLOYMENT.md) – Instrukcje wdrażania na produkcję.
7.  [**Contributing**](docs/CONTRIBUTING.md) – Jak kontrybuować do projektu.
8.  [**Changelog**](docs/CHANGELOG.md) – Historia zmian.
9.  [**FAQ**](docs/FAQ.md) – Najczęściej zadawane pytania.

---
© 2025 KSeF Master Team. Projekt stworzony w celach demonstracyjnych i integracyjnych.
