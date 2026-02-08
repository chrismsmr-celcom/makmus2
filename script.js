<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    // --- CONFIGURATION DYNAMIQUE & SUPABASE ---
    const BASE_URL = window.location.origin; 
    const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const NEWAPI_PROXY = `${BASE_URL}/api/news`; 
    const CACHE_DURATION = 60 * 60 * 1000; 

    // --- SYSTÈME ANALYTICS MAKMUS ---
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
                console.log("Analytics sent:", type);
            } catch (e) { console.warn("Analytics non configuré"); }
        }
    };

    tracker.log('view', { title: 'Visite Page Accueil' });

    // --- GESTION DU MENU ---
    const btnOpenMenu = document.getElementById('btnOpenMenu');
    const btnCloseMenu = document.getElementById('closeMenu');
    const fullMenu = document.getElementById('fullMenu');
    
    if(btnOpenMenu) btnOpenMenu.onclick = () => { 
        fullMenu.classList.add('open'); 
        document.body.style.overflow = 'hidden'; 
    };
    
    if(btnCloseMenu) btnCloseMenu.onclick = () => closeMenuUI();

    window.executeMenuSearch = function() {
        const query = document.getElementById('menuSearchInput').value;
        if(query) {
            fetchAllContent('top', query);
            closeMenuUI();
        }
    }

    function closeMenuUI() {
        if(fullMenu) {
            fullMenu.classList.remove('open');
            document.body.style.overflow = 'auto';
        }
    }

    // --- GESTION DE LA DATE ---
    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const liveDate = document.getElementById('live-date');
        if(liveDate) liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
    }
    updateDate();

    // --- LOGIQUE DE RÉCUPÉRATION (TOP + OPINION SUPABASE + LIFESTYLE API) ---
async function fetchAllContent(category = 'top', query = '') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMenuUI();
    const status = document.getElementById('status-line');
    const now = new Date().getTime();

    try {
        if(status) status.textContent = "CHARGEMENT...";

        // 1. Articles Principaux (Supabase)
        let sbQuery = supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('is_priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (category !== 'top') sbQuery = sbQuery.eq('category', category);
        if (query) sbQuery = sbQuery.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);

        const { data: myArticles } = await sbQuery;

        // 2. RÉCUPÉRATION SPÉCIFIQUE : OPINION (Depuis Supabase)
        const { data: opinionArticles } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('category', 'Opinion') // Assure-toi que le nom de la catégorie est exact
            .eq('is_published', true)
            .limit(5)
            .order('created_at', { ascending: false });

        // 3. RÉCUPÉRATION SPÉCIFIQUE : LIFESTYLE (Depuis API)
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
        async function fetchMagazineSection() {
    const { data, error } = await supabaseClient
        .from('articles')
        .select('*')
        .in('category', ['Santé', 'Climat']) // On récupère les deux
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

        // On envoie tout à renderAll
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
function renderAll(data, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const sidebar = document.getElementById('sidebar-list');
    const lifestyleBox = document.getElementById('lifestyle-list');
    const opinionBox = document.getElementById('opinion-list');
    const status = document.getElementById('status-line');
    
    // Filtrage doublons sur le flux principal
    const uniqueArticles = data.myArticles; 

    if (uniqueArticles.length === 0 && data.lifestyleNews.length === 0) {
        if(status) status.textContent = "AUCUNE INFO DISPONIBLE.";
        return;
    }

    // --- 1. RENDU HERO & GRILLE (Flux Supabase Standard) ---
    if(hero && uniqueArticles[0]) {
        const h = uniqueArticles[0];
        const hLink = `redaction.html?id=${h.id}`;
        hero.innerHTML = `
            <div class="hero-container">
                <div class="hero-text">
                    <h1 onclick="captureAction('${h.titre.replace(/'/g, "\\'")}', '${h.category}', '${hLink}')">${h.titre}</h1>
                    <p>${(h.description || "").substring(0, 180)}...</p>
                </div>
                <div class="hero-img"><img src="${h.image_url}"></div>
            </div>`;
    }

    if(grid) {
        grid.innerHTML = uniqueArticles.slice(1, 7).map(art => `
            <div class="article-card" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', '${art.category}', 'redaction.html?id=${art.id}')">
                <div class="card-img"><img src="${art.image_url}"></div>
                <div class="card-text"><h3>${art.titre}</h3></div>
            </div>`).join('');
    }

    // --- 2. RENDU SIDEBAR (Flux Supabase Standard suite) ---
    if(sidebar) {
        sidebar.innerHTML = uniqueArticles.slice(7, 12).map(art => `
            <div class="sidebar-article" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', '${art.category}', 'redaction.html?id=${art.id}')">
                <span class="category-tag">${art.category}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    // --- 3. RENDU LIFESTYLE (Flux API News) ---
    if(lifestyleBox) {
        lifestyleBox.innerHTML = data.lifestyleNews.slice(0, 3).map(art => `
            <div class="lifestyle-item" onclick="window.open('${art.link}', '_blank')">
                <img src="${art.image_url || 'https://via.placeholder.com/80'}" class="lifestyle-img">
                <h4>${art.title}</h4>
            </div>`).join('');
    }

    // --- 4. RENDU OPINION (Flux Supabase Catégorie Opinion) ---
    if(opinionBox) {
        opinionBox.innerHTML = data.opinionArticles.map(art => `
            <div class="opinion-item" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', 'Opinion', 'redaction.html?id=${art.id}')">
                <span class="opinion-author">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }

    if(status) status.textContent = query ? `RÉSULTATS : ${query.toUpperCase()}` : `ÉDITION ACTUALISÉE`;
}
// 1. DÉFINITION DES ICÔNES (SVG minimalistes)
const ICON_MUTE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
const ICON_VOL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>`;

// 2. FONCTION PRINCIPALE DE CHARGEMENT
async function fetchVideosVerticaux() {
    try {
        const { data, error } = await supabaseClient
            .from('videos_du_jour')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            const section = document.getElementById('video-section');
            if(section) section.style.display = 'none';
            return;
        }

        const slider = document.getElementById('video-slider');
        if(!slider) return;

        // Injection du HTML avec le bouton Mute SVG
        slider.innerHTML = data.map(vid => `
            <div class="video-card" style="position:relative;">
                <div class="mute-control" onclick="toggleMute(event, this)">
                    <span class="icon-vol-container">${ICON_MUTE}</span>
                </div>
                <video 
                    src="${vid.video_url}" 
                    poster="${vid.poster_url || ''}"
                    loop muted playsinline
                    style="width:100%; height:100%; object-fit: cover; cursor: pointer;"
                    onclick="handleVideoClick(this)">
                </video>
                <div class="video-overlay" style="position:absolute; bottom:0; left:0; right:0; padding:20px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); pointer-events:none;">
                    <h4 style="color:white; margin:0; font-family:Arial; font-size:0.9rem;">${vid.titre}</h4>
                </div>
            </div>
        `).join('');

        // Tracker d'analytics
        document.querySelectorAll('.video-card video').forEach(v => {
            v.onplay = () => {
                const title = v.closest('.video-card').querySelector('h4').innerText;
                tracker.log('video_portrait_play', { title: title });
            };
        });

    } catch (e) {
        console.warn("Erreur chargement vidéos:", e);
    }
}

// 3. GESTION DU SON (Toggle Mute)
function toggleMute(event, btn) {
    event.stopPropagation(); // Empêche de déclencher le pause/play de la vidéo
    const video = btn.parentNode.querySelector('video');
    const container = btn.querySelector('.icon-vol-container');

    if (video.muted) {
        video.muted = false;
        container.innerHTML = ICON_VOL;
    } else {
        video.muted = true;
        container.innerHTML = ICON_MUTE;
    }
}

// 4. GESTION PLAY / PAUSE (Intelligente)
function handleVideoClick(video) {
    const btn = video.parentNode.querySelector('.mute-control');
    const container = btn.querySelector('.icon-vol-container');

    if (video.paused) {
        // Arrête les autres vidéos pour éviter le mélange des sons
        document.querySelectorAll('.video-card video').forEach(v => { if(v !== video) v.pause(); });
        
        // Au premier clic de lecture, on active souvent le son par défaut
        video.muted = false;
        container.innerHTML = ICON_VOL;
        
        video.play();
    } else {
        video.pause();
    }
}
// --- FONCTION 1 : CHARGER LES TAGS AUTOMATIQUEMENT ---
// --- FONCTION 1 : CHARGER LES TAGS AUTOMATIQUEMENT ---
async function loadAutoTrendingTags() {
    try {
        const { data, error } = await supabaseClient
            .from('articles')
            .select('tags')
            .not('tags', 'is', null)
            .order('created_at', { ascending: false })
            .limit(15);

        if (error || !data) return;

        let allTags = [];
        data.forEach(item => {
            if(item.tags) {
                const splitTags = item.tags.split(',').map(t => t.trim());
                allTags = [...allTags, ...splitTags];
            }
        });

        const uniqueTags = [...new Set(allTags)].filter(t => t.length > 1).slice(0, 8);
        const container = document.getElementById('tags-container');
        if (!container) return;

        container.innerHTML = uniqueTags.map(tag => `
            <span class="tag-item" onclick="filterByTag('${tag.replace(/'/g, "\\'")}')">${tag}</span>
        `).join('');

    } catch (e) {
        console.warn("Erreur chargement tags:", e);
    }
}

// --- FONCTION 2 : FILTRER PAR TAG (CORRIGÉE) ---
async function filterByTag(tagName) {
    console.log("Recherche des articles pour : " + tagName);
    const status = document.getElementById('status-line');
    if(status) status.textContent = "FILTRAGE...";

    const { data, error } = await supabaseClient
        .from('articles')
        .select('*')
        .ilike('tags', `%${tagName}%`) 
        .order('created_at', { ascending: false });

    if (!error && data) {
        // ICI : On utilise renderAll (ta fonction existante)
        // On simule l'objet data attendu par renderAll
        renderAll({ 
            myArticles: data, 
            worldNews: [], 
            category: 'Filtrage' 
        }, tagName);
        
        // Scroll vers la grille de news
        const grid = document.getElementById('news-grid');
        if(grid) grid.scrollIntoView({ behavior: 'smooth' });
    }
}
let currentAdIndex = 0;
let activeAds = [];

async function initAdSlider() {
    const { data, error } = await supabaseClient
        .from('publicites') // Assure-toi d'avoir créé cette table
        .select('*')
        .eq('est_active', true);

    if (error || !data || data.length === 0) {
        console.log("Aucune publicité active.");
        return;
    }

    activeAds = data;
    showNextAd();
    
    // Rotation toutes les 15 secondes
    setInterval(showNextAd, 15000);
}

function showNextAd() {
    if (activeAds.length === 0) return;
    
    const ad = activeAds[currentAdIndex];
    const displayZone = document.getElementById('ad-display-zone');
    
    // On enlève le <a> simple et on utilise trackAdClick
    const action = `onclick="trackAdClick('${ad.id}', '${ad.lien_clic}')"`;
    
    let htmlContent = '';
    if (ad.type === 'video') {
        htmlContent = `
            <div style="cursor:pointer" ${action}>
                <video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>
            </div>`;
    } else {
        htmlContent = `
            <div style="cursor:pointer" ${action}>
                <img class="ad-media ad-fade" src="${ad.media_url}" alt="Publicité">
            </div>`;
    }

    displayZone.innerHTML = htmlContent;
    currentAdIndex = (currentAdIndex + 1) % activeAds.length;
}

// AJOUTE CETTE FONCTION JUSTE EN DESSOUS
async function trackAdClick(adId, redirectUrl) {
    try {
        const { data: currentAd } = await supabaseClient
            .from('publicites')
            .select('nb_clics')
            .eq('id', adId)
            .single();

        await supabaseClient
            .from('publicites')
            .update({ nb_clics: (currentAd.nb_clics || 0) + 1 })
            .eq('id', adId);
            
        console.log("Clic enregistré pour:", adId);
    } catch (e) {
        console.warn("Erreur tracking clic:", e);
    }
    
    if(redirectUrl) window.open(redirectUrl, '_blank');
}
// --- CONFIGURATION MARCHÉS ---
const EXCHANGE_API_KEY = '4e4fee63bab6fce7ba7b39e8';
let marketData = [
    { label: "USD/CDF", value: "Chargement...", change: "LIVE", trend: "up" },
    { label: "BTC/USD", value: "64,250", change: "+1.2%", trend: "up" },
    { label: "OR (oz)", value: "2,150", change: "-0.5%", trend: "down" }
];

// 1. Récupération des données avec Cache
async function fetchMarketData() {
    const cacheKey = 'makmus_market_cache';
    const cacheTimeKey = 'makmus_market_time';
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    // Si on a des données de moins d'une heure, on les utilise
    if (cachedData && cachedTime && (now - cachedTime < oneHour)) {
        marketData = JSON.parse(cachedData);
        return;
    }

    try {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await response.json();
        
        if (data.result === "success") {
            const cdfRate = data.conversion_rates.CDF;
            // Mise à jour du Franc Congolais
            marketData[0].value = Math.round(cdfRate).toLocaleString() + " FC";
            
            // Sauvegarde
            localStorage.setItem(cacheKey, JSON.stringify(marketData));
            localStorage.setItem(cacheTimeKey, now.toString());
        }
    } catch (e) {
        console.warn("Erreur API Marchés");
    }
}

// 2. Animation du Ticker (Affichage successif)
let currentTickerIndex = 0;
function updateTickerUI() {
    const wrapper = document.getElementById('ticker-content');
    if (!wrapper) return;

    const data = marketData[currentTickerIndex];
    
    wrapper.innerHTML = `
        <div class="ticker-item fade-in-up">
            <span class="ticker-label">${data.label}</span> 
            <span class="ticker-value">${data.value}</span>
            <span class="ticker-change ${data.trend}">${data.change}</span>
        </div>
    `;

    currentTickerIndex = (currentTickerIndex + 1) % marketData.length;
}

// 3. Initialisation (À appeler dans ton window.onload)
async function initMarketTicker() {
    await fetchMarketData();
    updateTickerUI();
    setInterval(updateTickerUI, 5000); // Change toutes les 5 secondes
}
// --- 3. INITIALISATION UNIQUE ---
window.onload = async () => {
    updateDate();
    initMarketTicker(); // <--- AJOUTE CETTE LIGNE
    fetchAllContent('top');
    fetchMagazineSection(); 
    fetchVideosVerticaux();
    loadAutoTrendingTags();
    initAdSlider();
};
