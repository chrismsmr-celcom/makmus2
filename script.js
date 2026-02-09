/* ==========================================================================
   1. CONFIGURATION & CLIENTS
   ========================================================================== */
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio';
const EXCHANGE_API_KEY = '4e4fee63bab6fce7ba7b39e8';
const BACKEND_URL = 'https://makmus2-backend-api.onrender.com/api/news';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==========================================================================
   2. INTERFACE : MENU & MODALES
   ========================================================================== */
window.toggleMenu = (show) => {
    const menu = document.getElementById('fullMenu');
    if (!menu) return;
    if (show) {
        menu.classList.add('active');
        document.body.style.overflow = 'hidden'; // Empêche le scroll derrière
    } else {
        menu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

window.toggleModal = (id, show) => {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = show ? 'flex' : 'none';
};

/* ==========================================================================
   3. ANALYTICS & TRACKING
   ========================================================================== */
const tracker = {
    getVisitorId: () => {
        let id = sessionStorage.getItem('makmus_visitor_id') || 'v-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('makmus_visitor_id', id);
        return id;
    },
    log: async (type, data = {}) => {
        try {
            await supabaseClient.from('stats').insert([{
                event_type: type,
                article_title: data.title || 'Page Accueil',
                path: window.location.pathname,
                visitor_id: tracker.getVisitorId(),
                created_at: new Date().toISOString()
            }]);
        } catch (e) { console.warn("Tracking error ignored"); }
    }
};

window.captureAction = async (title, category, url) => {
    await tracker.log('click_article', { title, category });
    if (url) window.location.href = url;
};

/* ==========================================================================
   4. BOURSE & TICKER
   ========================================================================== */
let marketData = [
    { label: "USD/CDF", value: "Chargement...", change: "LIVE", trend: "up" },
    { label: "BTC/USD", value: "98,450", change: "+1.2%", trend: "up" },
    { label: "OR (oz)", value: "2,150", change: "-0.5%", trend: "down" }
];

async function fetchMarketData() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await res.json();
        if (data.result === "success") {
            marketData[0].value = Math.round(data.conversion_rates.CDF).toLocaleString() + " FC";
        }
    } catch (e) { console.error("Market API error"); }
}

let currentTickerIndex = 0;
function updateTickerUI() {
    const wrapper = document.getElementById('ticker-content');
    if (!wrapper) return;
    
    wrapper.style.transition = "opacity 0.3s";
    wrapper.style.opacity = "0";
    
    setTimeout(() => {
        const item = marketData[currentTickerIndex];
        wrapper.innerHTML = `<strong>${item.label}:</strong> ${item.value} 
            <small style="color:${item.trend === 'up' ? '#27ae60' : '#e74c3c'}">${item.change}</small>`;
        wrapper.style.opacity = "1";
        currentTickerIndex = (currentTickerIndex + 1) % marketData.length;
    }, 300);
}

/* ==========================================================================
   5. MOTEUR HYBRIDE (NEWS)
   ========================================================================== */
async function fetchHybridNews(category = 'top', querySearch = '') {
    const status = document.getElementById('status-line');
    if (status) status.textContent = "CHARGEMENT...";

    try {
        let query = supabaseClient.from('articles').select('*').eq('is_published', true);
        if (category !== 'top') query = query.eq('category', category);
        if (querySearch) query = query.or(`titre.ilike.%${querySearch}%,description.ilike.%${querySearch}%`);

        const { data: myArticles, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let worldNews = [];
        if (category === 'top' && !querySearch) {
            const cached = localStorage.getItem('news_api_cache');
            const cacheTime = localStorage.getItem('news_api_timestamp');
            
            if (cached && cacheTime && (Date.now() - cacheTime < 3600000)) {
                worldNews = JSON.parse(cached);
            } else {
                const res = await fetch(BACKEND_URL);
                if (res.ok) {
                    const apiData = await res.json();
                    worldNews = (apiData.articles || []).filter(a => a.urlToImage && a.title !== "[Removed]");
                    localStorage.setItem('news_api_cache', JSON.stringify(worldNews));
                    localStorage.setItem('news_api_timestamp', Date.now());
                }
            }
        }

        const existingTitles = new Set(myArticles.map(a => a.titre.toLowerCase().trim()));
        const filteredWorld = worldNews.filter(a => !existingTitles.has(a.title?.toLowerCase().trim()));

        renderUI(myArticles, filteredWorld);

        if (status) {
            status.textContent = querySearch ? `RÉSULTATS : ${querySearch.toUpperCase()}` : 
                                 (category === 'top' ? "ÉDITION DU JOUR — KINSHASA" : `RUBRIQUE : ${category.toUpperCase()}`);
        }
    } catch (e) {
        if (status) status.textContent = "ERREUR DE RÉSEAU";
    }
}

function renderUI(myArticles, worldNews = []) {
    const all = [...myArticles, ...worldNews]; 
    if (all.length === 0) return;

    const hero = document.getElementById('hero-zone');
    if (hero && all[0]) {
        const h = all[0];
        const displayTitle = h.titre || h.title;
        const displayImg = h.image_url || h.urlToImage || 'https://via.placeholder.com/800x500';
        const displayLink = h.id ? `redaction.html?id=${h.id}` : h.url;

        hero.innerHTML = `
            <div class="main-article" onclick="captureAction('${displayTitle.replace(/'/g, "\\'")}', '${h.category || 'Monde'}', '${displayLink}')" style="cursor:pointer;">
                <h1>${displayTitle}</h1>
                <div class="hero-content">
                    <div class="hero-text">
                        <p style="font-size:1.25rem; color:#333; margin-bottom:15px;">${(h.description || "").substring(0, 300)}...</p>
                        <span style="font-weight:bold; color:var(--primary-red); text-transform:uppercase; font-size:0.8rem;">Lire la suite →</span>
                    </div>
                    <div class="hero-image"><img src="${displayImg}" alt="Focus"></div>
                </div>
            </div>`;
    }

    const grid = document.getElementById('news-grid');
    if (grid) {
        grid.innerHTML = all.slice(1, 5).map(art => {
            const t = art.titre || art.title;
            const img = art.image_url || art.urlToImage;
            const link = art.id ? `redaction.html?id=${art.id}` : art.url;
            return `
                <div class="article-card" onclick="captureAction('${t.replace(/'/g, "\\'")}', '${art.category || 'Infos'}', '${link}')" style="cursor:pointer;">
                    <img src="${img}" style="width:100%; height:200px; object-fit:cover;">
                    <h3>${t}</h3>
                    <p>${(art.description || "").substring(0, 100)}...</p>
                </div>`;
        }).join('');
    }
}

/* ==========================================================================
   6. VIDÉOS & PUBS
   ========================================================================== */
const ICONS = {
    LIKE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    MUTE: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"></path></svg>`,
    VOL: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>`,
    FULL: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`
};

// Fonctions vidéo manquantes
window.toggleMute = (e, btn) => {
    e.stopPropagation();
    const video = btn.closest('.video-card').querySelector('video');
    video.muted = !video.muted;
    btn.innerHTML = video.muted ? ICONS.MUTE : ICONS.VOL;
};

window.toggleFullscreen = (e, btn) => {
    e.stopPropagation();
    const video = btn.closest('.video-card').querySelector('video');
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
};

window.handleLike = async (e, btn, id) => {
    e.stopPropagation();
    const countSpan = btn.nextElementSibling;
    let current = parseInt(countSpan.textContent);
    countSpan.textContent = current + 1;
    btn.style.color = "var(--primary-red)";
    await supabaseClient.rpc('increment_likes', { row_id: id }); // Requiert une fonction RPC sur Supabase
};

async function fetchVideosVerticaux() {
    const { data } = await supabaseClient.from('videos_du_jour').select('*').eq('is_published', true);
    const slider = document.getElementById('video-slider');
    if (!slider || !data) return;

    slider.innerHTML = data.map(vid => `
        <div class="video-card">
            <div class="video-controls-top">
                <div class="control-group"><button class="control-btn" onclick="handleLike(event, this, '${vid.id}')">${ICONS.LIKE}</button><span class="like-count">${vid.likes || 0}</span></div>
                <button class="control-btn" onclick="toggleMute(event, this)">${ICONS.MUTE}</button>
                <button class="control-btn" onclick="toggleFullscreen(event, this)">${ICONS.FULL}</button>
            </div>
            <video src="${vid.video_url}" loop muted playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            <div class="video-overlay-bottom"><h4>${vid.titre}</h4></div>
        </div>`).join('');
}

// Publicité
let activeAds = [], currentAdIndex = 0;
async function initAdSlider() {
    const { data } = await supabaseClient.from('publicites').select('*').eq('est_active', true);
    if (!data || data.length === 0) return;
    activeAds = data;
    showNextAd();
    setInterval(showNextAd, 15000);
}

function showNextAd() {
    const zone = document.getElementById('ad-display-zone');
    if (!zone || activeAds.length === 0) return;
    const ad = activeAds[currentAdIndex];
    const content = ad.type === 'video' ? 
        `<video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>` :
        `<img class="ad-media ad-fade" src="${ad.media_url}">`;
    
    zone.innerHTML = `<div onclick="trackAdClick('${ad.id}', '${ad.lien_clic}')" style="cursor:pointer">${content}</div>`;
    currentAdIndex = (currentAdIndex + 1) % activeAds.length;
}

async function trackAdClick(id, url) {
    if (url) window.open(url, '_blank');
    try {
        const { data: ad } = await supabaseClient.from('publicites').select('nb_clics').eq('id', id).single();
        await supabaseClient.from('publicites').update({ nb_clics: (ad.nb_clics || 0) + 1 }).eq('id', id);
    } catch (e) { console.error("Ad track error"); }
}

/* ==========================================================================
   7. INITIALISATION FINALE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Mise à jour de la date
    const dateEl = document.getElementById('live-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

    // Lancements
    fetchMarketData();
    setInterval(updateTickerUI, 5000);
    fetchHybridNews('top');
    fetchVideosVerticaux();
    initAdSlider();
    
    // Vérifications de sécurité pour les fonctions optionnelles
    if(typeof loadAutoTrendingTags === 'function') loadAutoTrendingTags();
    if(typeof fetchLifestyleNews === 'function') fetchLifestyleNews();
    if(typeof fetchSportsResume === 'function') fetchSportsResume();

    tracker.log('view_home');
    // Fonction de compatibilité pour le menu
window.fetchAllContent = (cat, query) => fetchHybridNews(cat, query);
});
