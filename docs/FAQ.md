# Często Zadawane Pytania (FAQ)

## Ogólne

### Czym jest KSeF Master?
KSeF Master to nowoczesna aplikacja webowa służąca do integracji z Krajowym Systemem e-Faktur. Pozwala na wystawianie, odbieranie i zarządzanie fakturami ustrukturyzowanymi.

### Czy aplikacja działa z oficjalnym systemem Ministerstwa Finansów?
Tak, aplikacja komunikuje się z bramkami API Ministerstwa Finansów (testową, demo lub produkcyjną) poprzez backend gateway.

## Logowanie i Dostęp

### Skąd wziąć Token KSeF?
Token należy wygenerować w oficjalnej aplikacji KSeF udostępnionej przez Ministerstwo Finansów pod adresem [ksef.mf.gov.pl](https://ksef.mf.gov.pl).

### Dlaczego logowanie nie działa?
- Upewnij się, że podany NIP jest poprawny (10 cyfr, bez myślników).
- Sprawdź, czy token nie wygasł lub nie został unieważniony.
- Upewnij się, że łączysz się z właściwym środowiskiem (np. nie używaj tokena produkcyjnego na środowisku testowym).

## Funkcjonalności

### Czy mogę pobrać fakturę jako PDF?
Tak, w widoku listy faktur lub szczegółów faktury dostępna jest opcja "Pobierz PDF".

### Jak dodać kontrahenta do bazy?
Możesz dodać kontrahenta ręcznie w module "Kontrahenci" lub podczas wystawiania nowej faktury.

## Problemy Techniczne

### Widzę błąd "Nie można połączyć się z serwerem"
Sprawdź połączenie internetowe oraz upewnij się, że backend API aplikacji jest uruchomiony i dostępny pod adresem skonfigurowanym w zmiennej `VITE_API_URL`.

---
[Poprzedni: Changelog](CHANGELOG.md) | [Wróć do strony głównej](../README.md)
