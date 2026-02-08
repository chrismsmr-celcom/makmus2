/* ============================================================
    MAKMUS ENGINE - CONFIGURATION & INITIALISATION
   ============================================================ */

const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        } catch (e) { console.warn("Analytics Off"); }
    }
};

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const liveDate = document.getElementById('live-date');
    if(liveDate) liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
}

/* ============================================================
    LOGIQUE HYBRIDE (SUPABASE + API)
   ============================================================ */

async function fetchAllContent(category = 'top', query = '') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const status = document.getElementById('status-line');
    if(status) status.textContent = "CHARGEMENT...";

    try {
        // 1. Récupération Supabase (Prioritaire)
        let sbQuery = supabaseClient.from('articles').select('*').eq('is_published', true).order('is_priority', { ascending: false }).order('created_at', { ascending: false });
        if (category !== 'top') sbQuery = sbQuery.eq('category', category);
        const { data: sbArticles } = await sbQuery;

        // 2. Récupération API Externe (Remplissage)
        // Utilisation d'un flux d'actualité gratuit pour l'exemple (NewsAPI ou similaire)
        let apiArticles = [];
        try {
            const newsRes = await fetch(`https://newsapi.org/v2/top-headlines?country=fr&category=general&apiKey=VOTRE_CLE_ICI`);
            const newsData = await newsRes.json();
            apiArticles = newsData.articles || [];
        } catch(apiErr) { console.warn("API indisponible, mode Supabase pur."); }

        // 3. Récupération Opinions (Sidebar)
        const { data: opinions } = await supabaseClient.from('articles').select('*').eq('category', 'Opinion').limit(5);

        // Appel du rendu unique
        renderMainLayout(sbArticles || [], apiArticles, opinions || [], query);

        if(status) status.textContent = query ? `RÉSULTATS : ${query.toUpperCase()}` : `ÉDITION MAKMUS ACTUALISÉE`;

    } catch (e) {
        console.error("Erreur News:", e);
        if(status) status.textContent = "ERREUR DE RÉSEAU.";
    }
}

function renderMainLayout(supabaseArticles, apiArticles, opinions, query) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');
    const opinionBox = document.getElementById('opinion-list');

    // --- Rendu Hero (Priorité Supabase) ---
    if (hero) {
        const topArt = supabaseArticles.length > 0 ? supabaseArticles[0] : apiArticles[0];
        if (topArt) {
            hero.innerHTML = `
                <div class="top-story" onclick="captureAction('${(topArt.titre || topArt.title).replace(/'/g, "\\'")}', 'Headline', 'redaction.html?id=${topArt.id || '#'}')">
                    <img src="${topArt.image_url || topArt.urlToImage || ''}" style="width:100%">
                    <p class="category-tag">${topArt.category || 'À LA UNE'}</p>
                    <h2>${topArt.titre || topArt.title}</h2>
                    <p>${(topArt.description || "").substring(0, 150)}...</p>
                    ${topArt.id ? '<span class="source-tag">EXCLUSIF MAKMUS</span>' : ''}
                </div>`;
        }
    }

    // --- Rendu Grille (Mélange Hybride) ---
    if (grid) {
        const remainingSB = supabaseArticles.slice(1);
        const fillerAPI = apiArticles.slice(0, 6 - remainingSB.length);
        const combined = [...remainingSB, ...fillerAPI];

        grid.innerHTML = combined.map(art => `
            <div class="grid-item" onclick="captureAction('${(art.titre || art.title).replace(/'/g, "\\'")}', '${art.category || 'News'}', 'redaction.html?id=${art.id || '#'}')">
                <div class="item-content">
                    <p class="category-tag">${art.category || 'MONDE'}</p>
                    <h3>${art.titre || art.title}</h3>
                </div>
                ${(art.image_url || art.urlToImage) ? `<img src="${art.image_url || art.urlToImage}" class="mini-thumb">` : ''}
            </div>`).join('');
    }

    // --- Rendu Opinions ---
    if(opinionBox && opinions) {
        opinionBox.innerHTML = opinions.map(art => `
            <div class="opinion-item" onclick="captureAction('${art.titre.replace(/'/g, "\\'")}', 'Opinion', 'redaction.html?id=${art.id}')">
                <span class="opinion-author">🖋️ ${art.auteur || 'MAKMUS'}</span>
                <h4>${art.titre}</h4>
            </div>`).join('');
    }
}

/* ============================================================
    FONCTIONNALITÉS ACCESSOIRES (VIDÉOS, TICKER, ETC.)
   ============================================================ */

window.captureAction = async function(title, category, url) {
    await tracker.log('article_click', { title, category });
    window.location.href = url;
};

// --- ICONES SVG ---
const ICON_MUTE = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="white" stroke-width="2" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
const ICON_VOL = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="white" stroke-width="2" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const ICON_EXPAND = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="white" stroke-width="2" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>`;

async function fetchVideosVerticaux() {
    const slider = document.getElementById('video-slider');
    if (!slider) return;

    try {
        const { data: videos } = await supabaseClient
            .from('videos_du_jour')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (videos) {
            slider.innerHTML = videos.map(vid => `
                <div class="video-card">
                    <div class="video-controls-top">
                        <button class="vid-btn" onclick="event.stopPropagation(); toggleMuteInCard(this)" title="Volume">
                            <span class="icon-placeholder">${ICON_MUTE}</span>
                        </button>
                        <button class="vid-btn" onclick="event.stopPropagation(); expandVideo(this)" title="Agrandir">
                            ${ICON_EXPAND}
                        </button>
                    </div>
                    <video 
                        src="${vid.video_url}" 
                        loop 
                        muted 
                        playsinline 
                        onclick="togglePlayVideo(this)">
                    </video>
                    <div class="video-overlay">
                        <h4>${vid.titre}</h4>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.warn("Erreur vidéos:", e); }
}

// Fonction pour agrandir (Fullscreen)
function expandVideo(btn) {
    const video = btn.closest('.video-card').querySelector('video');
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) { /* Safari */
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) { /* IE11 */
        video.msRequestFullscreen();
    }
}

// Fonction Volume avec changement d'icône
function toggleMuteInCard(btn) {
    const video = btn.closest('.video-card').querySelector('video');
    const iconContainer = btn.querySelector('.icon-placeholder');
    video.muted = !video.muted;
    iconContainer.innerHTML = video.muted ? ICON_MUTE : ICON_VOL;
}

function togglePlayVideo(v) {
    v.paused ? v.play() : v.pause();
}


async function initMarketTicker() {
    let marketData = [{label: "USD/CDF", value: "2850 FC"}, {label: "CUIVRE", value: "$8,420"}, {label: "COBALT", value: "$28,500"}];
    let idx = 0;
    setInterval(() => {
        const ticker = document.getElementById('ticker-content');
        if(ticker) {
            const d = marketData[idx];
            ticker.innerHTML = `<span style="color:#A81717; font-weight:bold;">● ${d.label}: ${d.value}</span>`;
            idx = (idx + 1) % marketData.length;
        }
    }, 4000);
}
/* ============================================================
    INTERACTIONS UI (MENU & RECHERCHE)
   ============================================================ */
/* ============================================================
    GESTION DU MENU PLEIN ÉCRAN & RECHERCHE
   ============================================================ */

const fullMenu = document.getElementById('fullMenu');
const btnOpenMenu = document.getElementById('btnOpenMenu');
const btnCloseMenu = document.getElementById('closeMenu');
const searchInput = document.getElementById('menuSearchInput');
const searchContainer = document.querySelector('.menu-search');

// 1. Ouverture du menu
if (btnOpenMenu) {
    btnOpenMenu.addEventListener('click', () => {
        fullMenu.classList.add('open');
        document.body.style.overflow = 'hidden'; // Bloque le scroll
        // Focus automatique sur la recherche pour l'expérience utilisateur
        setTimeout(() => searchInput.focus(), 300); 
    });
}

// 2. Fermeture du menu
if (btnCloseMenu) {
    btnCloseMenu.addEventListener('click', () => {
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto'; // Libère le scroll
    });
}

// 3. Fermeture automatique lors du clic sur un lien
document.querySelectorAll('.menu-section a').forEach(link => {
    link.addEventListener('click', () => {
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
    });
});

// 4. Logique de recherche
window.executeMenuSearch = async function() {
    const searchInput = document.getElementById('menuSearchInput');
    const status = document.getElementById('status-line');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    
    if (query !== "") {
        // 1. UI : Fermer le menu et afficher le chargement
        fullMenu.classList.remove('open');
        document.body.style.overflow = 'auto';
        if(status) status.textContent = `RECHERCHE DE "${query.toUpperCase()}"...`;

        try {
            // 2. Lancement des deux requêtes en parallèle (Gain de vitesse)
            const [sbResults, apiResults] = await Promise.all([
                searchInSupabase(query),
                searchInExternalAPI(query)
            ]);

            // 3. Envoyer au moteur de rendu hybride
            // On passe 'null' pour les opinions car on veut se concentrer sur les résultats
            renderMainLayout(sbResults, apiResults, [], query);

            if(status) status.textContent = `RÉSULTATS POUR : ${query.toUpperCase()}`;
            
            // Log analytics
            tracker.log('search', { title: query, category: 'Recherche globale' });

        } catch (error) {
            console.error("Erreur recherche:", error);
            if(status) status.textContent = "ERREUR LORS DE LA RECHERCHE.";
        }
    }
};

// --- Sous-fonction : Recherche dans ta base MAKMUS ---
async function searchInSupabase(query) {
    const { data, error } = await supabaseClient
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .or(`titre.ilike.%${query}%,description.ilike.%${query}%,tags.ilike.%${query}%`)
        .order('created_at', { ascending: false });
    
    return error ? [] : data;
}

// --- Sous-fonction : Recherche dans l'API Mondiale ---
async function searchInExternalAPI(query) {
    try {
        // Remplace par ton URL d'API (NewsAPI, GNews, etc.)
        const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=fr&sortBy=publishedAt&apiKey=TON_API_KEY`);
        const data = await response.json();
        return data.articles || [];
    } catch (e) {
        return [];
    }
}
/* ============================================================
    GESTION DES TAGS TENDANCES (TRENDING TAGS)
   ============================================================ */

async function loadTrendingTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    try {
        // On récupère la colonne 'tags' des 20 derniers articles
        const { data: articles, error } = await supabaseClient
            .from('articles')
            .select('tags')
            .eq('is_published', true)
            .not('tags', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        let allTags = [];

        articles.forEach(art => {
            if (art.tags) {
                // Si tes tags sont une chaîne (ex: "Mines, Économie, Cobalt")
                if (typeof art.tags === 'string') {
                    const splitTags = art.tags.split(',').map(t => t.trim());
                    allTags.push(...splitTags);
                } 
                // Si tes tags sont déjà un tableau (Array)
                else if (Array.isArray(art.tags)) {
                    allTags.push(...art.tags);
                }
            }
        });

        // Nettoyage : suppression des doublons et formatage
        const uniqueTags = [...new Set(allTags)]
            .filter(t => t.length > 0)
            .slice(0, 8); // On limite à 8 pour garder le centrage propre

        if (uniqueTags.length > 0) {
            container.innerHTML = uniqueTags.map(tag => `
                <a class="tag-item" onclick="fetchAllContent('top', '${tag}')">
                    ${tag}
                </a>
            `).join('');
        }

    } catch (e) {
        console.warn("Erreur tags Supabase:", e);
    }
}
let adsData = { top: [], footer: [] };
let currentIndices = { top: 0, footer: 0 };

async function initAdEngine() {
    console.log("Démarrage de l'Ad Engine...");
    try {
        const { data, error } = await supabaseClient
            .from('publicites')
            .select('*')
            .eq('est_active', true);

        if (error) {
            console.error("Erreur Supabase Pubs:", error);
            return;
        }

        if (!data || data.length === 0) {
            console.warn("Aucune publicité trouvée dans la table.");
            return;
        }

        // Tri des publicités par position
        adsData.top = data.filter(ad => ad.position === 'top');
        adsData.footer = data.filter(ad => ad.position === 'footer');

        console.log(`Pubs chargées - Top: ${adsData.top.length}, Footer: ${adsData.footer.length}`);

        // Affichage immédiat
        if (adsData.top.length > 0) updateAdZone('top');
        if (adsData.footer.length > 0) updateAdZone('footer');

        // Lancement des rotations
        setInterval(() => updateAdZone('top'), 15000);
        setInterval(() => updateAdZone('footer'), 15000);

    } catch (e) {
        console.error("Erreur critique Ad Engine:", e);
    }
}

function updateAdZone(position) {
    const ads = adsData[position];
    const containerId = position === 'top' ? 'pub-top-content' : 'pub-footer-content';
    const displayZone = document.getElementById(containerId);
    
    if (!displayZone) return;

    // Si aucune publicité n'est disponible après le chargement
    if (!ads || ads.length === 0) {
        displayZone.innerHTML = "<span>Espace Pub</span>";
        displayZone.classList.add('pub-placeholder');
        return;
    }

    const ad = ads[currentIndices[position]];
    const mediaTag = ad.type === 'video' 
        ? `<video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>`
        : `<img class="ad-media ad-fade" src="${ad.media_url}" alt="Publicité">`;

    // Remplacement du spinner par le contenu publicitaire
    displayZone.classList.remove('pub-placeholder');
    displayZone.innerHTML = `
        <div style="cursor:pointer; width:100%; height:100%;" onclick="trackAdClick('${ad.id}', '${ad.lien_clic}')">
            ${mediaTag}
        </div>`;
    
    currentIndices[position] = (currentIndices[position] + 1) % ads.length;
}
async function fetchSportResume() {
    const container = document.getElementById('sport-container');
    if (!container) return;

    try {
        // 1. On cherche dans Supabase les articles marqués 'Sport'
        const { data: sbSport, error } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('category', 'Sport')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(3);

        // 2. On complète avec l'API externe pour avoir les scores mondiaux
        const apiResponse = await fetch(`https://newsapi.org/v2/everything?q=sport&language=fr&sortBy=publishedAt&pageSize=3&apiKey=TON_API_KEY`);
        const apiData = await apiResponse.json();
        const apiSport = apiData.articles || [];

        // 3. Fusion et Rendu
        const allSport = [...(sbSport || []), ...apiSport].slice(0, 6);

        if (allSport.length > 0) {
            container.innerHTML = allSport.map(news => {
                const title = news.titre || news.title;
                const summary = news.description || news.content || "";
                const link = news.lien_source || news.url;

                return `
                    <article class="sport-card">
                        <span class="sport-category">Actualité Sportive</span>
                        <a href="${link}" target="_blank" class="sport-title">${title}</a>
                        <p class="sport-summary">${summary.substring(0, 100)}...</p>
                    </article>
                `;
            }).join('');
        } else {
            container.innerHTML = "<p>Aucune info sportive pour le moment.</p>";
        }

    } catch (e) {
        console.warn("Erreur chargement sport:", e);
        container.innerHTML = "<p>Service momentanément indisponible.</p>";
    }
}
async function fetchWellnessContent() {
    const container = document.getElementById('wellness-container');
    if (!container) return;

    try {
        const { data: wellnessArticles, error } = await supabaseClient
            .from('articles')
            .select('*')
            .or('category.ilike.santé,category.ilike.bien-être')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (wellnessArticles && wellnessArticles.length > 0) {
            container.innerHTML = wellnessArticles.map(art => {
                // --- Calcul du temps de lecture ---
                const textContent = art.contenu || ""; 
                const wordsPerMinute = 200;
                const noOfWords = textContent.split(/\s+/).length;
                const minutes = Math.ceil(noOfWords / wordsPerMinute);
                const readTime = minutes < 1 ? 1 : minutes; // Minimum 1 min

                return `
                    <article class="well-card">
                        <div class="well-image-wrapper">
                            <img src="${art.image_url || 'placeholder.jpg'}" alt="${art.titre}">
                        </div>
                        <a href="#" onclick="openArticle('${art.id}')" class="well-title">${art.titre}</a>
                        <span class="well-meta">${readTime} MIN READ</span>
                    </article>
                `;
            }).join('');
        }
    } catch (e) {
        console.warn("Erreur Wellness:", e);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const footerToggles = document.querySelectorAll('.footer-toggle');

    footerToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const parent = toggle.parentElement;
                
                // Ferme les autres sections ouvertes (facultatif)
                document.querySelectorAll('.footer-col').forEach(col => {
                    if (col !== parent) col.classList.remove('active');
                });

                // Bascule la section actuelle
                parent.classList.toggle('active');
            }
        });
    });
});
// Initialisation au chargement
window.onload = () => {
    updateDate();
    initMarketTicker();
    loadTrendingTags();
    initAdEngine();
    fetchAllContent('top');
    fetchVideosVerticaux();
    fetchSportResume();
    fetchWellnessContent(); // <--- Nouvelle section
};
