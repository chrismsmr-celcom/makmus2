const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration : On dit au serveur que les fichiers HTML/CSS sont à la RACINE (..)
app.use(express.static(path.join(__dirname, '..')));

// Route pour récupérer les news
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
        console.error("Erreur API:", error.message);
        res.status(500).json({ results: [], error: "Erreur serveur" });
    }
});

// Route de secours : renvoie toujours l'index.html si on se perd
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
    console.log(`MAKMUS Serveur lancé sur le port ${PORT}`);
});
