/* ==========================================================================
   1. CONFIGURATION & CLIENTS
   ========================================================================== */
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio';
const EXCHANGE_API_KEY = '4e4fee63bab6fce7ba7b39e8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==========================================================================
   2. INTERFACE : MENU & PANNEAUX
   ========================================================================== */
window.toggleMenu = (show) => {
    const menu = document.getElementById('fullMenu');
    if (menu) menu.classList.toggle('active', show);
    document.body.style.overflow = show ? 'hidden' : 'auto';/* ==========================================================================
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

/* ==========================================================================
   1. GESTION DU PANNEAU LATÉRAL (SIDE ACCOUNT)
   ========================================================================== */

// Ouvrir ou fermer le panneau
window.toggleSidePanel = (isOpen) => {
    const panel = document.getElementById('sideAccount');
    if (!panel) return;
    
    panel.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
};

// Fermeture automatique au clic sur l'overlay (le fond sombre)
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('side-panel-overlay')) {
        window.toggleSidePanel(false);
    }
    // Gestion des anciens modals si présents
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

/* ==========================================================================
   2. NAVIGATION VERS "MON ACTIVITÉ"
   ========================================================================== */

window.navigateToAccountOption = function(option) {
    console.log("🚀 Navigation vers la section :", option);
    
    // On ferme le panneau avant de partir
    window.toggleSidePanel(false);

    // Redirection vers la page unique avec le paramètre de section
    // Ex: mon-activite.html?section=favoris
    window.location.href = `mon-activite.html?section=${option}`;
};

/* ==========================================================================
   3. AUTHENTIFICATION (CONNEXION / INSCRIPTION / STATUS)
   ========================================================================== */

// Mettre à jour l'affichage selon si l'utilisateur est connecté ou non
window.checkUserStatus = async function() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const emailDisplay = document.getElementById('user-email-display');
    const btnText = document.querySelector('.account-text');
    const avatar = document.querySelector('.user-avatar');

    if (user) {
        // Mode Connecté
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';
        if (emailDisplay) emailDisplay.textContent = user.email;
        if (btnText) btnText.textContent = "MON ESPACE";
        if (avatar) avatar.textContent = user.email.charAt(0).toUpperCase();
        
        // Charger un aperçu rapide des favoris dans le menu
        window.loadUserActivity();
    } else {
        // Mode Déconnecté
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
        if (btnText) btnText.textContent = "MON COMPTE";
    }
};

// Gérer l'inscription et la connexion
window.handleAuth = async function(type) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert("Veuillez remplir tous les champs.");

    try {
        let result;
        if (type === 'signup') {
            result = await supabaseClient.auth.signUp({ email, password });
            if (!result.error) alert("Inscription réussie ! Vérifiez vos emails.");
        } else {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        }

        if (result.error) throw result.error;

        if (result.data.session) {
            await window.checkUserStatus();
            window.toggleSidePanel(false); 
        }
    } catch (error) {
        alert("Erreur : " + error.message);
    }
};

// Déconnexion
window.handleLogout = async function() {
    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) return;

    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Redirection vers l'accueil pour tout réinitialiser
        window.location.href = "index.html"; 
    } catch (error) {
        alert("Erreur lors de la déconnexion : " + error.message);
    }
};

/* ==========================================================================
   4. ACTIONS UTILISATEUR (FAVORIS & COMMENTAIRES)
   ========================================================================== */

// Sauvegarder un article
window.toggleFavorite = async function(articleId, title) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Connectez-vous pour sauvegarder cet article !");
        window.toggleSidePanel(true);
        return;
    }

    const { error } = await supabaseClient
        .from('favorites') // Vérifie bien que ta table s'appelle 'favorites' dans Supabase
        .insert([{ user_id: user.id, article_id: articleId, article_title: title }]);

    if (error) alert("Déjà dans vos favoris ou erreur de table !");
    else alert("Article sauvegardé !");
};

// Poster un commentaire
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
        location.reload(); 
    }
};

// Charger un aperçu (5 derniers) dans le sidepanel
window.loadUserActivity = async function() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: favs } = await supabaseClient
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);

    const favContainer = document.getElementById('user-favorites-list');
    if (favContainer && favs) {
        favContainer.innerHTML = favs.map(f => `
            <div class="mini-fav-item">
                <a href="redaction.html?id=${f.article_id}">${f.article_title}</a>
            </div>
        `).join('');
    }
};

// Lancer la vérification au démarrage
document.addEventListener('DOMContentLoaded', window.checkUserStatus);
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
   6. VIDÉOS & PUBS (CORRIGÉ)
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

    if (!video) return;

    // Tentative pour iOS (iPhone) : utilise souvent webkitEnterFullscreen sur la vidéo elle-même
    if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
    } 
    // Tentative standard (Android / Chrome)
    else if (video.requestFullscreen) {
        video.requestFullscreen();
    } 
    else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } 
    else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
};

window.handleLike = async (e, btn, id) => {
    e.stopPropagation();
    const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');
    if (likedVideos.includes(id)) return;
    
    btn.innerHTML = ICONS.LIKE_FILLED;
    likedVideos.push(id);
    localStorage.setItem('makmus_liked_videos', JSON.stringify(likedVideos));
    
    // Appel RPC (s'assurer que la fonction SQL increment_likes existe sur Supabase)
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
        const v = nextCard.querySelector('video'); 
        if (v) v.play().catch(e => console.warn("Autoplay bloqué par le navigateur"));
    }
};

async function fetchVideosVerticaux() {
    try {
        // 1. Récupération des données
        const { data, error } = await supabaseClient
            .from('videos_du_jour')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        const slider = document.getElementById('video-slider');
        if (!slider || error || !data) return;

        const likedVideos = JSON.parse(localStorage.getItem('makmus_liked_videos') || '[]');

        // 2. Génération du HTML
        slider.innerHTML = data.map((vid, index) => {
            const isLiked = likedVideos.includes(vid.id);
            
            // Sécurité : on vérifie si l'URL existe
            if (!vid.video_url) return '';

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
                
                <video 
                    src="${vid.video_url}" 
                    playsinline 
                    muted 
                    ${index === 0 ? 'autoplay' : ''} 
                    onclick="this.paused ? this.play() : this.pause()" 
                    ontimeupdate="window.updateProgress(this, ${index})" 
                    onended="window.autoScrollNext(${index})"
                    preload="metadata"
                    style="width:100%; height:100%; object-fit:cover;">
                </video>

                <div class="progress-bar-container">
                    <div class="progress-fill" id="bar-${index}"></div>
                </div>

                <div class="video-overlay-bottom">
                    <h4>${vid.titre || 'Sans titre'}</h4>
                </div>
            </div>`;
        }).join('');

        // 3. ACTIVATION DE L'OBSERVER (Smart Play/Pause)
        // On attend un cycle de rendu (setTimeout 0) pour être sûr que le HTML est injecté
        setTimeout(() => {
            if (typeof initVideoObserver === 'function') {
                initVideoObserver();
            }
        }, 100);

    } catch (e) {
        console.error("Erreur fetch videos:", e);
    }
}

/* --- SYSTÈME DE PUBS OPTIMISÉ --- */
let activeAds = [], currentAdIndex = 0;

async function initAdSlider() {
    const { data } = await supabaseClient.from('publicites').select('*').eq('est_active', true);
    if (!data || data.length === 0) return;
    activeAds = data;
    showNextAd(); 
    setInterval(showNextAd, 15000); // Rotation 15s
}

function showNextAd() {
    const zone = document.getElementById('ad-display-zone');
    if (!zone || activeAds.length === 0) return;
    const ad = activeAds[currentAdIndex];
    const content = ad.type === 'video' 
        ? `<video class="ad-media ad-fade" src="${ad.media_url}" autoplay muted loop playsinline></video>` 
        : `<img class="ad-media ad-fade" src="${ad.media_url}">`;
    
    zone.innerHTML = `<div onclick="trackAdClick('${ad.id}', '${ad.lien_clic}')" style="cursor:pointer">${content}</div>`;
    currentAdIndex = (currentAdIndex + 1) % activeAds.length;
}

// Correction du conflit de trackAdClick : Une seule version propre
async function trackAdClick(id, url) {
    if (url) window.open(url, '_blank');
    try {
        // Version optimisée : On incrémente directement sans lire d'abord
        await supabaseClient.rpc('increment_ad_clicks', { ad_id: id });
    } catch (e) { 
        // Fallback si RPC n'existe pas
        console.warn("RPC non trouvé, tentative d'update classique");
        const { data: ad } = await supabaseClient.from('publicites').select('nb_clics').eq('id', id).single();
        await supabaseClient.from('publicites').update({ nb_clics: (ad.nb_clics || 0) + 1 }).eq('id', id);
    }
}
/* ==========================================================================
   OPTIMISATION : INTERSECTION OBSERVER (SMART PLAY/PAUSE)
   ========================================================================== */

function initVideoObserver() {
    const options = {
        root: document.getElementById('video-slider'), // On observe à l'intérieur du slider
        threshold: 0.7 // La vidéo doit être visible à 70% pour se lancer
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;

            if (entry.isIntersecting) {
                // La vidéo entre au centre : on la joue
                video.play().catch(e => console.log("Lecture auto bloquée"));
            } else {
                // La vidéo sort de l'écran : on la met en pause pour économiser les ressources
                video.pause();
            }
        });
    }, options);

    // On attache l'observeur à chaque carte vidéo
    document.querySelectorAll('.video-card').forEach(card => {
        observer.observe(card);
    });
}
/* ==========================================================================
   FONCTION GLOBALE : DASHBOARD SPORTS (CORRIGÉE)
   ========================================================================== */

/**
 * Fonction unique pour changer de sport
 * Gère le classement (stats) et l'article vedette en parallèle
 */
window.switchSport = async function(sportType, btn) {
    console.log("🏆 Sports : Basculement vers", sportType);

    // 1. UI : Gérer l'état actif des boutons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    if (btn) {
        btn.classList.add('active');
    } else {
        // Si chargé auto, on cherche le bouton correspondant pour l'allumer
        const defaultBtn = document.querySelector(`.tab-btn[onclick*="'${sportType}'"]`);
        if (defaultBtn) defaultBtn.classList.add('active');
    }

    const tableContainer = document.getElementById('sports-dynamic-content');
    const articleContainer = document.getElementById('sports-featured-article');
    if (!tableContainer || !articleContainer) return;

    // Affichage des loaders (Spinners / Squelettes)
    tableContainer.innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner"></div></div>`;
    articleContainer.innerHTML = `<div class="skeleton-loader" style="height:300px; background:#eee; border-radius:8px;"></div>`;

    try {
        // 2. CHARGEMENT SIMULTANÉ (Vitesse Optimale)
        const [statsRes, articleRes] = await Promise.all([
            supabaseClient
                .from('sports_stats')
                .select('*')
                .eq('category', sportType)
                .order('display_order', { ascending: true }),
            
            supabaseClient
                .from('articles')
                .select('*')
                .eq('category', sportType)
                .eq('is_published', true)
                .neq('author_name', 'MAKMUS_SPORT_RESUME') 
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        if (statsRes.error) throw statsRes.error;

        // 3. RENDU DU TABLEAU
        renderTable(statsRes.data, sportType);

        // 4. RENDU DE L'ARTICLE VEDETTE
        if (articleRes.data) {
            renderFeaturedArticle(articleRes.data);
        } else {
            articleContainer.innerHTML = `
                <div class="no-article" style="text-align:center; padding:40px; border:1px dashed #ccc;">
                    <p style="color:#999; font-style:italic;">Aucune actualité récente pour ce sport.</p>
                </div>`;
        }

    } catch (e) {
        console.error("❌ Erreur Dashboard Sport:", e);
        tableContainer.innerHTML = "<p style='text-align:center; padding:20px;'>Erreur de chargement des scores.</p>";
    }
};

/**
 * Sous-fonction : Génère le HTML du tableau de classement
 */
function renderTable(data, type) {
    const container = document.getElementById('sports-dynamic-content');
    if (!container || !data) return;

    // Adaptation des entêtes selon le sport (Médailles pour JO, Points pour le reste)
    let h = { c1: 'J', c2: 'V', c3: 'N', tot: 'PTS' };
    if (type === 'JO') h = { c1: '🥇', c2: '🥈', c3: '🥉', tot: 'TOT.' };

    let html = `
        <table class="medal-table">
            <thead>
                <tr>
                    <th style="text-align:left;">ÉQUIPE</th>
                    <th>${h.c1}</th>
                    <th>${h.c2}</th>
                    <th>${h.c3}</th>
                    <th>${h.tot}</th>
                </tr>
            </thead>
            <tbody>` + 
            data.map(item => `
                <tr>
                    <td class="team-cell">
                        <img src="${item.logo_url || 'https://via.placeholder.com/20'}" class="flag-icon" onerror="this.src='https://via.placeholder.com/20'">
                        <span class="team-name-text">${item.team_name}</span>
                    </td>
                    <td>${item.stat_j || 0}</td>
                    <td>${item.stat_v || 0}</td>
                    <td>${item.stat_n || 0}</td>
                    <td class="bold">${item.stat_total || 0}</td>
                </tr>`).join('') + 
            `</tbody>
        </table>`;

    container.innerHTML = html;
}

/**
 * Sous-fonction : Génère le HTML de l'article à la une du sport
 */
function renderFeaturedArticle(art) {
    const container = document.getElementById('sports-featured-article');
    if (!container) return;

    const cleanDesc = art.description ? art.description.replace(/<[^>]*>/g, '').substring(0, 150) : "";
    
    container.innerHTML = `
        <div class="featured-card" onclick="window.location.href='redaction.html?id=${art.id}'" style="cursor:pointer;">
            <div class="image-wrapper" style="position:relative;">
                <img src="${art.image_url}" alt="${art.titre}" style="width:100%; height:320px; object-fit:cover; border-radius:8px;">
                <div class="badge-new" style="position:absolute; top:12px; left:12px; background:#a30000; color:white; padding:4px 10px; font-size:11px; font-weight:bold; border-radius:2px;">À LA UNE</div>
            </div>
            <div class="article-meta" style="padding-top:15px;">
                <h2 style="font-family:'Playfair Display', serif; font-size:1.6rem; margin-bottom:10px; line-height:1.2;">${art.titre}</h2>
                <p style="color:#444; font-size:14px; line-height:1.5;">${cleanDesc}...</p>
                <span style="display:inline-block; margin-top:10px; color:#a30000; font-weight:800; font-size:13px; text-transform:uppercase;">Lire le reportage →</span>
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

document.addEventListener('DOMContentLoaded', () => { // Retrait du async bloquant
    console.log("🚀 MAKMUS News Engine : Démarrage...");

    // 1. DATE DU JOUR (Priorité 1 : Immédiat)
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
    }

    // 2. RECHERCHE GLOBALE
    window.fetchAllContent = (query) => {
        if (typeof fetchMakmusNews === 'function') {
            fetchMakmusNews(query);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // 3. LANCEMENT PARALLÈLE (Ne bloque pas l'affichage des news)
    // On lance les news ET l'auth en même temps
    if (typeof fetchMakmusNews === 'function') fetchMakmusNews();
    if (typeof window.checkUserStatus === 'function') window.checkUserStatus();

    // 4. DASHBOARD SPORTIF
    if (typeof window.switchSport === 'function') {
        window.switchSport('JO', null); 
    }

    // 5. CHARGEMENT DIFFÉRÉ (Services secondaires)
    // On attend 1.2s pour laisser les news et images s'afficher d'abord
    setTimeout(() => {
        console.log("📦 Chargement des services secondaires...");
        
        if (typeof fetchMarketData === 'function') {
            fetchMarketData().then(() => {
                if (typeof updateTickerUI === 'function') {
                    updateTickerUI();
                    setInterval(updateTickerUI, 5000);
                }
            });
        }

        if (typeof fetchVideosVerticaux === 'function') fetchVideosVerticaux();
        if (typeof initAdSlider === 'function') initAdSlider();
        if (typeof loadAutoTrendingTags === 'function') loadAutoTrendingTags();
        if (typeof window.loadUserActivity === 'function') window.loadUserActivity();
    }, 1200); 

    // 6. SCROLL & UI
    const tabsContainer = document.getElementById('tabs-scroll-container');
    if (tabsContainer && typeof window.updatePaginationDots === 'function') {
        tabsContainer.addEventListener('scroll', () => {
            window.requestAnimationFrame(window.updatePaginationDots);
        }, { passive: true });
        window.updatePaginationDots();
    }

    console.log("✅ MAKMUS Engine : Prêt.");
});

};

window.toggleSidePanel = (isOpen) => {
    const panel = document.getElementById('sideAccount');
    if (panel) panel.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
};

/* ==========================================================================
   3. MOTEUR DE NEWS & RECHERCHE (Correction colonne 'tags')
   ========================================================================== */
window.fetchMakmusNews = async function(queryStr = '') {
    const heroZone = document.getElementById('hero-zone');
    const gridZone = document.getElementById('articles-grid');
    if (!heroZone || !gridZone) return;

    try {
        let req = supabaseClient.from('articles').select('*').order('created_at', { ascending: false });
        if (queryStr) req = req.ilike('titre', `%${queryStr}%`);

        const { data, error } = await req;
        if (error) throw error;

        if (!data || data.length === 0) {
            gridZone.innerHTML = "<p style='padding:20px;'>Aucun article trouvé.</p>";
            return;
        }

        // Article à la Une
        const main = data[0];
        heroZone.innerHTML = `
            <div class="main-card" onclick="window.location.href='redaction.html?id=${main.id}'">
                <img src="${main.image_url}" alt="">
                <div class="main-card-content">
                    <span class="category-badge">${main.tags || 'INFO'}</span>
                    <h1>${main.titre}</h1>
                </div>
            </div>`;

        // Grille d'articles
        gridZone.innerHTML = data.slice(1).map(art => `
            <div class="news-card" onclick="window.location.href='redaction.html?id=${art.id}'">
                <img src="${art.image_url}" alt="">
                <div class="news-card-body">
                    <span class="category-badge">${art.tags || 'NEWS'}</span>
                    <h3>${art.titre}</h3>
                </div>
            </div>`).join('');
    } catch (e) { 
        console.error("News Engine Error:", e);
        heroZone.innerHTML = "<p style='color:red; padding:20px;'>Erreur de connexion.</p>";
    }
};

/* ==========================================================================
   4. TAGS TENDANCES (Dynamiques via colonne 'tags')
   ========================================================================== */
window.loadAutoTrendingTags = async function() {
    const tagContainer = document.getElementById('trending-tags');
    if (!tagContainer) return;
    try {
        // Correction : On utilise la colonne 'tags'
        const { data, error } = await supabaseClient.from('articles').select('tags');
        if (error) throw error;

        const counts = {};
        data.forEach(a => {
            if (a.tags) {
                const tag = a.tags.trim();
                counts[tag] = (counts[tag] || 0) + 1;
            }
        });

        const sortedTags = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 6);
        tagContainer.innerHTML = sortedTags.map(tag => 
            `<span class="tag-badge" onclick="fetchMakmusNews('${tag}')">#${tag}</span>`
        ).join('');
    } catch (e) { console.warn("Tags Error:", e.message); }
};

/* ==========================================================================
   5. VIDÉOS VERTICALES & PUBS
   ========================================================================== */
window.fetchVideosVerticaux = async function() {
    const container = document.getElementById('videos-container');
    if (!container) return;
    try {
        const { data } = await supabaseClient.from('videos_verticaux').select('*').limit(5);
        if (data && data.length > 0) {
            container.innerHTML = data.map(v => `
                <div class="video-card">
                    <video src="${v.video_url}" poster="${v.thumbnail_url}" preload="none" onclick="this.play()"></video>
                    <div class="video-title">${v.titre}</div>
                </div>`).join('');
        }
    } catch (e) { console.warn("Videos error"); }
};

window.initAdSlider = function() {
    const ads = document.querySelectorAll('.ad-slide');
    if (ads.length <= 1) return;
    let current = 0;
    setInterval(() => {
        ads[current].style.display = 'none';
        current = (current + 1) % ads.length;
        ads[current].style.display = 'block';
    }, 5000);
};

/* ==========================================================================
   6. DASHBOARD SPORTIF & BOURSE
   ========================================================================== */
window.switchSport = async function(sportCode, event) {
    const container = document.getElementById('sport-results-container');
    const loader = document.getElementById('sport-loader');
    if (!container) return;

    if (loader) loader.style.display = 'block';
    document.querySelectorAll('.sport-tab').forEach(t => t.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');

    try {
        const { data } = await supabaseClient.from('sport_results').select('*').eq('sport_code', sportCode);
        container.innerHTML = (data && data.length > 0) ? data.map(res => `
            <div class="sport-card">
                <div class="sport-time">${new Date(res.event_date).toLocaleDateString()}</div>
                <div class="sport-teams">
                    <span>${res.team_home}</span> <strong>${res.score_home}-${res.score_away}</strong> <span>${res.team_away}</span>
                </div>
            </div>`).join('') : "<p>Aucun résultat disponible.</p>";
    } catch (e) { console.warn("Sport error"); }
    finally { if (loader) loader.style.display = 'none'; }
};

function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.innerHTML;
}

window.fetchMarketData = async function() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await res.json();
        const ticker = document.getElementById('ticker-rates');
        if (ticker && data.conversion_rates) {
            const rawHTML = `<span>🇺🇸 USD/CDF : ${data.conversion_rates['CDF']}</span> | <span>🇪🇺 EUR/USD : 1.08</span> | <span>⛽ Pétrole : $82.4</span>`;
            ticker.innerHTML = sanitize(rawHTML);
        }
    } catch (e) { console.warn("Ticker error"); }
};

/* ==========================================================================
   7. INITIALISATION GÉNÉRALE (ORDRE SÉCURISÉ)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 MAKMUS News Engine : Démarrage...");

    // 1. UI Date
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).toUpperCase();
    }

    // 2. Lancement immédiat des articles (Priorité Affichage)
    window.fetchMakmusNews();

    // 3. Lancement différé pour éviter la saturation réseau/CPU
    setTimeout(() => {
        if (typeof window.checkUserStatus === 'function') window.checkUserStatus();
        window.loadAutoTrendingTags();
        window.switchSport('JO', null);
    }, 600);

    setTimeout(() => {
        window.fetchMarketData();
        window.fetchVideosVerticaux();
        window.initAdSlider();
    }, 1500);

    // 4. Gestion Pagination Scroll
    const tabsContainer = document.getElementById('tabs-scroll-container');
    if (tabsContainer) {
        tabsContainer.addEventListener('scroll', () => {
            if (window.updatePaginationDots) window.updatePaginationDots();
        }, { passive: true });
    }

    console.log("✅ MAKMUS Engine : Prêt.");
});
