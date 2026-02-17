/* ---------------------------------------------------------
   1. CONFIGURATION & INITIALISATION
--------------------------------------------------------- */
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ3BodHJka3BiZmd0ZWp0aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzY4MDYsImV4cCI6MjA4NTc1MjgwNn0.Uoxiax-whIdbB5oI3bof-hN0m5O9PDi96zmaUZ6BBio'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const params = new URLSearchParams(window.location.search);
const articleId = params.get('id');

let currentAudio = null;
window.progressInterval = window.progressInterval || null;
window.keepAliveInterval = window.keepAliveInterval || null;
window.speechSynth = window.speechSynthesis;


function toggleMenu(show) {
    const menu = document.getElementById('fullMenu');
    if (!menu) return;

    // Si 'show' n'est pas passé, on inverse l'état (toggle)
    const isOpen = (typeof show === 'boolean') ? show : !menu.classList.contains('active');

    if (isOpen) {
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}
/* ---------------------------------------------------------
   1. DÉFINITION DES FONCTIONS D'INTERFACE
--------------------------------------------------------- */

// Fonction pour le Menu
function toggleMenu(show) {
    const menu = document.getElementById('fullMenu');
    if (!menu) return;
    const isOpen = (typeof show === 'boolean') ? show : !menu.classList.contains('active');
    
    if (isOpen) {
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Fonction pour les Modales (Commentaires, Partage)
function toggleModal(id, show) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = show ? 'flex' : 'none';
        document.body.style.overflow = show ? 'hidden' : 'auto';
    }
}

/* ---------------------------------------------------------
   2. EXPOSITION GLOBALE (Pour les onclick du HTML)
--------------------------------------------------------- */
window.toggleMenu = toggleMenu;
window.toggleModal = toggleModal;

// On expose aussi les raccourcis
window.openComments = () => toggleModal('commentModal', true);
window.closeComments = () => toggleModal('commentModal', false);
window.openShare = () => toggleModal('shareModal', true);
window.closeShare = () => toggleModal('shareModal', false);
// --- EXPOSITION GLOBALE (Obligatoire pour les onclick du HTML) ---
window.toggleSpeech = toggleSpeech;
window.toggleLike = toggleLike;
window.openComments = openComments;
window.closeComments = closeComments;
window.openShare = openShare;
window.closeShare = closeShare;
window.toggleMenu = toggleMenu;
window.toggleModal = toggleModal;
window.socialShare = socialShare;
window.copyLink = copyLink;
window.postComment = postComment;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', () => {
    updateLiveDate();
    if (articleId) {
        loadArticle();
    } else {
        const fullArt = document.getElementById('full-article');
        if(fullArt) fullArt.innerHTML = "<p style='text-align:center; padding:100px; font-family:serif;'>ID de l'article manquant dans l'URL.</p>";
    }
    
    // Initialisation de la barre de progression
    if(!document.getElementById('audio-progress-container')) {
        const pContainer = document.createElement('div');
        pContainer.id = 'audio-progress-container';
        pContainer.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:4px; background:rgba(0,0,0,0.1); z-index:10000;";
        pContainer.innerHTML = '<div id="audio-progress-bar" style="width:0%; height:100%; background:#c00; transition:width 0.3s;"></div>';
        document.body.prepend(pContainer);
    }
});

/* ---------------------------------------------------------
   2. CHARGEMENT DE L'ARTICLE
--------------------------------------------------------- */
async function loadArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentArticleId = typeof articleId !== 'undefined' ? articleId : urlParams.get('id');

    const { data: art, error } = await supabaseClient
        .from('articles')
        .select('*')
        .eq('id', currentArticleId)
        .single();

    if (error || !art) {
        document.getElementById('full-article').innerHTML = "<p class='error-msg'>Erreur de chargement de l'édition.</p>";
        return;
    }

    document.title = `${art.titre} | MakMus`;

    // --- LOGIQUE DE CONTENU ---
    const paragraphs = art.description.split('</p>');
    let finalContent = "";
    const totalPara = paragraphs.length;

    paragraphs.forEach((p, index) => {
        if (p.trim() === "") return;
        
        // Ajout du paragraphe actuel
        finalContent += p + '</p>';

        // 1. Insertion Pub après le 2ème paragraphe
        if (index === 1 && totalPara > 3) {
            finalContent += `
                <div class="in-article-ad">
                    <span class="ad-label">PUBLICITÉ</span>
                    <div class="ad-box">
                        <h4>MakMus Direct</h4>
                        <p>Rejoignez notre canal WhatsApp pour les alertes en direct.</p>
                        <button class="btn-whatsapp">REJOINDRE</button>
                    </div>
                </div>`;
        }

        // 2. IMAGE SECONDAIRE (Après le 4ème paragraphe - index 3)
        // Elle est injectée DANS le flux pour respecter les 680px
        if (index === 3 && art.image_url_2) {
            finalContent += `
                <figure class="article-media-wrapper">
                    <img src="${art.image_url_2}" loading="lazy">
                    ${art.image_caption_2 ? `<figcaption class="media-caption">${art.image_caption_2}</figcaption>` : ''}
                </figure>`;
        }

        // 3. VIDÉO (Juste après l'image secondaire ou un peu plus bas)
        // On vérifie qu'elle n'est injectée qu'une seule fois
        if (index === 5 && art.video_url) {
            finalContent += `
                <figure class="article-media-wrapper">
                    <video controls playsinline preload="metadata">
                        <source src="${art.video_url}" type="video/mp4">
                    </video>
                    <figcaption class="media-caption">Vidéo : Document exclusif MakMus</figcaption>
                </figure>`;
        }

        // 4. Bloc "À LIRE AUSSI" (Au milieu de l'article)
        if (index === Math.floor(totalPara / 2) && totalPara > 5) {
            finalContent += `
                <div class="inline-recommendations">
                    <h4 class="grid-title">À LIRE AUSSI</h4>
                    <div class="mini-grid" id="inline-grid-container">
                        <div class="mini-card" id="card-1"><p id="inline-title-1">Chargement...</p></div>
                        <div class="mini-card" id="card-2"><p id="inline-title-2">Chargement...</p></div>
                    </div>
                </div>`;
            setTimeout(() => fillInlineGrid(art.category, currentArticleId), 200);
        }
    });

    // --- RENDU STRUCTUREL ---
    document.getElementById('full-article').innerHTML = `
        <header class="article-header">
            <div class="article-category-label">${art.category || 'Actualité'}</div>
            <h1 class="article-main-title">${art.titre}</h1>
            
            <div class="article-actions-bar no-print">
                <button class="action-btn" onclick="toggleLike()" id="like-btn">
                    <div class="icon-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
                    <span id="nb-like" class="count-label">0</span>
                </button>
                <button class="action-btn" onclick="openShare()">
                    <div class="icon-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></div>
                </button>
                <button class="action-btn" onclick="openComments()">
                    <div class="icon-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
                    <span id="nb-comm" class="count-label">0</span>
                </button>
                <button class="action-btn speech-trigger" onclick="toggleSpeech()" id="speech-btn">
                    <div class="icon-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></div>
                    <span id="speech-text">ÉCOUTER</span>
                </button>
            </div>

            <div class="article-byline">
                <img src="${art.author_image || 'https://via.placeholder.com/40'}" class="author-avatar">
                <div class="author-info">
                    <div class="author-name">Par ${art.author_name || 'La Rédaction'}</div>
                    <div class="publish-date">Le ${new Date(art.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})}</div>
                </div>
            </div>
        </header>

        <figure class="main-figure">
            <img src="${art.image_url}" class="main-img">
            <figcaption class="img-caption-style">${art.image_caption || ''}</figcaption>
        </figure>

        <div class="article-content" id="article-text-content">
            ${finalContent}
        </div>
    `;

    fetchLikes();
    fetchComments();
    fetchRelatedArticles(art.tags, art.category);
}
async function fillInlineGrid(category, currentId) {
    const { data: related } = await supabaseClient
        .from('articles')
        .select('id, titre, image_url')
        .eq('category', category)
        .neq('id', currentId)
        .limit(2);

    if (related && related.length > 0) {
        related.forEach((item, i) => {
            const imgEl = document.getElementById(`inline-img-${i+1}`);
            const titleEl = document.getElementById(`inline-title-${i+1}`);
            if (imgEl) {
                imgEl.src = item.image_url;
                imgEl.style.display = "block";
            }
            if (titleEl) {
                titleEl.innerHTML = `<a href="redaction.html?id=${item.id}" style="text-decoration:none; color:#121212; font-weight:bold; font-size:0.9rem;">${item.titre}</a>`;
            }
        });
        if (related.length === 1) {
            const card2 = document.getElementById('card-2');
            if (card2) card2.style.display = 'none';
        }
    } else {
        const container = document.querySelector('.inline-recommendations');
        if (container) container.style.display = 'none';
    }
}
async function loadAutoTrendingTags() {
    const container = document.getElementById('tags-container');
    if (!container) {
        console.error("Le conteneur #tags-container est introuvable dans le HTML");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('articles')
            .select('tags')
            .not('tags', 'is', null) // On ignore les vides
            .limit(50);

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn("Aucun tag trouvé dans la base de données.");
            return;
        }

        const counts = {};
        data.forEach(art => {
            if (art.tags) {
                const individualTags = art.tags.split(',').map(t => t.trim());
                individualTags.forEach(tag => {
                    if (tag.length > 1) counts[tag] = (counts[tag] || 0) + 1;
                });
            }
        });

        const topTags = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 6);

        container.innerHTML = topTags.map((tag, index) => `
            <span class="trending-link ${index === 0 ? 'is-live' : ''}" 
                  onclick="filterByTag('${tag.replace(/'/g, "\\'")}')">
                ${tag.toUpperCase()}
            </span>
        `).join('');

    } catch (e) {
        console.error("Erreur globale tags:", e);
    }
}

// Lancement automatique
loadAutoTrendingTags();
/* ---------------------------------------------------------
   3. LOGIQUE AUDIO (TEXT-TO-SPEECH)
--------------------------------------------------------- */
// Initialisation sécurisée des variables globales
window.progressInterval = window.progressInterval || null;
window.keepAliveInterval = window.keepAliveInterval || null;
const synth = window.speechSynthesis;

/**
 * Récupère la meilleure voix française disponible
 */
function getBestFrenchVoice() {
    const voices = synth.getVoices();
    // Priorité : Google FR, puis n'importe quelle voix FR, puis la première voix système
    return voices.find(v => v.lang.includes('fr') && v.name.includes('Google')) || 
           voices.find(v => v.lang.includes('fr')) || 
           voices[0];
}

// Recharger les voix si le navigateur les charge tardivement
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = getBestFrenchVoice;
}

/**
 * Lance ou arrête la lecture vocale
 */
async function toggleSpeech() {
    const btnText = document.getElementById('speech-text');
    const pBar = document.getElementById('audio-progress-bar');
    const pContainer = document.getElementById('audio-progress-container');

    // Si le moteur est déjà en train de parler ou en attente, on arrête tout
    if (synth.speaking || synth.pending) {
        stopAllAudio();
        return;
    }

    if (btnText) btnText.innerText = "PATIENTEZ...";

    // 1. Nettoyage immédiat de la file d'attente
    synth.cancel();

    // 2. Petit délai pour stabiliser le moteur de synthèse
    setTimeout(() => {
        const title = document.querySelector('.article-main-title')?.innerText || "";
        const body = document.getElementById('article-text-content')?.innerText || "";
        
        // Nettoyage : Retire les Emojis et les espaces insécables (&nbsp;)
        const cleanText = (title + ". " + body)
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) {
            if (btnText) btnText.innerText = "TEXTE VIDE";
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Paramètres de sécurité pour éviter le 'synthesis-failed'
        utterance.lang = 'fr-FR';
        utterance.volume = 1.0; 
        utterance.rate = 1.0;   
        utterance.pitch = 1.0;  

        const selectedVoice = getBestFrenchVoice();
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            if (pContainer) pContainer.style.display = 'block';
            if (btnText) btnText.innerText = "ARRÊTER";

            // Fix Chrome : Empêche l'arrêt après 15 secondes
            if (window.keepAliveInterval) clearInterval(window.keepAliveInterval);
            window.keepAliveInterval = setInterval(() => {
                if (synth.speaking) {
                    synth.pause();
                    synth.resume();
                }
            }, 7000); 

            // Barre de progression
            if (window.progressInterval) clearInterval(window.progressInterval);
            let start = Date.now();
            let estimated = cleanText.length * 75; // ~75ms par caractère
            window.progressInterval = setInterval(() => {
                let elapsed = Date.now() - start;
                let pct = Math.min((elapsed / estimated) * 100, 99);
                if (pBar) pBar.style.width = pct + "%";
            }, 500);
        };

        utterance.onend = () => stopAllAudio();
        utterance.onerror = (event) => {
            console.error("Erreur de synthèse:", event.error);
            stopAllAudio();
        };

        // Lancement de la voix
       // On s'assure que le moteur n'est pas en pause avant de parler
if (synth.paused) {
    synth.resume();
}
synth.speak(utterance);

    }, 300); 
}

/**
 * Arrête tout proprement (Son + Intervalles + UI)
 */
function stopAllAudio() {
    // 1. Arrêt du moteur
    synth.cancel();
    
    // 2. Nettoyage des timers
    if (window.progressInterval) clearInterval(window.progressInterval);
    if (window.keepAliveInterval) clearInterval(window.keepAliveInterval);
    
    // 3. Réinitialisation de l'interface
    const btnText = document.getElementById('speech-text');
    const pContainer = document.getElementById('audio-progress-container');
    const pBar = document.getElementById('audio-progress-bar');

    if (btnText) btnText.innerText = "ÉCOUTER";
    if (pContainer) pContainer.style.display = 'none';
    if (pBar) pBar.style.width = "0%";
}
/* ---------------------------------------------------------
   4. COMMENTAIRES, LIKES & TOASTS
--------------------------------------------------------- */
function showToast(message) {
    const oldToast = document.querySelector('.makmus-toast');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = 'makmus-toast';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

async function toggleLike() {
    const btn = document.getElementById('like-btn');
    if (!btn || btn.classList.contains('liked')) return;
    const { error } = await supabaseClient.from('article_likes').insert([{ article_id: articleId }]);
    if (!error) {
        btn.classList.add('liked');
        btn.style.color = "#c00";
        fetchLikes();
        showToast("Ajouté à vos favoris");
    }
}

async function fetchLikes() {
    const { count } = await supabaseClient.from('article_likes').select('*', { count: 'exact', head: true }).eq('article_id', articleId);
    if (document.getElementById('nb-like')) document.getElementById('nb-like').innerText = count || 0;
}

async function fetchComments() {
    const { data } = await supabaseClient.from('article_comments').select('*').eq('article_id', articleId).order('created_at', { ascending: false });
    if (data) {
        const list = document.getElementById('comments-list');
        if(list) list.innerHTML = data.map(c => `<div style="border-bottom:1px solid #eee; padding:15px 0;"><b>${c.nom}</b><br>${c.message}</div>`).join('');
        if(document.getElementById('nb-comm')) document.getElementById('nb-comm').innerText = data.length;
    }
}

async function postComment() {
    const nomInput = document.getElementById('comm-name');
    const msgInput = document.getElementById('comm-text');
    const nom = nomInput.value.trim();
    const msg = msgInput.value.trim();

    if (!nom || !msg) {
        showToast("Veuillez remplir les deux champs.");
        return;
    }

    const { error } = await supabaseClient.from('article_comments').insert([{ article_id: articleId, nom: nom, message: msg }]);
    if (!error) {
        msgInput.value = "";
        fetchComments();
        showToast("Commentaire publié !");
    }
}

/* ---------------------------------------------------------
   5. NAVIGATION, MODALS & PARTAGE
--------------------------------------------------------- */
function openComments() { toggleModal('commentModal', true); }
function closeComments() { toggleModal('commentModal', false); }
function openShare() { toggleModal('shareModal', true); }
function closeShare() { toggleModal('shareModal', false); }

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    showToast("Lien de l'article copié");
}

function socialShare(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    let shareUrl = '';
    if(platform==='facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if(platform==='x') shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    if(platform==='whatsapp') shareUrl = `https://wa.me/?text=${title}%20${url}`;
    if(shareUrl) window.open(shareUrl, '_blank', 'width=600,height=450');
}

function updateLiveDate() {
    const el = document.getElementById('live-date');
    if (el) el.innerText = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
}

/* ---------------------------------------------------------
   CHARGEMENT DES ARTICLES SIMILAIRES
--------------------------------------------------------- */
async function fetchRelatedArticles(currentTags, category) {
    const grid = document.getElementById('recommendations-grid');
    const box = document.getElementById('recommendations-box');
    
    if (!grid) return;

    // On récupère 6 articles pour remplir la grille (2 lignes de 3)
    const { data: related, error } = await supabaseClient
        .from('articles')
        .select('id, titre, image_url, category')
        .eq('category', category)
        .neq('id', typeof articleId !== 'undefined' ? articleId : null) 
        .limit(6);

    if (error || !related || related.length === 0) {
        if (box) box.style.display = 'none';
        return;
    }

    if (box) box.style.display = 'block';

    // Injection avec la structure exacte de la capture
    grid.innerHTML = related.map(art => `
        <a href="redaction.html?id=${art.id}" class="rec-card">
            <div class="rec-image-container">
                <img src="${art.image_url}" alt="${art.titre.replace(/"/g, '&quot;')}" loading="lazy">
                <div class="ad-badge">Recommandé</div>
            </div>
            <div class="rec-source">${art.category || 'MakMus'}</div>
            <h4 class="rec-title">${art.titre}</h4>
        </a>
    `).join('');
}
function filterByTag(tagName) {
    // Si tu es sur la page d'accueil avec fetchHybridNews :
    if (typeof fetchHybridNews === 'function') {
        fetchHybridNews('top', tagName);
    } else {
        // Sinon, redirige vers l'accueil avec le tag en paramètre
        window.location.href = `index.html?tag=${encodeURIComponent(tagName)}`;
    }
}
function filterByTag(tagName) {
    // Si tu es sur la page d'accueil avec fetchHybridNews :
    if (typeof fetchHybridNews === 'function') {
        fetchHybridNews('top', tagName);
    } else {
        // Sinon, redirige vers l'accueil avec le tag en paramètre
        window.location.href = `index.html?tag=${encodeURIComponent(tagName)}`;
    }
}
/* ==========================================================================
   2. INTERFACE : MENU & MODALES
   ========================================================================== */
/* ---------------------------------------------------------
   GESTION UNIQUE DU MENU
--------------------------------------------------------- */
window.toggleMenu = (show) => {
    const menu = document.getElementById('fullMenu');
    if (!menu) {
        console.error("Erreur : L'élément #fullMenu est introuvable dans le HTML");
        return;
    }

    // Si 'show' n'est pas fourni (clic simple), on inverse l'état actuel
    const shouldOpen = (typeof show === 'boolean') ? show : !menu.classList.contains('active');

    if (shouldOpen) {
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

/* ==========================================================================
   3. AUTHENTIFICATION (CONNEXION / INSCRIPTION / STATUS)
   ========================================================================== */

window.navigateToAccountOption = function(option) {
    console.log("🚀 Navigation vers la section :", option);
    if (typeof window.toggleSidePanel === 'function') window.toggleSidePanel(false);
    window.location.href = `mon-activite.html?section=${option}`;
};

// Mettre à jour l'affichage selon si l'utilisateur est connecté ou non
window.checkUserStatus = async function() {
    try {
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
            
            // Charger l'aperçu sans bloquer le reste du script
            window.loadUserActivity().catch(err => console.warn("Activité différée:", err));
        } else {
            // Mode Déconnecté
            if (loggedOutView) loggedOutView.style.display = 'block';
            if (loggedInView) loggedInView.style.display = 'none';
            if (btnText) btnText.textContent = "MON COMPTE";
        }
    } catch (error) {
        console.error("Erreur checkUserStatus:", error);
    }
};

// Gérer l'inscription et la connexion
window.handleAuth = async function(type) {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;

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
            if (typeof window.toggleSidePanel === 'function') window.toggleSidePanel(false); 
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
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            alert("Connectez-vous pour sauvegarder cet article !");
            if (typeof window.toggleSidePanel === 'function') window.toggleSidePanel(true);
            return;
        }

        const { error } = await supabaseClient
            .from('favorites')
            .insert([{ user_id: user.id, article_id: articleId, article_title: title }]);

        if (error) {
            if (error.code === '23505') alert("Déjà dans vos favoris !");
            else throw error;
        } else {
            alert("Article sauvegardé !");
            window.loadUserActivity();
        }
    } catch (error) {
        console.error("Erreur toggleFavorite:", error);
        alert("Erreur lors de la sauvegarde.");
    }
};

// Poster un commentaire
window.postComment = async function(articleId, text) {
    try {
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

        if (error) throw error;
        alert("Commentaire publié !");
        location.reload(); 
    } catch (error) {
        alert("Erreur lors de la publication : " + error.message);
    }
};

// Charger un aperçu (5 derniers) dans le sidepanel
window.loadUserActivity = async function() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: favs, error } = await supabaseClient
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const favContainer = document.getElementById('user-favorites-list');
        if (favContainer && favs) {
            if (favs.length === 0) {
                favContainer.innerHTML = '<p style="font-size:12px;color:gray;padding:10px;">Aucun favori.</p>';
                return;
            }
            favContainer.innerHTML = favs.map(f => `
                <div class="mini-fav-item">
                    <a href="redaction.html?id=${f.article_id}">${f.article_title}</a>
                </div>
            `).join('');
        }
    } catch (error) {
        console.warn("Table favorites inaccessible ou vide.");
    }
};

// Lancer la vérification au démarrage
document.addEventListener('DOMContentLoaded', window.checkUserStatus);


