// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // To będzie "backendowy" axios

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' })); // Pozwól na zapytania z frontendu
app.use(express.json());

// Tutaj będą Twoje endpointy, które będzie wołał frontend
app.get('/api/faktury-odebrane', async (req, res) => {
    try {
        // 1. Tutaj wykonaj logikę autoryzacji z KSeF, używając sekretów z process.env
        const ksefSessionToken = '...uzyskany_wcześniej_token...'; // Przykładowo

        // 2. Wykonaj rzeczywiste zapytanie do API KSeF
        const ksefApiUrl = 'https://ksef-test.mf.gov.pl/api/online/Query/Invoice/Incoming';
        const response = await axios.get(ksefApiUrl, {
            headers: {
                'SessionToken': ksefSessionToken
            }
        });

        // 3. Odeslij dane do frontendu
        res.json(response.data);

    } catch (error) {
        console.error("Błąd po stronie serwera:", error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

// ...inne endpointy, np. do wysyłania faktur

app.listen(PORT, () => {
    console.log(`Serwer proxy dla KSeF działa na porcie ${PORT}`);
});