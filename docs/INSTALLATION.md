# KSeF Master - Instrukcja Instalacji

Ten dokument zawiera szczegółowe instrukcje dotyczące przygotowania środowiska i instalacji projektu KSeF Master.

## Wymagania wstępne

Zanim przystąpisz do instalacji, upewnij się, że na Twoim komputerze zainstalowane są następujące narzędzia:

- **Node.js**: Wersja 18.x lub nowsza (zalecana wersja LTS)
- **npm**: Zazwyczaj instalowany razem z Node.js
- **Git**: Do klonowania repozytorium

## Krok po kroku: Setup projektu

1. **Klonowanie repozytorium**
   ```bash
   git clone https://github.com/your-repo/ksef-master.git
   cd ksef-master
   ```

2. **Instalacja zależności**
   Użyj npm, aby zainstalować wszystkie niezbędne pakiety:
   ```bash
   npm install
   ```

3. **Konfiguracja środowiska**
   Skopiuj plik przykładowy (jeśli istnieje) lub utwórz plik `.env` w katalogu głównym projektu:
   ```bash
   cp .env.example .env
   ```
   *Uwaga: Jeśli plik .env.example nie istnieje, utwórz nowy plik .env (patrz sekcja Konfiguracja).*

4. **Uruchomienie w trybie deweloperskim**
   ```bash
   npm run dev
   ```
   Aplikacja powinna być dostępna pod adresem `http://localhost:5173` (lub innym wskazanym przez Vite).

## Konfiguracja środowiska

Projekt wymaga ustawienia następujących zmiennych w pliku `.env`:

| Zmienna | Opis | Wartość domyślna |
|---------|------|------------------|
| `VITE_API_URL` | Adres URL backendu API KSeF | `http://localhost:8080` |

## Troubleshooting instalacji

### Błędy podczas `npm install`
- Upewnij się, że masz uprawnienia do zapisu w folderze projektu.
- Spróbuj wyczyścić cache npm: `npm cache clean --force`.
- Usuń `node_modules` i `package-lock.json`, a następnie spróbuj ponownie.

### Aplikacja nie uruchamia się
- Sprawdź, czy port 5173 nie jest zajęty przez inny proces.
- Upewnij się, że backend API jest uruchomiony, jeśli próbujesz korzystać z pełnej funkcjonalności.

### Problemy z TypeScript
- Jeśli Twoje IDE zgłasza błędy, upewnij się, że używasz wersji TypeScript zgodnej z tą w `package.json` (~5.9.3).
- Spróbuj zrestartować TS Server w swoim edytorze.

---
[Wróć do strony głównej](../README.md) | [Przejdź do Architektury](ARCHITECTURE.md)
