/**
 * MAKMUS MEDIA GROUP - Système de Gestion Dynamique (script.js)
 * Version : 2.0 (Optimisée New York Times Style)
 */

// --- 1. CONFIGURATION & CLIENTS ---
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // <--- REMMETTRE TA CLÉ ICI
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = window.location.origin;
const NEWAPI_PROXY = `${BASE_URL}/api/news`; // Proxy pour éviter les erreurs CORS
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure de cache

// --- 2. SYSTÈME ANALYTICS & TRACKING ---
const tracker = {
    getVisitorId: () => {
        let id = sessionStorage.getItem('makmus_visitor_id');
        if (!id) {
            id = 'v-' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('makmus_visitor_id', id);
        }
        return id;
    },
    log: async (type, data = {}) => {
        try {
            await supabaseClient.from('stats').insert([{
                event_type: type,
                article_title: data.title || 'Page Accueil',
                category: data.category || 'Général',
                path: window.location.pathname,
                visitor_id: tracker.getVisitorId(),
                created_at: new Date().toISOString()
            }]);
        } catch (e) { console.warn("Analytics error:", e); }
    }
};

// --- 3. UI & NAVIGATION (MENU SECTIONS) ---
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const liveDate = document.getElementById('live-date');
    if (liveDate) liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
}

// Gestion Ouverture/Fermeture Menu
const btnOpenMenu = document.getElementById('btnOpenMenu');
const btnCloseMenu = document.getElementById('closeMenu');
const fullMenu = document.getElementById('fullMenu');

if (btnOpenMenu) {
    btnOpenMenu.onclick = () => {
        fullMenu.classList.add('open');
        document.body.style.overflow = 'hidden';
    };
}

if (btnCloseMenu) {
    btnCloseMenu.onclick = () => {
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
    };
}

window.executeMenuSearch = function() {
    const query = document.getElementById('menuSearchInput').value;
    if (query) {
        fetchAllContent('top', query);
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
};

// --- 4. RÉCUPÉRATION DES DONNÉES (MAIN, OPINION, LIFESTYLE) ---
async function fetchAllContent(category = 'top', query = '') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const status = document.getElementById('status-line');
    const now = new Date().getTime();

    try {
        if (status) status.textContent = "CHARGEMENT...";

        // Requêtes Supabase
        let pMain = supabaseClient.from('articles').select('*').eq('is_published', true)
            .order('is_priority', { ascending: false }).order('created_at', { ascending: false });
        
        if (category !== 'top') pMain = pMain.eq('category', category);
        if (query) pMain = pMain.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);

        const pOpinion = supabaseClient.from('articles').select('*')
            .eq('category', 'Opinion').eq('is_published', true).limit(5).order('created_at', { ascending: false });

        const [mainRes, opinionRes] = await Promise.all([pMain, pOpinion]);

        // Lifestyle (API NewsData avec Cache)
        let lifestyleNews = [];
        const cachedLife = localStorage.getItem('news_api_lifestyle');
        const cachedTime = localStorage.getItem('news_api_lifestyle_time');

        if (cachedLife && (now - cachedTime < CACHE_DURATION)) {
            lifestyleNews = JSON.parse(cachedLife);
        } else {
            try {
                const res = await fetch(`${NEWAPI_PROXY}?category=lifestyle`);
                const newsData = await res.json();
                lifestyleNews = newsData.results || [];
                localStorage.setItem('news_api_lifestyle', JSON.stringify(lifestyleNews));
                localStorage.setItem('news_api_lifestyle_time', now.toString());
            } catch (e) { console.warn("API Lifestyle indisponible"); }
        }

        renderAll({
            myArticles: mainRes.data || [],
            opinionArticles: opinionRes.data || [],
            lifestyleNews: lifestyleNews,
            category
        }, query);

    } catch (e) {
        console.error("Fetch error:", e);
        if (status) status.textContent = "ERREUR DE CONNEXION.";
    }
}

// --- 5. RENDU DU CONTENU (HERO, GRID, SIDEBAR) ---
function renderAll(data, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const sidebar = document.getElementById('sidebar-list');
    const lifestyleBox = document.getElementById('lifestyle-list');
    const opinionBox = document.getElementById('opinion-list');
    const status = document.getElementById('status-line');

    const articles = data.myArticles;

    // Article à la Une (Hero)
    if (hero && articles[0]) {
        const h = articles[0];
        hero.innerHTML = `
            <div class="hero-container" onclick="location.href='redaction.html?id=${h.id}'">
                <div class="hero-text">
                    <span class="category-tag">${h.category}</span>
                    <h1>${h.titre}</h1>
                    <p>${(h.description || "").substring(0, 180)}...</p>
                </div>
                <div class="hero-img"><img src="${h.image_url}"></div>
            </div>`;
    }

    // Grille Principale (Articles 2 à 7)
    if (grid) {
        grid.innerHTML = articles.slice(1, 7).map(art => `
            <div class="article-card" onclick="location.href='redaction.html?id=${art.id}'">
                <div class="img-wrapper"><img src="${art.image_url}"></div>
                <span class="category-tag">${art.category}</span>
                <h3>${art.titre}</h3>
            </div>`).join('');
    }

    // Sidebar Standard
    if (sidebar) {
        sidebar.innerHTML = articles.slice(7, 12).map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'">
                <span class="category-tag">${art.category}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    // Lifestyle (API)
    if (lifestyleBox) {
        lifestyleBox.innerHTML = data.lifestyleNews.slice(0, 3).map(art => `
            <div class="sidebar-article" onclick="window.open('${art.link}', '_blank')">
                <h4>${art.title}</h4>
            </div>`).join('');
    }

    // Opinions
    if (opinionBox) {
        opinionBox.innerHTML = data.opinionArticles.map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'">
                <span class="opinion-author">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    if (status) status.textContent = query ? `RÉSULTATS : ${query.toUpperCase()}` : `ÉDITION DU JOUR`;
}

// --- 6. SECTIONS SPÉCIALES (TICKER & VIDÉOS) ---

// Ticker Boursier Dynamique
async function initMarketTicker() {
    const wrapper = document.getElementById('ticker-content');
    if (!wrapper) return;

    try {
        // Taux USD/CDF (Franc Congolais)
        const res = await fetch(`https://v6.exchangerate-api.com/v6/4e4fee63bab6fce7ba7b39e8/latest/USD`);
        const data = await res.json();
        const rate = Math.round(data.conversion_rates.CDF);

        wrapper.innerHTML = `
            <span>USD/CDF: ${rate.toLocaleString()} FC <i class="ticker-up">▲</i></span>
            <span>BTC/USD: 96,420$ <i class="ticker-up">▲</i></span>
            <span>ETH/USD: 2,650$ <i class="ticker-down">▼</i></span>
            <span>OR (oz): 2,045$ <i class="ticker-up">▲</i></span>
        `;
    } catch (e) {
        wrapper.innerHTML = `<span>Marchés financiers en direct...</span>`;
    }
}

// Vidéos Verticales
async function fetchVideosVerticaux() {
    const { data } = await supabaseClient.from('videos').select('*').limit(6);
    const container = document.getElementById('video-slider');
    if (container && data) {
        container.innerHTML = data.map(vid => `
            <div class="video-card">
                <video src="${vid.video_url}" loop muted playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                <div class="play-icon">▶</div>
                <div class="video-overlay">
                    <h4>${vid.titre}</h4>
                </div>
            </div>`).join('');
    }
}

// --- 7. INITIALISATION FINALE ---
window.addEventListener('DOMContentLoaded', () => {
    updateDate();
    initMarketTicker();
    fetchAllContent('top');
    fetchVideosVerticaux();
    
    // Log de visite
    tracker.log('view', { title: 'Visite Page Accueil' });
});
