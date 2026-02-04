const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// TRÈS IMPORTANT : Render définit le PORT automatiquement. 
// On utilise 8080 par défaut pour correspondre à notre Dockerfile.
const PORT = process.env.PORT || 8080;

// On définit le dossier où se trouvent tes fichiers (index.html, style.css)
// Dans notre Docker, tout est copié dans /app
const publicPath = path.join(__dirname);

// On sert les fichiers statiques
app.use(express.static(publicPath));

// --- ROUTE POUR LES NEWS (PROXY) ---
app.get('/api/news', async (req, res) => {
    try {
        // Ta clé NewsData.io doit être dans les variables d'environnement sur Render
        const API_KEY = process.env.NEWSDATA_API_KEY;
        
        if (!API_KEY) {
            console.error("Variable NEWSDATA_API_KEY manquante !");
            return res.status(500).json({ results: [], error: "Clé API manquante sur le serveur" });
        }

        const category = req.query.category || 'top';
        const query = req.query.q || '';

        // Construction de l'URL pour NewsData.io (LATEST)
        let url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=fr`;
        
        if (query) {
            url += `&q=${encodeURIComponent(query)}`;
        } else if (category !== 'top') {
            url += `&category=${category}`;
        }

        console.log(`Appel API NewsData: ${url}`);
        
        const response = await axios.get(url, { timeout: 5000 }); // Timeout de 5s pour éviter de bloquer
        res.json(response.data);

    } catch (error) {
        console.error("Erreur NewsAPI:", error.response ? error.response.data : error.message);
        // On renvoie un tableau vide au lieu de faire planter le site
        res.status(200).json({ results: [], info: "Pas de news disponibles pour le moment" });
    }
});

// --- ROUTE ADMIN (Optionnelle) ---
// Juste pour vérifier si le serveur Node répond bien
app.get('/health', (req, res) => {
    res.send("Serveur Node MAKMUS : Opérationnel");
});

// --- ROUTE DE SECOURS (SPA) ---
// Si l'utilisateur tape une URL au hasard, on le renvoie sur l'index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`✅ SERVEUR MAKMUS LANCÉ SUR LE PORT ${PORT}`);
    console.log(`✅ ACCÈS : http://0.0.0.0:${PORT}`);
    console.log(`-----------------------------------------`);
});
