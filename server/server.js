const express = require('express');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Dossier racine où se trouvent index.html et style.css
const rootPath = path.join(__dirname, '..');
app.use(express.static(rootPath));

// 1. PROXY POCKETBASE (Accès Admin via /pb/_/)
app.use('/pb', createProxyMiddleware({ 
    target: 'http://127.0.0.1:9000', 
    changeOrigin: true,
    pathRewrite: { '^/pb': '' } 
}));

// 2. PROXY NEWSAPI (NEWS DATA IO)
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
        res.json({ results: [] });
    }
});

// 3. RENVOYER LE FRONT-END
app.get('*', (req, res) => {
    res.sendFile(path.join(rootPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur hybride OK sur port ${PORT}`);
});
