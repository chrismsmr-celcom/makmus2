/* =========================================================
   1. CONFIGURATION & CLIENTS
========================================================= */
const BASE_URL = window.location.origin;
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio'; 
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
        } catch (e) { console.warn("Analytics error:", e); }
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

        let pMain = supabaseClient.from('articles').select('*').eq('is_published', true)
            .order('is_priority', { ascending: false }).order('created_at', { ascending: false });

        if (category !== 'top') pMain = pMain.eq('category', category);
        if (query) pMain = pMain.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);

        const pOpinion = supabaseClient.from('articles').select('*')
            .eq('category', 'Opinion').eq('is_published', true).limit(5).order('created_at', { ascending: false });

        const [mainRes, opinionRes] = await Promise.all([pMain, pOpinion]);

        // Lifestyle News API Logic
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
            } catch (e) { console.warn("API Lifestyle indisponible"); }
        }

        renderAll({
            myArticles: mainRes.data || [],
            opinionArticles: opinionRes.data || [],
            lifestyleNews: lifestyleNews,
            category
        }, query);

    } catch (e) {
        if (status) status.textContent = "ERREUR DE CONNEXION.";
    }
}

/* =========================================================
   5. RENDU UI (ARTICLES & SIDEBAR)
========================================================= */
function renderAll(data, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const sidebar = document.getElementById('sidebar-list');
    const lifestyleBox = document.getElementById('lifestyle-list');
    const opinionBox = document.getElementById('opinion-list');
    const status = document.getElementById('status-line');

    const articles = data.myArticles || [];

    // Hero
    if (hero && articles[0]) {
        const h = articles[0];
        hero.innerHTML = `
            <div class="hero-container" onclick="location.href='redaction.html?id=${h.id}'">
                <div class="hero-text">
                    <span class="category-tag">${h.category || 'À LA UNE'}</span>
                    <h1>${h.titre || ''}</h1>
                    <p>${(h.description || "").substring(0, 180)}...</p>
                </div>
                <div class="hero-img"><img src="${h.image_url || ''}"></div>
            </div>`;
    }

    // Grid (1 to 7)
    if (grid) {
        grid.innerHTML = articles.slice(1, 7).map(art => `
            <div class="article-card" onclick="location.href='redaction.html?id=${art.id}'">
                <div class="img-wrapper"><img src="${art.image_url || ''}"></div>
                <span class="category-tag">${art.category || ''}</span>
                <h3>${art.titre || ''}</h3>
            </div>`).join('');
    }

    // Sidebar
    if (sidebar) {
        sidebar.innerHTML = articles.slice(7, 12).map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'">
                <span class="category-tag">${art.category || ''}</span>
                <h4>${art.titre || ''}</h4>
            </div>`).join('');
    }

    // Lifestyle (NewsAPI)
    if (lifestyleBox) {
        lifestyleBox.innerHTML = (data.lifestyleNews || []).slice(0, 3).map(art => `
            <div class="sidebar-article" onclick="window.open('${art.link}', '_blank')" style="cursor:pointer; display:flex; gap:10px; margin-bottom:10px;">
                <img src="${art.image_url || 'https://via.placeholder.com/80'}" style="width:60px; height:60px; object-fit:cover;">
                <h4 style="font-size:13px;">${art.title || ''}</h4>
            </div>`).join('');
    }

    // Opinions
    if (opinionBox) {
        opinionBox.innerHTML = (data.opinionArticles || []).map(art => `
            <div class="sidebar-article" onclick="location.href='redaction.html?id=${art.id}'" style="border-left:2px solid var(--makmus-red); padding-left:10px;">
                <span style="font-size:11px; font-weight:bold;">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4 style="font-style:italic;">${art.titre || ''}</h4>
            </div>`).join('');
    }

    if (status) status.textContent = query ? `RÉSULTATS : ${query.toUpperCase()}` : `ÉDITION ACTUALISÉE`;
}

/* =========================================================
   6. VIDÉOS & PUBLICITÉS (LOGIQUE COMPLÈTE)
========================================================= */
async function fetchVideosVerticaux() {
    const container = document.getElementById('video-slider');
    if (!container) return;
    try {
        const { data } = await supabaseClient.from('videos').select('*').limit(6);
        if (data) {
            container.innerHTML = data.map(vid => `
                <div class="video-card" onclick="handleVideoClick(this.querySelector('video'))">
                    <video src="${vid.video_url}" loop muted playsinline></video>
                    <div class="play-icon">▶</div>
                    <div class="video-overlay"><h4>${vid.titre}</h4></div>
                </div>`).join('');
        }
    } catch (e) { console.warn("Videos error"); }
}

function handleVideoClick(video) {
    if (!video) return;
    if (video.paused) {
        // Optionnel : arrêter les autres vidéos
        document.querySelectorAll('video').forEach(v => v.pause());
        video.play();
    } else {
        video.pause();
    }
}

function initAdSlider() {
    const ads = ["PUBLICITÉ : ABONNEZ-VOUS À MAKMUS PREMIUM", "ANNONCE : DÉCOUVREZ NOS ARCHIVES 2025", "MAKMUS MEDIA : L'INFO EN TEMPS RÉEL"];
    const adZone = document.getElementById('ad-display-zone');
    if (!adZone) return;
    let i = 0;
    setInterval(() => {
        adZone.style.opacity = 0;
        setTimeout(() => {
            adZone.textContent = ads[i];
            adZone.style.opacity = 1;
            i = (i + 1) % ads.length;
        }, 500);
    }, 6000);
}

function loadAutoTrendingTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;
    const tags = ['Goma', 'Kinshasa', 'Économie', 'Politique', 'Santé'];
    container.innerHTML = tags.map(tag => `
        <a href="#" onclick="fetchAllContent('top', '${tag}'); return false;">#${tag}</a>
    `).join('');
}

/* =========================================================
   7. TICKER BOURSIER
========================================================= */
let marketData = [
    { label: "USD/CDF", value: "...", trend: "up" },
    { label: "BTC/USD", value: "96,250$", trend: "up" }
];

async function initMarketTicker() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/4e4fee63bab6fce7ba7b39e8/latest/USD`);
        const data = await res.json();
        if (data.result === "success") {
            marketData[0].value = Math.round(data.conversion_rates.CDF).toLocaleString() + " FC";
        }
    } catch (e) { console.warn("Market API Error"); }

    const wrapper = document.getElementById('ticker-content');
    if (!wrapper) return;
    let idx = 0;
    setInterval(() => {
        const d = marketData[idx];
        wrapper.innerHTML = `<span>${d.label} : ${d.value}</span>`;
        idx = (idx + 1) % marketData.length;
    }, 5000);
}
/* =========================================================
   9. GESTION DU COMPTE CLIENT (AUTH)
========================================================= */

// Inscription d'un nouveau lecteur
async function handleSignUp(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { full_name: fullName }
        }
    });

    if (error) {
        alert("Erreur d'inscription : " + error.message);
    } else {
        alert("Inscription réussie ! Vérifiez votre email pour confirmer.");
        closeAccountModal();
    }
}

// Connexion d'un lecteur
async function handleSignIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Erreur de connexion : " + error.message);
    } else {
        updateAuthUI(data.user);
        closeAccountModal();
        tracker.log('login', { title: 'Connexion utilisateur' });
    }
}

// Déconnexion
async function handleSignOut() {
    await supabaseClient.auth.signOut();
    window.location.reload(); // Recharge pour réinitialiser l'UI
}

// Mise à jour de l'interface selon l'état de connexion
function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-status-btn'); // Ton bouton "S'abonner" ou "Compte"
    if (!user) return;

    if (authBtn) {
        authBtn.innerHTML = `MON COMPTE (${user.user_metadata.full_name || 'Lecteur'})`;
        authBtn.onclick = () => { window.location.href = 'profile.html'; };
        authBtn.classList.add('logged-in');
    }
}

// Vérifier si l'utilisateur est déjà connecté au chargement
async function checkUserSession() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        updateAuthUI(user);
    }
}

function closeAccountModal() {
    const modal = document.getElementById('modalAccount');
    if (modal) modal.style.display = "none";
}
function toggleAuthMode() {
    const login = document.getElementById('login-form');
    const signup = document.getElementById('signup-form');
    if (login.style.display === "none") {
        login.style.display = "block";
        signup.style.display = "none";
    } else {
        login.style.display = "none";
        signup.style.display = "block";
    }
}
/* =========================================================
    8. INITIALISATION FINALE
========================================================= */
window.onload = async () => {
    // 1. Authentification : Vérifier si un utilisateur est déjà loggé
    if (typeof checkUserSession === "function") {
        await checkUserSession();
    }

    // 2. Interface & Horloge
    updateDate();
    
    // 3. Données Boursières & Tags
    initMarketTicker();
    loadAutoTrendingTags();

    // 4. Chargement des contenus (Articles & Vidéos)
    fetchAllContent('top');
    fetchVideosVerticaux();

    // 5. Marketing & Analytics
    initAdSlider();
    tracker.log('view', { title: 'Visite Home' });
    
    // 6. Gestion des événements globaux (Modaux)
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modalAccount');
        if (modal && event.target === modal) {
            closeAccountModal(); // Utilise la fonction de fermeture pour plus de propreté
        }
    });

    console.log("⚡ MAKMUS Engine : Initialisation terminée avec succès.");
};
