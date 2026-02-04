const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
// Render définit automatiquement la variable PORT
const PORT = process.env.PORT || 3000;

// On sert les fichiers statiques (HTML, CSS, JS frontend)
// Dans Docker, ils seront copiés dans le même dossier que server.js
app.use(express.static(__dirname));

// --- ROUTE POUR LES NEWS (PROXY) ---
app.get('/api/news', async (req, res) => {
    try {
        const API_KEY = process.env.NEWSDATA_API_KEY;
        const category = req.query.category || 'top';
        const query = req.query.q || '';

        // Construction de l'URL pour NewsData.io
        let url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=fr`;
        
        if (query) {
            url += `&q=${encodeURIComponent(query)}`;
        } else if (category !== 'top') {
            url += `&category=${category}`;
        }

        console.log("Appel NewsData API...");
        const response = await axios.get(url);
        
        // On renvoie les données au frontend
        res.json(response.data);
    } catch (error) {
        console.error("Erreur API NewsData:", error.message);
        res.status(500).json({ 
            results: [], 
            error: "Impossible de récupérer les news" 
        });
    }
});

// --- ROUTE DE SECOURS ---
// Si on tape une adresse inconnue, on renvoie l'index.html (important pour les Single Page Apps)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`=== MAKMUS SERVEUR CONNECTÉ ===`);
    console.log(`Port : ${PORT}`);
    console.log(`Répertoire : ${__dirname}`);
});
