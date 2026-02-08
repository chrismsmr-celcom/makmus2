
/* =========================================================
   1. CONFIGURATION & CLIENTS
========================================================= */

const BASE_URL = window.location.origin;
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio'; // ⚠️ clé complète ici
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NEWAPI_PROXY = `${BASE_URL}/api/news`;
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure


/* =========================================================
   2. SYSTÈME ANALYTICS
========================================================= */

const tracker = {
    getVisitorId() {
        let id = sessionStorage.getItem('makmus_visitor_id');
        if (!id) {
            id = 'v-' + Math.random().toString(36).substring(2, 11);
            sessionStorage.setItem('makmus_visitor_id', id);
        }
        return id;
    },

    async log(type, data = {}) {
        try {
            await supabaseClient.from('stats').insert([{
                event_type: type,
                article_title: data.title || 'Page Accueil',
                category: data.category || 'Général',
                path: window.location.pathname,
                visitor_id: this.getVisitorId(),
                created_at: new Date().toISOString()
            }]);
        } catch (e) {
            console.warn("Analytics error:", e);
        }
    }
};


/* =========================================================
   3. UI & NAVIGATION
========================================================= */

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const liveDate = document.getElementById('live-date');
    if (liveDate) {
        liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
    }
}

function closeMenuUI() {
    const fullMenu = document.getElementById('fullMenu');
    if (fullMenu) {
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

window.executeMenuSearch = function () {
    const input = document.getElementById('menuSearchInput');
    if (!input) return;
    const query = input.value.trim();
    if (query.length > 0) {
        fetchAllContent('top', query);
        closeMenuUI();
    }
};


/* =========================================================
   4. RÉCUPÉRATION DES DONNÉES
========================================================= */

async function fetchAllContent(category = 'top', query = '') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMenuUI();

    const status = document.getElementById('status-line');
    const now = Date.now();

    try {
        if (status) status.textContent = "CHARGEMENT...";

        let pMain = supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('is_priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (category !== 'top') {
            pMain = pMain.eq('category', category);
        }

        if (query) {
            pMain = pMain.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);
        }

        const pOpinion = supabaseClient
            .from('articles')
            .select('*')
            .eq('category', 'Opinion')
            .eq('is_published', true)
            .limit(5)
            .order('created_at', { ascending: false });

        const [mainRes, opinionRes] = await Promise.all([pMain, pOpinion]);

        /* -------- Lifestyle API + Cache -------- */

        let lifestyleNews = [];
        const cachedLife = localStorage.getItem('news_api_lifestyle');
        const cachedTime = localStorage.getItem('news_api_lifestyle_time');

        if (cachedLife && cachedTime && (now - Number(cachedTime) < CACHE_DURATION)) {
            lifestyleNews = JSON.parse(cachedLife);
        } else {
            try {
                const res = await fetch(`${NEWAPI_PROXY}?category=lifestyle`);
                const newsData = await res.json();
                lifestyleNews = newsData.results || [];
                localStorage.setItem('news_api_lifestyle', JSON.stringify(lifestyleNews));
                localStorage.setItem('news_api_lifestyle_time', now.toString());
            } catch (e) {
                console.warn("API Lifestyle indisponible");
            }
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


/* =========================================================
   5. RENDU UI
========================================================= */

function renderAll(data, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const sidebar = document.getElementById('sidebar-list');
    const lifestyleBox = document.getElementById('lifestyle-list');
    const opinionBox = document.getElementById('opinion-list');
    const status = document.getElementById('status-line');

    const articles = data.myArticles || [];

    /* --- 1. HERO (Article à la Une) --- */
    if (hero && articles[0]) {
        const h = articles[0];
        hero.innerHTML = `
            <div class="hero-container" onclick="location.href='redaction.html?id=${h.id}'">
                <div class="hero-text">
                    <span class="category-tag">${h.category || 'À LA UNE'}</span>
                    <h1>${h.titre || ''}</h1>
                    <p>${(h.description || "").substring(0, 180)}...</p>
                </div>
                <div class="hero-img">
                    <img src="${h.image_url || ''}" alt="Hero Image">
                </div>
            </div>`;
    }

    /* --- 2. GRID (Grille de 6 articles) --- */
    if (grid) {
        // Ajout du wrapper img-wrapper pour que le CSS puisse gérer l'overflow et le zoom
        grid.innerHTML = articles.slice(1, 7).map(art => `
            <div class="article-card" onclick="location.href='redaction.html?id=${art.id}'">
                <div class="img-wrapper">
                    <img src="${art.image_url || ''}" alt="Article Image">
                </div>
                <span class="category-tag">${art.category || ''}</span>
                <h3>${art.titre || ''}</h3>
            </div>`).join('');
    }

    /* --- 3. SIDEBAR (Dernières Nouvelles) --- */
    if (sidebar) {
        sidebar.innerHTML = articles.slice(7, 12).map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'">
                <span class="category-tag">${art.category || ''}</span>
                <h4>${art.titre || ''}</h4>
            </div>`).join('');
    }

    /* --- 4. LIFESTYLE (API News) --- */
    if (lifestyleBox) {
        lifestyleBox.innerHTML = (data.lifestyleNews || []).slice(0, 3).map(art => `
            <div class="sidebar-article" onclick="window.open('${art.link}', '_blank')">
                <div class="img-wrapper" style="height: 60px; margin-bottom: 5px;">
                    <img src="${art.image_url || 'https://via.placeholder.com/80'}" style="height: 100%; object-fit: cover;">
                </div>
                <h4 style="font-size: 13px;">${art.title || ''}</h4>
            </div>`).join('');
    }

    /* --- 5. OPINIONS --- */
    if (opinionBox) {
        opinionBox.innerHTML = (data.opinionArticles || []).map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'" style="border-left: 2px solid var(--makmus-red); padding-left: 10px;">
                <span class="opinion-author" style="font-weight: bold; font-size: 11px; display: block;">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4 style="font-style: italic;">${art.titre || ''}</h4>
            </div>`).join('');
    }

    /* --- 6. STATUS --- */
    if (status) {
        status.textContent = query 
            ? `RÉSULTATS POUR : ${query.toUpperCase()}`
            : `ÉDITION DU ${new Date().toLocaleDateString('fr-FR')}`;
    }
}


/* =========================================================
   6. SECTIONS SPÉCIALES
========================================================= */

async function fetchMagazineSection() {
    try {
        const { data } = await supabaseClient
            .from('articles')
            .select('*')
            .in('category', ['Santé', 'Climat'])
            .eq('is_published', true)
            .limit(5)
            .order('created_at', { ascending: false });

        const container = document.getElementById('lifestyle-env-grid');
        if (container && data) {
            container.innerHTML = data.map(art => `
                <div class="mag-card" onclick="location.href='redaction.html?id=${art.id}'">
                    <div class="mag-img-wrapper">
                        <img src="${art.image_url || ''}">
                    </div>
                    <span class="mag-read-time">${art.category || ''}</span>
                    <h4>${art.titre || ''}</h4>
                </div>`).join('');
        }
    } catch(e){
        console.warn("Magazine section error", e);
    }
}


/* =========================================================
   6B. FONCTIONS MANQUANTES (STUBS FONCTIONNELS)
========================================================= */

function fetchVideosVerticaux() {
    console.log("fetchVideosVerticaux initialisé");
}

function toggleMute(video) {
    if (video) video.muted = !video.muted;
}

function handleVideoClick(video) {
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
}

function initAdSlider() {
    console.log("Ad slider initialisé");
}

function trackAdClick(adId) {
    tracker.log('ad_click', { title: adId });
}

function loadAutoTrendingTags() {
    console.log("Trending tags chargés");
}


/* =========================================================
   7. TICKER BOURSIER
========================================================= */

let marketData = [
    { label: "USD/CDF", value: "...", change: "LIVE", trend: "up" },
    { label: "BTC/USD", value: "64,250", change: "+1.2%", trend: "up" }
];

async function initMarketTicker() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/4e4fee63bab6fce7ba7b39e8/latest/USD`);
        const data = await res.json();
        if (data.result === "success") {
            marketData[0].value = Math.round(data.conversion_rates.CDF).toLocaleString() + " FC";
        }
    } catch (e) {
        console.warn("Market API Error");
    }

    let idx = 0;
    setInterval(() => {
        const wrapper = document.getElementById('ticker-content');
        if (!wrapper) return;
        const d = marketData[idx];
        wrapper.innerHTML = `
            <div class="ticker-item fade-in-up">
                <span class="ticker-label">${d.label}</span>
                <span class="ticker-value">${d.value}</span>
            </div>`;
        idx = (idx + 1) % marketData.length;
    }, 5000);
}


/* =========================================================
   8. INITIALISATION FINALE
========================================================= */

window.onload = () => {
    updateDate();
    initMarketTicker();
    fetchAllContent('top');
    fetchMagazineSection();
    fetchVideosVerticaux();
    loadAutoTrendingTags();
    initAdSlider();
    tracker.log('view', { title: 'Visite Home' });
};
