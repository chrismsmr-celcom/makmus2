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
/* ==========================================================================
   2. INTERFACE : MENU & MODALES
   ========================================================================== */
window.toggleMenu = (show) => {
    const menu = document.getElementById('fullMenu');
    if (!menu) return;
    if (show) {
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

window.toggleModal = (id, show) => {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (show) {
        modal.style.display = 'flex';
        modal.classList.add('active'); 
        document.body.style.overflow = 'hidden';
    } else {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Fermeture si clic sur le fond (modal-overlay)
    modal.onclick = function(event) {
        if (event.target === modal) {
            window.toggleModal(id, false);
        }
    };
};

// Sécurité Globale (doublon supprimé pour éviter les conflits)
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});
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
        
        // Exclure les résumés sportifs (qui vont dans le slider dédié)
        query = query.neq('author_name', 'MAKMUS_SPORT_RESUME'); 
        
        if (category !== 'top') query = query.eq('category', category);
        if (querySearch) query = query.or(`titre.ilike.%${querySearch}%,description.ilike.%${querySearch}%`);

        const { data: myArticles, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let worldNews = [];
        // Charger les news mondiales uniquement sur l'accueil sans recherche
        if (category === 'top' && !querySearch) {
            const cached = localStorage.getItem('news_api_cache');
            const cacheTime = localStorage.getItem('news_api_timestamp');

            if (cached && cacheTime && (Date.now() - cacheTime < 3600000)) {
                worldNews = JSON.parse(cached);
            } else {
                try {
                    const res = await fetch(BACKEND_URL);
                    if (res.ok) {
                        const apiData = await res.json();
                        worldNews = (apiData.articles || []).filter(a => a.urlToImage && a.title && a.title !== "[Removed]");
                        localStorage.setItem('news_api_cache', JSON.stringify(worldNews));
                        localStorage.setItem('news_api_timestamp', Date.now());
                    }
                } catch (apiErr) {
                    console.warn("News API indisponible, utilisation des données locales uniquement.");
                }
            }
        }

        // Filtrer les doublons : on ne garde les news mondiales que si le titre n'est pas déjà dans nos articles Supabase
        const existingTitles = new Set(myArticles.map(a => (a.titre || "").toLowerCase().trim()));
        const filteredWorld = worldNews.filter(a => !existingTitles.has((a.title || "").toLowerCase().trim()));

        renderUI(myArticles, filteredWorld);

        if (status) {
            status.textContent = querySearch ? `RÉSULTATS : ${querySearch.toUpperCase()}` : 
                                 (category === 'top' ? "ÉDITION DU JOUR — KINSHASA" : `RUBRIQUE : ${category.toUpperCase()}`);
        }
    } catch (e) {
        console.error(e);
        if (status) status.textContent = "ERREUR DE RÉSEAU";
    }
}
function renderUI(myArticles, worldNews = []) {
    const heroZone = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');

    const heroArticle = myArticles.find(a => a.is_priority === true) || myArticles[0] || worldNews[0];
    const allItems = [...myArticles, ...worldNews];
    const gridArticles = allItems.filter(a => 
        (a.id && heroArticle && a.id !== heroArticle.id) || 
        (a.url && heroArticle && a.url !== heroArticle.url)
    );

    if (heroZone && heroArticle) {
        const h = heroArticle;
        const displayTitle = h.titre || h.title || "";
        const displayLink = h.id ? `redaction.html?id=${h.id}` : h.url;
        const cleanTitle = displayTitle.replace(/'/g, "\\'");

        heroZone.innerHTML = `
            <div class="main-article">
                <h1 onclick="captureAction('${cleanTitle}', '${h.category || 'INFO'}', '${displayLink}')" style="cursor:pointer;">${displayTitle}</h1>
                <div class="hero-content">
                    <div class="hero-text">
                        <p class="hero-description" onclick="captureAction('${cleanTitle}', '${h.category || 'INFO'}', '${displayLink}')" style="cursor:pointer;">
                            ${(h.description || "").replace(/<[^>]*>/g, '').substring(0, 160)}...
                        </p>
                        
                        <div class="hero-sub-news-wrapper">
                            ${gridArticles.slice(0, 2).map(sub => {
                                const subTitle = (sub.titre || sub.title || "").replace(/'/g, "\\'");
                                const subLink = sub.id ? `redaction.html?id=${sub.id}` : sub.url;
                                return `
                                    <div class="sub-news-item" onclick="captureAction('${subTitle}', '${sub.category || 'INFO'}', '${subLink}')">
                                        <h4>${sub.titre || sub.title}</h4>
                                        <span class="read-time">2 MIN READ</span>
                                    </div>`;
                            }).join('')}
                        </div>

                        <span class="read-more-btn" onclick="captureAction('${cleanTitle}', '${h.category || 'INFO'}', '${displayLink}')">LIRE L'ARTICLE COMPLET →</span>
                    </div>
                    <div class="hero-image">
                        <img src="${h.image_url || h.urlToImage || 'https://via.placeholder.com/800x500'}" onerror="this.src='https://via.placeholder.com/800x500'">
                        ${h.image_caption ? `<div class="photo-credit"> ${h.image_caption}</div>` : ''}
                    </div>
                </div>
            </div>`;
    }

    // Rendu de la grille standard
    if (grid) {
        const finalGridItems = gridArticles.slice(2, 8);
        grid.innerHTML = finalGridItems.map(art => `
            <div class="article-card" onclick="captureAction('${(art.titre || art.title || "").replace(/'/g, "\\'")}', '${art.category || 'Infos'}', '${art.id ? `redaction.html?id=${art.id}` : art.url}')">
                <div class="card-img-wrapper">
                    <img src="${art.image_url || art.urlToImage || 'https://via.placeholder.com/400x250'}">
                </div>
                <div style="padding:12px;">
                    <h3 style="font-size:1rem; margin-bottom:8px; line-height:1.3; font-weight:800;">${art.titre || art.title}</h3>
                </div>
            </div>`).join('');
    }
    async function loadSidebarContent() {
    const sidebarList = document.getElementById('sidebar-list');
    const opinionList = document.getElementById('opinion-list');

    try {
        // 1. Articles "AUTRE INFO" (La liste numérotée via CSS)
        const { data: trending, error: trendError } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .eq('category', 'AUTRE_INFO') // Filtre spécifique pour la liste numérotée
            .order('created_at', { ascending: false })
            .limit(5);

        if (!trendError && sidebarList && trending) {
            sidebarList.innerHTML = trending.length > 0 
                ? trending.map(art => `
                    <div class="trending-item" onclick="captureAction('${(art.titre || "").replace(/'/g, "\\'")}', 'Autre Info', 'redaction.html?id=${art.id}')">
                        <div class="trending-content">
                            <h4>${art.titre}</h4>
                        </div>
                    </div>`).join('')
                : "<p style='font-size:0.8rem; padding:10px; color:#999;'>Aucune information supplémentaire.</p>";
        }

        // 2. Articles "OPINION" avec avatars
        const { data: opinions, error: opError } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .eq('category', 'OPINION') // Utilise maintenant le mode OPINION de ton éditeur
            .order('created_at', { ascending: false })
            .limit(4);

        if (!opError && opinionList && opinions) {
            opinionList.innerHTML = opinions.length > 0
                ? opinions.map(op => `
                    <div class="opinion-item" onclick="captureAction('${(op.titre || "").replace(/'/g, "\\'")}', 'Opinion', 'redaction.html?id=${op.id}')">
                        <div class="opinion-item-text">
                            <span>${op.author_name || 'RÉDACTION'}</span>
                            <h4>${op.titre}</h4>
                        </div>
                        <img class="opinion-avatar" src="${op.author_image || 'https://via.placeholder.com/40'}" 
                             onerror="this.src='https://via.placeholder.com/40'">
                    </div>`).join('')
                : "<p style='font-size:0.8rem; padding:10px; color:#999;'>Aucune opinion publiée.</p>";
        }
    } catch (e) {
        console.error("Erreur lors du chargement de la sidebar:", e);
    }
}
async function loadMoreNews() {
    const container = document.getElementById('more-news-grid');
    if (!container) return;

    // Liste des rubriques que tu souhaites afficher
    const categories = ['ECONOMIE', 'SPORT', 'TECH']; 
    
    let html = '';

    for (const cat of categories) {
        const { data: articles } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('category', cat)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(4);

        if (articles && articles.length > 0) {
            const main = articles[0]; // Le premier avec image
            const subs = articles.slice(1); // Les suivants sans image

            html += `
                <div class="category-block">
                    <h2>${cat}</h2>
                    <div class="category-main-item" onclick="window.location.href='redaction.html?id=${main.id}'" style="cursor:pointer;">
                        <img src="${main.image_url}" onerror="this.src='https://via.placeholder.com/400x250'">
                        <h3>${main.titre}</h3>
                    </div>
                    <div class="category-sub-list">
                        ${subs.map(s => `
                            <div class="category-sub-item" onclick="window.location.href='redaction.html?id=${s.id}'">
                                ${s.titre}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    container.innerHTML = html;
}

// Appelle la fonction au chargement
document.addEventListener('DOMContentLoaded', loadMoreNews);
}/* ==========================================================================
   6. VIDÉOS & PUBS
   ========================================================================== */
const ICONS = {
    LIKE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    LIKE_FILLED: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#ff4757"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`,
    MUTE: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"></path></svg>`,
    VOL: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>`,
    FULL: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`
};

// --- Fonctions de contrôle ---
window.toggleMute = (e, btn) => {
    e.stopPropagation();
    const video = btn.closest('.video-card').querySelector('video');
    video.muted = !video.muted;
    btn.innerHTML = video.muted ? ICONS.MUTE : ICONS.VOL;
};

window.toggleFullscreen = (e, btn) => {
    e.stopPropagation();
    const video = btn.closest('.video-card').querySelector('video');

    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) { /* Safari / iOS */
        video.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) { /* Anciens iOS */
        video.webkitEnterFullscreen();
    } else if (video.msRequestFullscreen) { /* IE11 */
        video.msRequestFullscreen();
    }
};
window.handleLike = async (e, btn, id) => {
    e.stopPropagation();
    const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');
    if (likedVideos.includes(id)) return;

    btn.innerHTML = ICONS.LIKE_FILLED;
    btn.style.color = "#ff4757";
    likedVideos.push(id);
    localStorage.setItem('makmus_liked_videos', JSON.stringify(likedVideos));
    
    try {
        await supabaseClient.rpc('increment_likes', { row_id: id });
    } catch(err) { console.error("Like Error:", err); }
};

// --- CORRECTION : Ajout des fonctions de progression ---
window.updateProgress = (video, index) => {
    const bar = document.getElementById(`bar-${index}`);
    if (bar && video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        bar.style.width = percentage + "%";
    }
};

window.autoScrollNext = (currentIndex) => {
    const nextCard = document.getElementById(`vcard-${currentIndex + 1}`);
    if (nextCard) {
        nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        const nextVideo = nextCard.querySelector('video');
        if (nextVideo) {
            nextVideo.play().catch(err => console.log("Autoplay bloqué par le navigateur"));
        }
    } else {
        const slider = document.getElementById('video-slider');
        if (slider) slider.scrollTo({ left: 0, behavior: 'smooth' });
    }
};

// --- Récupération des données ---
async function fetchVideosVerticaux() {
    const { data } = await supabaseClient.from('videos_du_jour').select('*').eq('is_published', true);
    const slider = document.getElementById('video-slider');
    if (!slider || !data) return;

    const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');

    slider.innerHTML = data.map((vid, index) => {
        const isLiked = likedVideos.includes(vid.id);
        return `
        <div class="video-card" id="vcard-${index}">
            <div class="video-controls-top">
                <button class="control-btn" onclick="handleLike(event, this, '${vid.id}')" style="color: ${isLiked ? '#ff4757' : 'white'}">
                    ${isLiked ? ICONS.LIKE_FILLED : ICONS.LIKE}
                </button>
                <button class="control-btn" onclick="toggleMute(event, this)">
                    ${ICONS.MUTE}
                </button>
                <button class="control-btn" onclick="toggleFullscreen(event, this)">
                    ${ICONS.FULL}
                </button>
            </div>
            
            <video src="${vid.video_url}" 
                   playsinline 
                   muted 
                   autoplay
                   onclick="this.paused ? this.play() : this.pause()"
                   ontimeupdate="window.updateProgress(this, ${index})"
                   onended="window.autoScrollNext(${index})">
            </video>

            <div class="progress-bar-container">
                <div class="progress-fill" id="bar-${index}"></div>
            </div>

            <div class="video-overlay-bottom"><h4>${vid.titre}</h4></div>
        </div>`;
    }).join('');
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
async function loadSportsResumes() {
    const track = document.getElementById('sports-resume-track');
    if (!track) return; // Sécurité si l'élément n'existe pas sur la page
    
    const { data, error } = await supabaseClient // Utilise supabaseClient qui est déjà défini en haut
        .from('articles')
        .select('*')
        .eq('author_name', 'MAKMUS_SPORT_RESUME')
        .order('created_at', { ascending: false });

    if (data && data.length > 0) {
        track.innerHTML = data.map(match => `
            <div class="match-card">
                <img src="${match.image_url}" alt="match" style="width:100%; height:180px; object-fit:cover;">
                <div style="padding:15px;">
                    <small style="color:#a30000; font-weight:800; text-transform:uppercase;">${match.image_caption}</small>
                    <h3 style="margin:10px 0; font-family:'Inter'; font-weight:900; color:#fff;">${match.titre}</h3>
                    <a href="redaction.html?id=${match.id}" style="text-decoration:none; font-size:0.8rem; font-weight:700; color:#a30000;">VOIR LE RÉSUMÉ →</a>
                </div>
            </div>
        `).join('');
    } else {
        track.innerHTML = "<p style='color:white; padding:20px;'>Aucun résultat disponible pour le moment.</p>";
    }
}
// Fonction pour faire bouger ton slider avec tes boutons
let slideIndex = 0;
function moveSlide(direction) {
    const track = document.getElementById('sports-resume-track');
    const cards = document.querySelectorAll('.match-card');
    if(cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth + 20; // Largeur + gap
    slideIndex += direction;
    
    // Limites pour ne pas défiler dans le vide
    if (slideIndex < 0) slideIndex = 0;
    if (slideIndex > cards.length - 1) slideIndex = cards.length - 1;

    track.style.transform = `translateX(${-slideIndex * cardWidth}px)`;
}
async function loadAutoTrendingTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    try {
        // On récupère la colonne 'tags' des 30 derniers articles
        const { data, error } = await supabaseClient
            .from('articles')
            .select('tags') 
            .eq('is_published', true)
            .not('tags', 'is', null) // On ignore les articles sans tags
            .limit(30);

        if (error) throw error;

        // Analyse des tags
        const counts = data.reduce((acc, art) => {
            // Si tes tags sont séparés par des virgules (ex: "RDC, Économie")
            // On les sépare pour les compter individuellement
            const individualTags = art.tags.split(',').map(t => t.trim());
            
            individualTags.forEach(tag => {
                if(tag) acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
        }, {});

        // Tri par popularité
        const topTags = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 6);

        container.innerHTML = topTags.map((tag, index) => `
            <span class="trending-link ${index === 0 ? 'is-live' : ''}" 
                  onclick="fetchHybridNews('top', '${tag}')">
                ${tag.toUpperCase()}
            </span>
        `).join('');

    } catch (e) {
        console.warn("Erreur tags:", e);
    }
}
/* ==========================================================================
   7. INITIALISATION FINALE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mise à jour de la date en haut de page
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }).toUpperCase();
    }

    // 2. Lancement des flux de données principaux
    fetchMarketData();       // Bourse
    fetchHybridNews('top');  // News principales (Hero + Grille)
    fetchVideosVerticaux();  // Shorts / Vidéos
    initAdSlider();          // Publicités
    loadSportsResumes();     // Slider Sport (Scores)

    // 3. NOUVEAU : Chargement des sections spécifiques (Sidebar & Footer)
    if (typeof loadSidebarContent === 'function') {
        loadSidebarContent(); // Remplit "Autre Info" et "Opinion"
    }
    
    if (typeof loadMoreNews === 'function') {
        loadMoreNews();      // Remplit la section archive avant le footer
    }

    // 4. Mise à jour automatique du Ticker (Bourse) toutes les 5 secondes
    setInterval(updateTickerUI, 5000);
    
    // 5. Fonctions optionnelles et Trending
    if (typeof loadAutoTrendingTags === 'function') loadAutoTrendingTags();
    
    // 6. Analytics & Tracking
    if (tracker && typeof tracker.log === 'function') {
        tracker.log('view_home');
    }

    // 7. Fonction de compatibilité globale
    window.fetchAllContent = (cat, query) => fetchHybridNews(cat, query);
    
    console.log("MAKMUS News : Initialisation terminée avec succès.");
});

