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
// 1. GESTION DU MENU PRINCIPAL (Navigation)
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

// 2. GESTION DU PANNEAU LATÉRAL (Compte utilisateur)
window.toggleSidePanel = (isOpen) => {
    const panel = document.getElementById('sideAccount');
    if (!panel) return;

    if (isOpen) {
        panel.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        panel.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

// 3. FERMETURE AUTOMATIQUE EN CLIQUANT À L'EXTÉRIEUR
window.addEventListener('click', function(event) {
    // Si on clique sur l'overlay du Side Panel
    if (event.target.classList.contains('side-panel-overlay')) {
        window.toggleSidePanel(false);
    }
    
    // Si on clique sur l'overlay d'un ancien modal (si tu en as encore)
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});
// --- AUTHENTIFICATION ---
window.handleAuth = async function(type) {
    console.log("Tentative d'authentification :", type);
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    try {
        let result;
        if (type === 'signup') {
            result = await supabaseClient.auth.signUp({ email, password });
            if (!result.error) {
                alert("Inscription réussie ! Vérifiez votre boîte mail pour confirmer votre compte.");
                // Optionnel: window.toggleSidePanel(false);
            }
        } else {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        }

        if (result.error) throw result.error;

        // Si on a une session (Connexion réussie ou inscription sans confirmation email)
        if (result.data.session) {
            console.log("Session établie !");
            await window.checkUserStatus(); // On attend la mise à jour de l'UI
            window.toggleSidePanel(false); 
        }

    } catch (error) {
        console.error("Erreur détaillée:", error);
        alert("Erreur : " + error.message);
    }
};

// --- DÉCONNEXION ---
window.handleLogout = async function() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        await window.checkUserStatus();
        window.toggleSidePanel(false);
        alert("Vous avez été déconnecté.");
    } catch (error) {
        alert("Erreur lors de la déconnexion : " + error.message);
    }
};

// --- MISE À JOUR DE L'INTERFACE ---
window.checkUserStatus = async function() {
    // Récupération de l'utilisateur actuel
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const emailDisplay = document.getElementById('user-email-display');
    const btnText = document.querySelector('.account-text');

    if (user) {
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';
        if (emailDisplay) emailDisplay.textContent = user.email;
        if (btnText) btnText.textContent = "MON ESPACE";
        
        // Petit bonus : Mettre la première lettre en majuscule dans l'avatar si tu en as un
        const avatar = document.querySelector('.user-avatar');
        if (avatar) avatar.textContent = user.email.charAt(0).toUpperCase();
        
    } else {
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
        if (btnText) btnText.textContent = "MON COMPTE";
    }
};
// FONCTION POUR SAUVEGARDER UN ARTICLE
window.toggleFavorite = async function(articleId, title) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Connectez-vous pour sauvegarder cet article !");
        window.toggleSidePanel(true);
        return;
    }

    const { error } = await supabaseClient
        .from('favorites')
        .insert([{ user_id: user.id, article_id: articleId, article_title: title }]);

    if (error) alert("Déjà dans vos favoris !");
    else alert("Article sauvegardé !");
};

// FONCTION POUR AJOUTER UN COMMENTAIRE
window.postComment = async function(articleId, text) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) return alert("Connectez-vous pour commenter.");

    const { error } = await supabaseClient
        .from('comments')
        .insert([{ 
            user_id: user.id, 
            user_email: user.email, 
            article_id: articleId, 
            content: text 
        }]);

    if (!error) {
        alert("Commentaire publié !");
        location.reload(); // Pour afficher le nouveau commentaire
    }
};
window.loadUserActivity = async function() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Récupérer les favoris
    const { data: favs } = await supabaseClient
        .from('favorites')
        .select('*')
        .limit(5);

    const favContainer = document.getElementById('user-favorites-list');
    if (favContainer && favs) {
        favContainer.innerHTML = favs.map(f => `
            <div class="mini-fav-item">
                <a href="/article.html?id=${f.article_id}">${f.article_title}</a>
            </div>
        `).join('');
    }
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

window.captureAction = async (encodedTitle, category, url) => {
    const title = decodeURIComponent(encodedTitle); // On retrouve le vrai texte ici
    await tracker.log('click_article', { title, category });
    if (url) window.location.href = url;
};
/* ==========================================================================
   4. BOURSE & TICKER
   ========================================================================== */
// 1. Définition des données initiales
let marketData = [
    { label: "USD/CDF", value: "2,850 FC", change: "LIVE", trend: "up" }, // Valeur fallback réaliste
    { label: "BTC/USD", value: "98,450", change: "+1.2%", trend: "up" },
    { label: "OR (oz)", value: "2,150", change: "-0.5%", trend: "down" }
];

// 2. Récupération des données (API)
async function fetchMarketData() {
    // Vérifie si la clé existe pour éviter de bloquer le script
    if (typeof EXCHANGE_API_KEY === 'undefined' || !EXCHANGE_API_KEY) {
        console.warn("Ticker: EXCHANGE_API_KEY manquante.");
        return false;
    }

    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await res.json();
        
        if (data.result === "success") {
            const rate = data.conversion_rates.CDF;
            // Mise à jour de la valeur avec formatage local
            marketData[0].value = Math.round(rate).toLocaleString('fr-FR') + " FC";
            console.log("Ticker: Taux USD/CDF mis à jour.");
            return true;
        }
    } catch (e) { 
        console.error("Ticker: Erreur API", e); 
        return false;
    }
}

// 3. Gestion de l'affichage cyclique
let currentTickerIndex = 0;

function updateTickerUI() {
    const wrapper = document.getElementById('ticker-content');
    if (!wrapper) return;
    
    // Animation de sortie (Fade out)
    wrapper.style.transition = "opacity 0.3s ease";
    wrapper.style.opacity = "0";
    
    setTimeout(() => {
        const item = marketData[currentTickerIndex];
        
        // Construction du HTML sécurisé
        wrapper.innerHTML = `
            <span class="ticker-item">
                <strong style="color: #333;">${item.label}:</strong> ${item.value} 
                <small style="color:${item.trend === 'up' ? '#27ae60' : '#e74c3c'}; font-weight: bold; margin-left: 5px;">
                    ${item.trend === 'up' ? '▲' : '▼'} ${item.change}
                </small>
            </span>
        `;
        
        // Animation d'entrée (Fade in)
        wrapper.style.opacity = "1";
        
        // Incrémentation de l'index
        currentTickerIndex = (currentTickerIndex + 1) % marketData.length;
    }, 300);
}
/* ==========================================================================
   5. MOTEUR HYBRIDE (NEWS)
   ========================================================================== */
async function fetchMakmusNews(querySearch = '') {
    const status = document.getElementById('status-line');
    if (status) status.textContent = "CHARGEMENT...";

    try {
        let query = supabaseClient
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        // --- NOUVEAU : FILTRAGE SI RECHERCHE ---
        // Si querySearch n'est pas vide et n'est pas 'top', on filtre
        if (querySearch && querySearch !== 'top') {
            // On cherche si le mot est dans la catégorie OU le titre
            query = query.or(`category.ilike.%${querySearch}%,titre.ilike.%${querySearch}%`);
        }

        let { data: allArticles, error } = await query;
        if (error) throw error;

        // Si on est en mode "Recherche", on change l'affichage du titre
        if (querySearch && querySearch !== 'top') {
            if (status) status.textContent = `RÉSULTATS POUR : ${querySearch.toUpperCase()}`;
            
            // En mode recherche, on affiche tout dans la grille principale
            renderUI(allArticles[0], allArticles.slice(1, 13));
            return; // On s'arrête ici pour ne pas écraser les autres sections (Opinions, etc.)
        }

        // --- LOGIQUE PAR DÉFAUT (ÉDITION DU JOUR) ---
        
        // Hero & Grille
        const mainStream = allArticles.filter(a => 
            !['OPINION', 'MAKMUS_SPORT_RESUME', 'AUTRE_INFO', 'LIFESTYLE'].includes(a.category)
        );
        const heroArticle = allArticles.find(a => a.is_priority === true) || mainStream[0];
        const gridArticles = mainStream.filter(a => a.id !== heroArticle?.id).slice(0, 6);

        // Autres Sections
        const autreInfos = allArticles.filter(a => a.category === 'AUTRE_INFO').slice(0, 6);
        const opinions = allArticles.filter(a => a.category === 'OPINION').slice(0, 3);
        const lifestyle = allArticles.filter(a => a.category === 'LIFESTYLE').slice(0, 4);
        const sportResumes = allArticles.filter(a => a.category === 'MAKMUS_SPORT_RESUME' || a.author_name === 'MAKMUS_SPORT_RESUME').slice(0, 6);

        // Distribution
        renderUI(heroArticle, gridArticles);
        if (typeof renderAutreInfoSlider === 'function') renderAutreInfoSlider(autreInfos);
        if (typeof renderOpinions === 'function') renderOpinions(opinions);
        if (typeof renderLifestyle === 'function') renderLifestyle(lifestyle);
        if (typeof renderSportsSlider === 'function') renderSportsSlider(sportResumes);
        
        renderMoreNews(allArticles.slice(15)); 

        if (status) status.textContent = "ÉDITION DU JOUR — MAKMUS";
    } catch (e) {
        console.error("Erreur moteur:", e);
        if (status) status.textContent = "ERREUR DE CONNEXION";
    }
}
// --- RENDU LIFESTYLE ---
function renderLifestyle(articles) {
    const container = document.getElementById('lifestyle-grid');
    if (!container || articles.length === 0) return;

    container.innerHTML = articles.map(art => `
        <div class="lifestyle-card" onclick="window.location.href='redaction.html?id=${art.id}'">
            <div class="lifestyle-img-wrapper">
                <img src="${art.image_url}" onerror="this.src='https://via.placeholder.com/400x600'">
                <span class="lifestyle-tag">LIFESTYLE</span>
            </div>
            <h4>${art.titre}</h4>
        </div>
    `).join('');
}

// --- RENDU RÉSUMÉS SPORTIFS ---

function renderSportsSlider(resumes) {
    const track = document.getElementById('sports-resume-track');
    if (!track || resumes.length === 0) return;

    track.innerHTML = resumes.map(match => `
        <div class="match-card" onclick="window.location.href='redaction.html?id=${match.id}'">
            <div class="match-status">RÉSUMÉ</div>
            <img src="${match.image_url}" onerror="this.src='https://via.placeholder.com/300x200'">
            <div class="match-info">
                <small>${match.image_caption || 'MATCH TERMINÉ'}</small>
                <h3>${match.titre}</h3>
                <span class="view-link">VOIR LES BUTS →</span>
            </div>
        </div>`).join('');
}
function renderSportsDashboard(data, type = 'JO') {
    const container = document.getElementById('sports-dynamic-content');
    if (!container) return;

    let headerHtml = '';
    let rowsHtml = '';

    if (type === 'JO') {
        // En-tête type Médailles (Ta capture image_18df5e)
        headerHtml = `
            <tr class="table-header">
                <th class="col-team">NATION</th>
                <th><span style="color:#FFD700">●</span></th>
                <th><span style="color:#C0C0C0">●</span></th>
                <th><span style="color:#CD7F32">●</span></th>
                <th class="col-total">TOTAL</th>
            </tr>`;
            
        rowsHtml = data.map(item => `
            <tr class="score-row">
                <td>
                    <div class="team-info">
                        <img src="${item.flag_url}" class="team-logo">
                        ${item.name}
                    </div>
                </td>
                <td>${item.gold}</td>
                <td>${item.silver}</td>
                <td>${item.bronze}</td>
                <td class="col-total">${item.gold + item.silver + item.bronze}</td>
            </tr>`).join('');

    } else {
        // En-tête type Football / Basket
        headerHtml = `
            <tr class="table-header">
                <th class="col-team">EQUIPE</th>
                <th>M</th>
                <th>V</th>
                <th>N</th>
                <th class="col-total">PTS</th>
            </tr>`;

        rowsHtml = data.map(item => `
            <tr class="score-row">
                <td>
                    <div class="team-info">
                        <img src="${item.logo_url}" class="team-logo">
                        ${item.name}
                    </div>
                </td>
                <td>${item.played}</td>
                <td>${item.win}</td>
                <td>${item.draw}</td>
                <td class="col-total">${item.points}</td>
            </tr>`).join('');
    }

    container.innerHTML = `
        <table class="sports-table">
            <thead>${headerHtml}</thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <a href="#" class="footer-link">Voir le classement complet →</a>
    `;
}
// --- RENDU AUTRE INFO (SLIDER) ---
function renderAutreInfoSlider(trending) {
    const sidebarList = document.getElementById('sidebar-list');
    if (!sidebarList || trending.length === 0) return;

    sidebarList.innerHTML = trending.map(art => `
        <div class="trending-slide-card" onclick="window.location.href='redaction.html?id=${art.id}'">
            <img src="${art.image_url}" class="slide-cover">
            <h4 class="playfair">${art.titre}</h4>
            <span class="read-time-small">${art.read_time || '5'} MIN READ</span>
        </div>`).join('');
    
    // Initialise les dots si pas encore fait
    setupSliderControls(trending.length);
}

// --- RENDU OPINIONS ---
function renderOpinions(opinions) {
    const opinionList = document.getElementById('opinion-list');
    if (!opinionList) return;

    opinionList.innerHTML = opinions.map(op => `
        <div class="opinion-container-box">
            <div class="opinion-author-row">
                <span class="author-name">${op.author_name || 'RÉDACTION'}</span>
                <img class="author-avatar" src="${op.author_image || 'https://via.placeholder.com/42'}">
            </div>
            <h4 class="opinion-text-title" onclick="window.location.href='redaction.html?id=${op.id}'">${op.titre}</h4>
            <span class="read-time-small">${op.read_time || '4'} MIN READ</span>
            <img class="opinion-main-cover" src="${op.image_url}" onclick="window.location.href='redaction.html?id=${op.id}'">
        </div>`).join('');
}
function renderUI(heroArticle, gridArticles = []) {
    const heroZone = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');

    // 1. Rendu du HERO (La Une)
    if (heroZone && heroArticle) {
        const h = heroArticle;
        const displayTitle = h.titre || "";
        const displayLink = `redaction.html?id=${h.id}`;
        const safeTitle = encodeURIComponent(displayTitle);

        heroZone.innerHTML = `
            <div class="main-article">
                <h1 onclick="window.location.href='${displayLink}'" style="cursor:pointer;">${displayTitle}</h1>
                <div class="hero-content">
                    <div class="hero-text">
                        <p class="hero-description" onclick="window.location.href='${displayLink}'" style="cursor:pointer;">
                            ${(h.description || "").replace(/<[^>]*>/g, '').substring(0, 160)}...
                        </p>
                        <div class="hero-sub-news-wrapper">
                            ${gridArticles.slice(0, 2).map(sub => `
                                <div class="sub-news-item" onclick="window.location.href='redaction.html?id=${sub.id}'">
                                    <h4>${sub.titre}</h4>
                                    <span class="read-time">2 MIN READ</span>
                                </div>`).join('')}
                        </div>
                        <span class="read-more-btn" onclick="window.location.href='${displayLink}'">LIRE L'ARTICLE COMPLET →</span>
                    </div>
                    <div class="hero-image">
                        <img src="${h.image_url || 'https://via.placeholder.com/800x500'}" onerror="this.src='https://via.placeholder.com/800x500'">
                        ${h.image_caption ? `<div class="photo-credit">${h.image_caption}</div>` : ''}
                    </div>
                </div>
            </div>`;
    }

    // 2. Rendu de la GRILLE (Sous le Hero)
    if (grid) {
        const finalGridItems = gridArticles.slice(2, 8);
        grid.innerHTML = finalGridItems.map(art => `
            <div class="article-card" onclick="window.location.href='redaction.html?id=${art.id}'">
                <div class="card-img-wrapper">
                    <img src="${art.image_url || 'https://via.placeholder.com/400x250'}">
                </div>
                <div style="padding:12px;">
                    <h3 style="font-size:1rem; margin-bottom:8px; line-height:1.3; font-weight:800;">${art.titre}</h3>
                </div>
            </div>`).join('');
    }
}
function setupSliderControls(count) {
    const sidebarList = document.getElementById('sidebar-list');
    if (!sidebarList || count === 0) return;

    // Supprimer l'ancien contrôleur s'il existe pour éviter les doublons
    const oldControls = document.getElementById('slider-controls');
    if (oldControls) oldControls.remove();

    const controls = document.createElement('div');
    controls.id = 'slider-controls';
    controls.className = 'slider-controls-wrapper';
    
    // Générer les points (dots)
    const dotsHtml = Array.from({ length: count }, (_, i) => 
        `<div class="dot ${i === 0 ? 'active' : ''}"></div>`
    ).join('');
    
    controls.innerHTML = `
        <div class="slider-dots">${dotsHtml}</div>
        <div class="slider-arrows">
            <button class="nav-btn" onclick="slideMore(-1)">❮</button>
            <button class="nav-btn" onclick="slideMore(1)">❯</button>
        </div>
    `;
    
    sidebarList.after(controls);

    // Écouter le scroll pour mettre à jour les dots
    sidebarList.addEventListener('scroll', updateSliderDots);
}
function renderOpinions(opinions) {
    const opinionList = document.getElementById('opinion-list');
    if (!opinionList) {
        console.warn("Conteneur 'opinion-list' introuvable dans le HTML");
        return;
    }

    if (!opinions || opinions.length === 0) {
        opinionList.innerHTML = "<p style='font-size:12px; color:#666;'>Aucune opinion disponible pour le moment.</p>";
        return;
    }

    opinionList.innerHTML = opinions.map(op => `
        <div class="opinion-container-box">
            <div class="opinion-author-row">
                <span class="author-name">${op.author_name || 'CHRONIQUEUR'}</span>
                <img class="author-avatar" src="${op.author_image || 'https://via.placeholder.com/42'}" onerror="this.src='https://via.placeholder.com/42'">
            </div>
            <h4 class="opinion-text-title" onclick="window.location.href='redaction.html?id=${op.id}'">${op.titre}</h4>
            <span class="read-time-small">${op.read_time || '4'} MIN READ</span>
            <img class="opinion-main-cover" src="${op.image_url}" onclick="window.location.href='redaction.html?id=${op.id}'" onerror="this.style.display='none'">
        </div>
    `).join('');
}
// Fonction pour mettre à jour l'état des points (dots) lors du défilement
function updateSliderDots() {
    const container = document.getElementById('sidebar-list');
    const dots = document.querySelectorAll('.dot');
    
    if (!container || dots.length === 0) return;

    // On calcule l'index de l'article visible
    // (Largeur scrollée / Largeur d'une carte)
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.offsetWidth;
    const index = Math.round(scrollLeft / itemWidth);
    
    // On met à jour la classe 'active' sur le bon point
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}
function renderMoreNews(allArticles) {
    const container = document.getElementById('more-info-grid');
    if (!container) return;

    // On définit les catégories qu'on veut afficher dans cette grille
    const sections = ['World News', 'U.S. Politics', 'Technology', 'Science', 'Health'];
    
    // On peut aussi les récupérer dynamiquement depuis les articles
    const categories = [...new Set(allArticles.map(a => a.category))].slice(0, 5);

    container.innerHTML = categories.map(cat => {
        // Filtrer les articles pour cette colonne
        const articlesInCat = allArticles.filter(a => a.category === cat).slice(0, 4);
        if (articlesInCat.length === 0) return '';

        const main = articlesInCat[0];
        const subs = articlesInCat.slice(1);

        return `
            <div class="info-category-block">
                <span class="category-label">${cat.replace('_', ' ')}</span>
                <img src="${main.image_url}" class="info-main-img" onclick="window.location.href='redaction.html?id=${main.id}'">
                <h4 class="info-main-title" onclick="window.location.href='redaction.html?id=${main.id}'">${main.titre}</h4>
                
                <div class="info-sub-list">
                    ${subs.map(s => `
                        <p class="info-sub-title" onclick="window.location.href='redaction.html?id=${s.id}'">
                            ${s.titre}
                        </p>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}
window.slideMore = (direction) => {
    const container = document.getElementById('sidebar-list');
    if (container) {
        // On calcule le déplacement (largeur du conteneur)
        const scrollAmount = container.offsetWidth;
        container.scrollBy({ 
            left: direction * scrollAmount, 
            behavior: 'smooth' 
        });
    } else {
        console.error("Conteneur 'sidebar-list' introuvable pour le scroll");
    }
};
/* ==========================================================================
   6. VIDÉOS & PUBS
   ========================================================================== */
const ICONS = {
    LIKE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    LIKE_FILLED: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#ff4757"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`,
    MUTE: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"></path></svg>`,
    VOL: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>`,
    FULL: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`
};

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
    const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');
    if (likedVideos.includes(id)) return;
    btn.innerHTML = ICONS.LIKE_FILLED;
    likedVideos.push(id);
    localStorage.setItem('makmus_liked_videos', JSON.stringify(likedVideos));
    try { await supabaseClient.rpc('increment_likes', { row_id: id }); } catch(err) { console.error(err); }
};

window.updateProgress = (video, index) => {
    const bar = document.getElementById(`bar-${index}`);
    if (bar && video.duration) {
        bar.style.width = (video.currentTime / video.duration) * 100 + "%";
    }
};

window.autoScrollNext = (currentIndex) => {
    const nextCard = document.getElementById(`vcard-${currentIndex + 1}`);
    if (nextCard) {
        nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        const v = nextCard.querySelector('video'); if (v) v.play().catch(e => {});
    }
};

async function fetchVideosVerticaux() {
    const { data } = await supabaseClient.from('videos_du_jour').select('*').eq('is_published', true);
    const slider = document.getElementById('video-slider');
    if (!slider || !data) return;
    
    const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');
    
    slider.innerHTML = data.map((vid, index) => {
        const isLiked = likedVideos.includes(vid.id);
        
        // On ne met l'attribut 'autoplay' que si index est égal à 0
        const autoplayAttr = index === 0 ? 'autoplay' : '';
        
        return `
        <div class="video-card" id="vcard-${index}">
            <div class="video-controls-top">
                <button class="control-btn" onclick="handleLike(event, this, '${vid.id}')">
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
                   ${autoplayAttr} 
                   onclick="this.paused ? this.play() : this.pause()" 
                   ontimeupdate="window.updateProgress(this, ${index})" 
                   onended="window.autoScrollNext(${index})">
            </video>
            
            <div class="progress-bar-container">
                <div class="progress-fill" id="bar-${index}"></div>
            </div>
            
            <div class="video-overlay-bottom">
                <h4>${vid.titre}</h4>
            </div>
        </div>`;
    }).join('');
}
let activeAds = [], currentAdIndex = 0;
async function initAdSlider() {
    const { data } = await supabaseClient.from('publicites').select('*').eq('est_active', true);
    if (!data || data.length === 0) return;
    activeAds = data;
    showNextAd(); setInterval(showNextAd, 15000);
}

function showNextAd() {
    const zone = document.getElementById('ad-display-zone');
    if (!zone || activeAds.length === 0) return;
    const ad = activeAds[currentAdIndex];
    const content = ad.type === 'video' ? `<video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>` : `<img class="ad-media ad-fade" src="${ad.media_url}">`;
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
    if (!track) return;
    const { data } = await supabaseClient.from('articles').select('*').eq('author_name', 'MAKMUS_SPORT_RESUME').order('created_at', { ascending: false });
    if (data && data.length > 0) {
        track.innerHTML = data.map(match => `
            <div class="match-card">
                <img src="${match.image_url}" alt="match" style="width:100%; height:180px; object-fit:cover;">
                <div style="padding:15px;">
                    <small style="color:#a30000; font-weight:800; text-transform:uppercase;">${match.image_caption}</small>
                    <h3 style="margin:10px 0; font-family:'Inter'; font-weight:900; color:#fff;">${match.titre}</h3>
                    <a href="redaction.html?id=${match.id}" style="text-decoration:none; font-size:0.8rem; font-weight:700; color:#a30000;">VOIR LE RÉSUMÉ →</a>
                </div>
            </div>`).join('');
    }
}

let slideIndex = 0;
window.moveSlide = (direction) => {
    const track = document.getElementById('sports-resume-track');
    const cards = document.querySelectorAll('.match-card');
    if(cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + 20;
    slideIndex = Math.max(0, Math.min(slideIndex + direction, cards.length - 1));
    track.style.transform = `translateX(${-slideIndex * cardWidth}px)`;
};

async function loadAutoTrendingTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    try {
        // 1. Récupération des tags des articles publiés
        const { data, error } = await supabaseClient
            .from('articles')
            .select('tags')
            .eq('is_published', true)
            .not('tags', 'is', null)
            .limit(30);

        if (error) throw error;

        // 2. Comptage des occurrences de chaque tag
        const counts = data.reduce((acc, art) => {
            // Sécurité : on vérifie que art.tags est bien une chaîne avant le split
            const tagList = typeof art.tags === 'string' ? art.tags.split(',') : [];
            tagList.forEach(tag => { 
                const t = tag.trim(); 
                if (t) acc[t] = (acc[t] || 0) + 1; 
            });
            return acc;
        }, {});

        // 3. Tri et sélection des 6 meilleurs tags
        const topTags = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 6);

        // 4. Rendu HTML avec l'appel à la NOUVELLE fonction fetchMakmusNews
        container.innerHTML = topTags.map((tag, index) => {
            // On utilise fetchMakmusNews pour filtrer par tag au clic
            return `<span class="trending-link ${index === 0 ? 'is-live' : ''}" 
                          onclick="fetchMakmusNews('${tag}')">
                        ${tag.toUpperCase()}
                    </span>`;
        }).join('');

    } catch (e) { 
        console.warn("Erreur chargement tags:", e); 
    }
}
/* ==========================================================================
   FONCTION GLOBALE : DASHBOARD SPORTS
   ========================================================================== */

/**
 * Fonction principale pour changer de sport
 * Gère à la fois le tableau (stats) et l'article vedette (actu)
 */
async function switchSport(sportType, btn) {
    // 1. UI : Gérer l'état actif des boutons
    // On retire la classe active de TOUS les boutons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // CORECTION ICI : On n'ajoute la classe que si 'btn' est fourni
    if (btn && btn.classList) {
        btn.classList.add('active');
    } else {
        // Optionnel : Si aucun bouton n'est passé (chargement auto), 
        // on cherche le bouton qui correspond au sportType pour l'allumer
        const defaultBtn = document.querySelector(`.tab-btn[onclick*="'${sportType}'"]`);
        if (defaultBtn) defaultBtn.classList.add('active');
    }

    const tableContainer = document.getElementById('sports-dynamic-content');
    const articleContainer = document.getElementById('sports-featured-article');
    if (!tableContainer || !articleContainer) return;

    // Affichage des loaders
    tableContainer.innerHTML = `<div style="text-align:center; padding:20px;"><div class="spinner"></div><p>Chargement des scores...</p></div>`;
    articleContainer.innerHTML = `<div class="skeleton-loader"></div>`;

    try {
        // 2. CHARGEMENT DU TABLEAU (Table: sports_stats)
        const { data: stats, error: statsError } = await supabaseClient
            .from('sports_stats')
            .select('*')
            .eq('category', sportType)
            .order('display_order', { ascending: true });

        if (statsError) throw statsError;
        renderTable(stats, sportType);

        // 3. CHARGEMENT DE L'ARTICLE LE PLUS RÉCENT (Table: articles)
        const { data: article, error: artError } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('category', sportType)
            .eq('is_published', true)
            // On exclut l'auteur spécial pour ne prendre que du vrai contenu éditorial
            .neq('author_name', 'MAKMUS_SPORT_RESUME') 
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (article) {
            renderFeaturedArticle(article);
        } else {
            articleContainer.innerHTML = `
                <div class="no-article">
                    <p style="color:#999; font-style:italic; padding:40px; text-align:center;">
                        Aucune actualité récente pour ${sportType.replace('_', ' ')}.
                    </p>
                </div>`;
        }

    } catch (e) {
        console.error("Erreur switchSport:", e);
        tableContainer.innerHTML = "<p style='text-align:center; padding:20px;'>Erreur de connexion.</p>";
    }
}

/**
 * Sous-fonction : Génère le HTML du tableau de classement
 */
function renderTable(data, type) {
    const container = document.getElementById('sports-dynamic-content');
    if (!container || !data) return;

    let h = { c1: 'J', c2: 'V', c3: 'N', tot: 'PTS' };
    if (type === 'JO') h = { c1: '🥇', c2: '🥈', c3: '🥉', tot: 'TOT.' };

    let html = `<table class="medal-table">
        <thead><tr><th style="text-align:left;">ÉQUIPE</th><th>${h.c1}</th><th>${h.c2}</th><th>${h.c3}</th><th>${h.tot}</th></tr></thead>
        <tbody>` + 
        data.map(item => `
            <tr>
                <td class="team-cell">
                    <img src="${item.logo_url}" class="flag-icon">
                    <span class="team-name-text">${item.team_name}</span>
                </td>
                <td>${item.stat_j || 0}</td><td>${item.stat_v || 0}</td><td>${item.stat_n || 0}</td>
                <td class="bold">${item.stat_total || 0}</td>
            </tr>`).join('') + 
        `</tbody></table>`;

    container.innerHTML = html;
}

function renderFeaturedArticle(art) {
    const container = document.getElementById('sports-featured-article');
    if (!container) return;

    const cleanDesc = art.description ? art.description.replace(/<[^>]*>/g, '').substring(0, 160) : "";
    
    container.innerHTML = `
        <div class="featured-card" onclick="window.location.href='redaction.html?id=${art.id}'" style="cursor:pointer;">
            <div class="image-wrapper">
                <img src="${art.image_url}" alt="${art.titre}" style="width:100%; height:350px; object-fit:cover; border-radius:4px;">
                <div class="badge-new" style="position:absolute; top:10px; left:10px; background:red; color:white; padding:3px 8px; font-size:10px;">RÉCENT</div>
            </div>
            <div class="article-meta">
                <h2 style="margin:10px 0;">${art.titre}</h2>
                <p style="color:#555; font-size:14px;">${cleanDesc}...</p>
                <span style="color:red; font-weight:bold; font-size:12px;">LIRE LA SUITE →</span>
            </div>
        </div>`;
}
/* ==========================================================================
   NAVIGATION & SCROLL
   ========================================================================== */

window.switchSport = async (sportType, btn) => {
    console.log("Tentative de navigation vers :", sportType);

    // 1. UI : Changement visuel immédiat
    const allBtns = document.querySelectorAll('.tab-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    
    if (btn) {
        btn.classList.add('active');
    } else {
        // Sélection auto par le sportType si btn est null
        const target = document.querySelector(`.tab-btn[onclick*="${sportType}"]`);
        if (target) target.classList.add('active');
    }

    // 2. Éléments cibles
    const tableContainer = document.getElementById('sports-dynamic-content');
    const articleContainer = document.getElementById('sports-featured-article');

    // 3. Lancement des deux chargements en parallèle pour plus de vitesse
    try {
        console.log("Récupération des données Supabase pour :", sportType);
        
        // On lance les deux promesses en même temps
        const [statsRes, articleRes] = await Promise.all([
            supabaseClient.from('sports_stats').select('*').eq('category', sportType).order('display_order', { ascending: true }),
            supabaseClient.from('articles').select('*').eq('category', sportType).eq('is_published', true).neq('author_name', 'MAKMUS_SPORT_RESUME').order('created_at', { ascending: false }).limit(1).maybeSingle()
        ]);

        if (statsRes.error) throw statsRes.error;

        // 4. Rendu des résultats
        renderTable(statsRes.data, sportType);
        
        if (articleRes.data) {
            renderFeaturedArticle(articleRes.data);
        } else {
            articleContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">Pas d'article pour ${sportType}</p>`;
        }

    } catch (error) {
        console.error("Erreur durant la navigation :", error);
    }
};
/* ==========================================================================
   NAVIGATION DES ONGLETS (FLÈCHES)
   ========================================================================== */
window.scrollTabs = function(distance) {
    const container = document.getElementById('tabs-scroll-container');
    if (container) {
        console.log("Défilement de :", distance); // Pour vérifier dans la console
        container.scrollBy({
            left: distance,
            behavior: 'smooth'
        });
    } else {
        console.error("Erreur : Le conteneur tabs-scroll-container est introuvable.");
    }
};

/* --- Fonction optionnelle pour mettre à jour les points --- */
window.updatePaginationDots = function() {
    const container = document.getElementById('tabs-scroll-container');
    const dots = document.querySelectorAll('.dot');
    if (!container || dots.length === 0) return;

    const scrollPercent = container.scrollLeft / (container.scrollWidth - container.clientWidth);
    const activeIndex = Math.round(scrollPercent * (dots.length - 1));

    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === activeIndex);
    });
};
/* ==========================================================================
   7. INITIALISATION UNIQUE ET GLOBALE (LE CHEF D'ORCHESTRE)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 MAKMUS News Engine : Démarrage du système...");

    // 1. GESTION DE LA DATE (Look Journal Papier)
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
    }

    // 2. VÉRIFICATION DE LA SESSION UTILISATEUR (Indispensable pour l'Espace Compte)
    if (typeof window.checkUserStatus === 'function') {
        await window.checkUserStatus(); 
    }

    // 3. CHARGEMENT DES ARTICLES (Priorité #1 : Le contenu éditorial)
    if (typeof fetchMakmusNews === 'function') {
        fetchMakmusNews(); 
    }

    // 4. INITIALISATION DU DASHBOARD SPORTIF (Affichage par défaut : JO)
    if (typeof window.switchSport === 'function') {
        // On attend un court instant pour laisser les news charger en priorité
        setTimeout(() => {
            window.switchSport('JO', null); 
        }, 300);
    }

    // 5. GESTION DU TICKER BOURSE (USD/CDF & Crypto)
    if (typeof fetchMarketData === 'function') {
        fetchMarketData().then(() => {
            if (typeof updateTickerUI === 'function') {
                updateTickerUI(); // Premier affichage
                setInterval(updateTickerUI, 5000); // Rotation toutes les 5 secondes
            }
        });
    }

    // 6. SERVICES SECONDAIRES (Chargés en arrière-plan)
    setTimeout(() => {
        if (typeof fetchVideosVerticaux === 'function') fetchVideosVerticaux();
        if (typeof initAdSlider === 'function') initAdSlider();
        if (typeof loadAutoTrendingTags === 'function') loadAutoTrendingTags();
        if (typeof window.loadUserActivity === 'function') window.loadUserActivity();
    }, 1000); // On attend 1s pour garantir la fluidité sur mobile

    // 7. SYSTÈME DE RECHERCHE & NAVIGATION PAR TAGS
    window.fetchAllContent = (query) => {
        if (typeof fetchMakmusNews === 'function') {
            fetchMakmusNews(query);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // 8. ÉCOUTEUR DE SCROLL (Pour les points de navigation des onglets sports)
    const tabsContainer = document.getElementById('tabs-scroll-container');
    if (tabsContainer && typeof window.updatePaginationDots === 'function') {
        tabsContainer.addEventListener('scroll', () => {
            window.requestAnimationFrame(window.updatePaginationDots);
        }, { passive: true });
        window.updatePaginationDots(); // Appel initial pour l'état de départ
    }

    console.log("✅ MAKMUS Engine : Tous les services sont opérationnels.");
});
