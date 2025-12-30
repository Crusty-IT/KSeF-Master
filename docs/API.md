# Dokumentacja API

KSeF Master komunikuje się z backendem poprzez REST API. Domyślny adres bazowy to `http://localhost:8080/api/ksef`.

## Autentykacja i Sesja

### Logowanie
`POST /login`

Rozpoczyna sesję w KSeF przy użyciu NIP i tokena.

**Request Body:**
```json
{
  "nip": "5252161248",
  "ksefToken": "TWOJ_TOKEN_KSEF"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "nip": "5252161248",
    "referenceNumber": "20231027-SE-...",
    "accessTokenValidUntil": "2023-10-27T15:00:00Z"
  }
}
```

### Status Sesji
`GET /status`

Zwraca informacje o bieżącej sesji użytkownika.

### Wylogowanie
`POST /logout`

Kończy bieżącą sesję.

---

## Faktury

### Pobieranie Listy Faktur
`POST /invoices`

Pobiera listę faktur na podstawie zadanych kryteriów.

**Request Body:**
```json
{
  "subjectType": "Subject1",
  "dateRange": {
    "dateType": "PermanentStorage",
    "from": "2023-01-01T00:00:00Z",
    "to": "2023-12-31T23:59:59Z"
  }
}
```
*   `subjectType`: `Subject1` (wystawione), `Subject2` (odebrane).

### Wysyłanie Faktury
`POST /invoice/send`

Wysyła nową fakturę do systemu KSeF.

**Request Body (przykład uproszczony):**
```json
{
  "invoiceNumber": "FV/2025/01/01",
  "issueDate": "2025-01-01",
  "seller": { "nip": "1234567890", "name": "Firma X", "addressLine1": "ul. Testowa 1" },
  "buyer": { "nip": "0987654321", "name": "Klient Y", "addressLine1": "ul. Kupiecka 2" },
  "items": [
    { "name": "Usługa programistyczna", "quantity": 1, "unitPriceNet": 1000, "vatRate": "23" }
  ]
}
```

### Pobieranie PDF
`POST /invoice/pdf`

Generuje i zwraca plik PDF faktury.

---

## Kody Błędów

| Kod | Znaczenie |
|-----|-----------|
| 400 | Niepoprawne dane wejściowe (np. błędny format NIP) |
| 401 | Brak autoryzacji lub wygasła sesja KSeF |
| 403 | Brak uprawnień do wykonania operacji |
| 500 | Błąd wewnętrzny serwera lub problem z połączeniem z bramką MF |

## Przykłady Użycia

### cURL (Logowanie)
```bash
curl -X POST http://localhost:8080/api/ksef/login \
     -H "Content-Type: application/json" \
     -d '{"nip":"5252161248", "ksefToken":"..."}'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('/api/ksef/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subjectType: 'Subject1',
    dateRange: { from: '2023-10-01T00:00:00Z', to: '2023-10-31T23:59:59Z' }
  })
});
const data = await response.json();
```

---
[Poprzedni: Architektura](ARCHITECTURE.md) | [Następny: Konfiguracja](CONFIGURATION.md)
