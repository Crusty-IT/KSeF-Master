# Dokumentacja Deploymentu

Ten dokument opisuje proces wdrażania aplikacji KSeF Master na środowisko produkcyjne.

## Budowanie aplikacji

Aby przygotować wersję produkcyjną aplikacji, wykonaj polecenie:

```bash
npm run build
```

Wynik budowania znajdzie się w katalogu `dist/`. Zawiera on zoptymalizowane pliki HTML, JS i CSS gotowe do serwowania przez serwer WWW.

## Środowiska

### Staging
- Adres: `https://staging.ksef-master.pl`
- Backend: Środowisko testowe KSeF

### Production
- Adres: `https://app.ksef-master.pl`
- Backend: Środowisko produkcyjne KSeF

## CI/CD Pipeline (GitHub Actions)

Projekt wykorzystuje GitHub Actions do automatyzacji procesu wdrażania.

1.  **Build & Lint**: Uruchamiane przy każdym Pull Request.
2.  **Deploy to Staging**: Automatyczny po merge do brancha `develop`.
3.  **Deploy to Production**: Ręczny po utworzeniu Release lub merge do brancha `main`.

## Konfiguracja Serwera (Nginx)

Przykładowa konfiguracja Nginx do serwowania aplikacji SPA:

```nginx
server {
    listen 80;
    server_name app.ksef-master.pl;
    root /var/www/ksef-master/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Monitoring i Logowanie

-   **Frontend Error Tracking**: Sentry (zalecane do wdrożenia).
-   **Analytics**: Podstawowe metryki ruchu (np. Google Analytics lub Plausible).
-   **Logs**: Logi serwera Nginx oraz logi backendu gatewaya.

## Procedura Rollback

W przypadku wykrycia krytycznych błędów na produkcji:
1. Przejdź do zakładki "Actions" na GitHub.
2. Wybierz ostatni stabilny build.
3. Kliknij "Re-run all jobs" lub przywróć poprzednią wersję na serwerze poprzez zmianę dowiązania symbolicznego do katalogu `dist`.

---
[Poprzedni: Development](DEVELOPMENT.md) | [Następny: Contributing](CONTRIBUTING.md)
