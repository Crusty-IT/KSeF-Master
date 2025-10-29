// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// --- Dane demonstracyjne (mock) ---
const demoInvoices = [
    { numerKsef: 'ABC-2025-000123', numerFaktury: 'FV/01/2025', nipKontrahenta: '1234567830', kwotaBrutto: 12345.67, dataWystawienia: '2025-10-10', status: 'accepted' },
    { numerKsef: 'ABC-2025-000124', numerFaktury: 'FV/02/2025', nipKontrahenta: '9876543210', kwotaBrutto: 2345.00, dataWystawienia: '2025-10-11', status: 'pending' },
    { numerKsef: 'ABC-2025-000125', numerFaktury: 'FV/03/2025', nipKontrahenta: '5250012312', kwotaBrutto: 999.99, dataWystawienia: '2025-10-12', status: 'rejected' },
    { numerKsef: 'ABC-2025-000126', numerFaktury: 'FV/04/2025', nipKontrahenta: '1112223344', kwotaBrutto: 5120.00, dataWystawienia: '2025-10-13', status: 'accepted' },
];

// Utils: proste filtrowanie i paginacja w pamięci
function applyFilters(list, query) {
    let items = [...list];
    const { from, to, nip, status } = query;
    if (from) items = items.filter(i => i.dataWystawienia >= from);
    if (to) items = items.filter(i => i.dataWystawienia <= to);
    if (nip) items = items.filter(i => (i.nipKontrahenta || '').includes(String(nip)));
    if (status) items = items.filter(i => i.status === status);

    // Paginacja (front-endowa, ale dla demo obsłużymy tutaj też)
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(query.pageSize, 10) || 50));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
}

// Endpoint: faktury odebrane
app.get('/api/faktury-odebrane', async (req, res) => {
    console.log('Backend: Otrzymano zapytanie o faktury odebrane.', req.query);
    setTimeout(() => {
        const data = applyFilters(demoInvoices, req.query || {});
        res.json(data);
    }, 200);
});

// Endpoint: faktury wystawione (alias)
app.get(['/api/faktury-wystawione', '/api/invoices/issued'], async (req, res) => {
    console.log('Backend: Otrzymano zapytanie o faktury wystawione.', req.query);
    // Dla uproszczenia zwracamy ten sam zestaw co odebrane
    setTimeout(() => {
        const data = applyFilters(demoInvoices, req.query || {});
        res.json(data);
    }, 200);
});

app.listen(PORT, () => {
    console.log(`Serwer proxy (z mockami) dla KSeF działa na porcie ${PORT}`);
});