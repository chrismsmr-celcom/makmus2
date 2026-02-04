const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// On pointe vers la racine du projet car index.html est à côté du dossier /server
const rootPath = path.join(__dirname, '..');
app.use(express.static(rootPath));

// PROXY NEWSAPI (NEWS DATA IO)
app.get('/api/news', async (req, res) => {
    try {
        const API_KEY = process.env.NEWSDATA_API_KEY;
        const category = req.query.category || 'top';
        const query = req.query.q || '';

        let url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=fr`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        else if (category !== 'top') url += `&category=${category}`;

        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Erreur API News:", error.message);
        res.json({ results: [] }); // On renvoie vide pour ne pas faire planter le front
    }
});

// RENVOYER LE FRONT-END
app.get('*', (req, res) => {
    res.sendFile(path.join(rootPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Node actif sur le port ${PORT}`);
});
