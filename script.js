/* --- CONFIGURATION DYNAMIQUE & SUPABASE --- */
const BASE_URL = window.location.origin; 
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NEWAPI_PROXY = `${BASE_URL}/api/news`; 
const CACHE_DURATION = 60 * 60 * 1000; 

/* --- SYSTÈME ANALYTICS MAKMUS --- */
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
        } catch (e) { console.warn("Analytics non configuré"); }
    }
};

// Fonction globale pour capturer les clics sur les articles
async function captureAction(title, category, url) {
    await tracker.log('click_article', { title: title, category: category });
    window.location.href = url;
}

/* --- GESTION DU MENU --- */
const btnOpenMenu = document.getElementById('btnOpenMenu');
const btnCloseMenu = document.getElementById('closeMenu');
const fullMenu = document.getElementById('fullMenu');

if(btnOpenMenu) btnOpenMenu.onclick = () => { 
    fullMenu.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
};

if(btnCloseMenu) btnCloseMenu.onclick = () => closeMenuUI();

function closeMenuUI() {
    if(fullMenu) {
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

window.executeMenuSearch = function() {
    const query = document.getElementById('menuSearchInput').value;
    if(query) {
        fetchAllContent('top', query);
        closeMenuUI();
    }
}

/* --- GESTION DE LA DATE --- */
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const liveDate = document.getElementById('live-date');
    if(liveDate) liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
}

/* --- RÉCUPÉRATION DU CONTENU --- */
async function fetchAllContent(category = 'top', query = '') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const status = document.getElementById('status-line');
    const now = new Date().getTime();

    try {
        if(status) status.textContent = "CHARGEMENT...";

        // 1. Articles Principaux
        let sbQuery = supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('is_priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (category !== 'top') sbQuery = sbQuery.eq('category', category);
        if (query) sbQuery = sbQuery.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);

        const { data: myArticles } = await sbQuery;

        // 2. Opinion
        const { data: opinionArticles } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('category', 'Opinion')
            .eq('is_published', true)
            .limit(5)
            .order('created_at', { ascending: false });

        // 3. Lifestyle (API News)
        let lifestyleNews = [];
        const lifestyleCacheKey = `news_api_lifestyle`;
        const cachedLife = localStorage.getItem(lifestyleCacheKey);
        
        if (cachedLife && (now - localStorage.getItem(`${lifestyleCacheKey}_time`) < CACHE_DURATION)) {
            lifestyleNews = JSON.parse(cachedLife);
        } else {
            try {
                const res = await fetch(`${NEWAPI_PROXY}?category=lifestyle`);
                const newsData = await res.json();
                lifestyleNews = newsData.results || [];
                localStorage.setItem(lifestyleCacheKey, JSON.stringify(lifestyleNews));
                localStorage.setItem(`${lifestyleCacheKey}_time`, now.toString());
            } catch (e) { console.warn("Lifestyle API Off"); }
        }

        renderAll({ 
            myArticles: myArticles || [], 
            opinionArticles: opinionArticles || [], 
            lifestyleNews: lifestyleNews, 
            category 
        }, query);

    } catch (e) { 
        console.error("Erreur:", e);
        if(status) status.textContent = "ERREUR DE CONNEXION.";
    }
}

async function fetchMagazineSection() {
    const { data, error } = await supabaseClient
        .from('articles')
        .select('*')
        .in('category', ['Santé', 'Climat'])
        .eq('is_published', true)
        .limit(5)
        .order('created_at', { ascending: false });

    if (error || !data) return;

    const container = document.getElementById('lifestyle-env-grid');
    if (container) {
        container.innerHTML = data.map(art => `
            <div class="mag-card" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', '${art.category}', 'redaction.html?id=${art.id}')">
                <div class="mag-img-wrapper">
                    <img src="${art.image_url || 'https://via.placeholder.com/200'}" alt="${art.titre}">
                </div>
                <span class="mag-read-time">${art.category}</span>
                <h4>${art.titre}</h4>
            </div>
        `).join('');
    }
}

function renderAll(data, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const sidebar = document.getElementById('sidebar-list');
    const lifestyleBox = document.getElementById('lifestyle-list');
    const opinionBox = document.getElementById('opinion-list');
    const status = document.getElementById('status-line');
    
    if (data.myArticles.length === 0 && data.lifestyleNews.length === 0) {
        if(status) status.textContent = "AUCUNE INFO DISPONIBLE.";
        return;
    }

    if(hero && data.myArticles[0]) {
        const h = data.myArticles[0];
        hero.innerHTML = `
            <div class="hero-container" onclick="captureAction('${h.titre.replace(/'/g, "\\'")}', '${h.category}', 'redaction.html?id=${h.id}')">
                <div class="hero-text">
                    <h1>${h.titre}</h1>
                    <p>${(h.description || "").substring(0, 180)}...</p>
                </div>
                <div class="hero-img"><img src="${h.image_url}"></div>
            </div>`;
    }

    if(grid) {
        grid.innerHTML = data.myArticles.slice(1, 7).map(art => `
            <div class="article-card" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', '${art.category}', 'redaction.html?id=${art.id}')">
                <div class="card-img"><img src="${art.image_url}"></div>
                <div class="card-text"><h3>${art.titre}</h3></div>
            </div>`).join('');
    }

    if(sidebar) {
        sidebar.innerHTML = data.myArticles.slice(7, 12).map(art => `
            <div class="sidebar-article" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', '${art.category}', 'redaction.html?id=${art.id}')">
                <span class="meta">${art.category}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    if(lifestyleBox) {
        lifestyleBox.innerHTML = data.lifestyleNews.slice(0, 3).map(art => `
            <div class="lifestyle-item" onclick="window.open('${art.link}', '_blank')">
                <img src="${art.image_url || 'https://via.placeholder.com/80'}" class="lifestyle-img">
                <h4>${art.title}</h4>
            </div>`).join('');
    }

    if(opinionBox) {
        opinionBox.innerHTML = data.opinionArticles.map(art => `
            <div class="opinion-item" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', 'Opinion', 'redaction.html?id=${art.id}')">
                <span class="opinion-author">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    if(status) status.textContent = query ? `RÉSULTATS : ${query.toUpperCase()}` : `ÉDITION ACTUALISÉE`;
}

/* --- VIDÉOS VERTICALES --- */
const ICON_MUTE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
const ICON_VOL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;

async function fetchVideosVerticaux() {
    try {
        const { data, error } = await supabaseClient.from('videos_du_jour').select('*').eq('is_published', true).order('created_at', { ascending: false });
        if (error || !data) return;
        const slider = document.getElementById('video-slider');
        if(!slider) return;

        slider.innerHTML = data.map(vid => `
            <div class="video-card" style="position:relative;">
                <div class="mute-control" onclick="toggleMute(event, this)">
                    <span class="icon-vol-container">${ICON_MUTE}</span>
                </div>
                <video src="${vid.video_url}" poster="${vid.poster_url || ''}" loop muted playsinline onclick="handleVideoClick(this)" style="width:100%; height:100%; object-fit: cover;"></video>
                <div class="video-overlay" style="position:absolute; bottom:0; padding:20px; background:linear-gradient(transparent, rgba(0,0,0,0.8)); width:100%; pointer-events:none;">
                    <h4 style="color:white; margin:0;">${vid.titre}</h4>
                </div>
            </div>`).join('');
    } catch (e) { console.warn(e); }
}

function toggleMute(event, btn) {
    event.stopPropagation();
    const video = btn.parentNode.querySelector('video');
    const container = btn.querySelector('.icon-vol-container');
    video.muted = !video.muted;
    container.innerHTML = video.muted ? ICON_MUTE : ICON_VOL;
}

function handleVideoClick(video) {
    if (video.paused) {
        document.querySelectorAll('video').forEach(v => v.pause());
        video.play();
    } else {
        video.pause();
    }
}

/* --- TAGS & FILTRAGE --- */
async function loadAutoTrendingTags() {
    const { data } = await supabaseClient.from('articles').select('tags').not('tags', 'is', null).limit(15);
    if (!data) return;
    let allTags = [];
    data.forEach(item => { if(item.tags) allTags = [...allTags, ...item.tags.split(',').map(t => t.trim())]; });
    const uniqueTags = [...new Set(allTags)].slice(0, 8);
    const container = document.getElementById('tags-container');
    if (container) container.innerHTML = uniqueTags.map(tag => `<span class="tag-item" onclick="filterByTag('${tag.replace(/'/g, "\\'")}')">${tag}</span>`).join('');
}

async function filterByTag(tagName) {
    const { data } = await supabaseClient.from('articles').select('*').ilike('tags', `%${tagName}%`).order('created_at', { ascending: false });
    if (data) renderAll({ myArticles: data, opinionArticles: [], lifestyleNews: [], category: 'Filtrage' }, tagName);
}

/* --- PUBLICITÉS --- */
let activeAds = [];
let currentAdIndex = 0;

async function initAdSlider() {
    const { data } = await supabaseClient.from('publicites').select('*').eq('est_active', true);
    if (!data || data.length === 0) return;
    activeAds = data;
    showNextAd();
    setInterval(showNextAd, 15000);
}

function showNextAd() {
    const ad = activeAds[currentAdIndex];
    const displayZone = document.getElementById('ad-display-zone');
    if(!displayZone) return;

    const content = ad.type === 'video' 
        ? `<video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>`
        : `<img class="ad-media ad-fade" src="${ad.media_url}">`;
    
    displayZone.innerHTML = `<div style="cursor:pointer" onclick="trackAdClick('${ad.id}', '${ad.lien_clic}')">${content}</div>`;
    currentAdIndex = (currentAdIndex + 1) % activeAds.length;
}

async function trackAdClick(adId, url) {
    try {
        const { data } = await supabaseClient.from('publicites').select('nb_clics').eq('id', adId).single();
        await supabaseClient.from('publicites').update({ nb_clics: (data.nb_clics || 0) + 1 }).eq('id', adId);
    } catch (e) {}
    if(url) window.open(url, '_blank');
}

/* --- MARCHÉS (TICKER) --- */
const EXCHANGE_API_KEY = '4e4fee63bab6fce7ba7b39e8';
let marketData = [
    { label: "USD/CDF", value: "...", change: "LIVE", trend: "up" },
    { label: "BTC/USD", value: "64,250", change: "+1.2%", trend: "up" }
];

async function initMarketTicker() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await res.json();
        if (data.result === "success") {
            marketData[0].value = Math.round(data.conversion_rates.CDF).toLocaleString() + " FC";
        }
    } catch (e) {}
    
    let idx = 0;
    setInterval(() => {
        const ticker = document.getElementById('ticker-content');
        if(!ticker) return;
        const d = marketData[idx];
        ticker.innerHTML = `<div class="ticker-item fade-in-up"><span class="ticker-label">${d.label}</span> <span class="ticker-value">${d.value}</span></div>`;
        idx = (idx + 1) % marketData.length;
    }, 5000);
}

/* --- INITIALISATION --- */
window.onload = () => {
    updateDate();
    initMarketTicker();
    fetchAllContent('top');
    fetchMagazineSection(); 
    fetchVideosVerticaux();
    loadAutoTrendingTags();
    initAdSlider();
    tracker.log('view');
};
