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
    // On s'assure de récupérer l'ID depuis l'URL si articleId n'est pas défini
    const urlParams = new URLSearchParams(window.location.search);
    const currentArticleId = typeof articleId !== 'undefined' ? articleId : urlParams.get('id');

    const { data: art, error } = await supabaseClient
        .from('articles')
        .select('*')
        .eq('id', currentArticleId)
        .single();

    if (error || !art) {
        document.getElementById('full-article').innerHTML = "<p style='text-align:center; padding:100px;'>Erreur de chargement.</p>";
        return;
    }

    document.title = `${art.titre} | MakMus`;

    // --- LOGIQUE D'INJECTION DYNAMIQUE ---
    const paragraphs = art.description.split('</p>');
    let finalContent = "";
    const totalPara = paragraphs.length;

    paragraphs.forEach((p, index) => {
        if (p.trim() === "") return;
        finalContent += p + '</p>';

        // 1. Première PUB après le 2ème paragraphe
        if (index === 1 && totalPara > 3) {
            finalContent += `
                <div class="in-article-ad">
                    <span class="ad-label">PUBLICITÉ</span>
                    <div class="ad-box">
                        <h4 style="margin:0; color:#c00;">MakMus Direct</h4>
                        <p style="margin:5px 0; font-size:0.9rem;">Ne manquez aucune alerte. Rejoignez notre canal WhatsApp.</p>
                        <button style="background:#25D366; color:#fff; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">REJOINDRE</button>
                    </div>
                </div>`;
        }

        // 2. IMAGE SECONDAIRE
        if (index === 3 && art.image_url_2) {
            finalContent += `
                <div style="margin:30px 0;">
                    <img src="${art.image_url_2}" style="width:100%; border-radius:2px; display:block;">
                    ${art.image_caption_2 ? `<p style="font-size:0.75rem; color:#777; font-style:italic; margin-top:5px; text-align:right;">${art.image_caption_2}</p>` : ''}
                </div>`;
        }

        // 3. Bloc "À LIRE AUSSI" en GRILLE (au milieu)
        if (index === Math.floor(totalPara / 2) && totalPara > 5) {
            finalContent += `
                <div class="inline-recommendations">
                    <h4 class="grid-title">À LIRE AUSSI</h4>
                    <div class="mini-grid" id="inline-grid-container">
                        <div class="mini-card" id="card-1">
                            <img src="" class="mini-card-img" id="inline-img-1" style="display:none;">
                            <p id="inline-title-1">Chargement...</p>
                        </div>
                        <div class="mini-card" id="card-2">
                            <img src="" class="mini-card-img" id="inline-img-2" style="display:none;">
                            <p id="inline-title-2">Chargement...</p>
                        </div>
                    </div>
                </div>`;
            setTimeout(() => fillInlineGrid(art.category, currentArticleId), 200);
        }

        // 4. Deuxième PUB vers la fin
        if (index === totalPara - 3 && totalPara > 8) {
            finalContent += `
                <div class="in-article-ad" style="background: #121212; color: white; border: none;">
                    <span class="ad-label" style="color: #666;">PROMOTION</span>
                    <div class="ad-box">
                        <h4 style="margin:0; color:#fff;">Soutenez MakMus</h4>
                        <p style="margin:5px 0; font-size:0.9rem; color:#ccc;">Le journalisme de qualité a un coût. Aidez-nous à continuer.</p>
                        <button onclick="openShare()" style="background:#fff; color:#000; border:none; padding:8px 15px; cursor:pointer; font-weight:bold; margin-top:10px;">PARTAGER</button>
                    </div>
                </div>`;
        }
    });

    // --- RENDU FINAL ---
    document.getElementById('full-article').innerHTML = `
        <header class="article-header" style="max-width:850px; margin: 0 auto; padding: 20px 10px;">
            <div style="color:#c00; font-weight:bold; font-size:0.75rem; text-transform:uppercase; margin-bottom:10px; letter-spacing:1px;">
                ${art.category || 'Actualité'}
            </div>
            <h1 class="article-main-title">${art.titre}</h1>
            
            <div class="article-actions-bar no-print" style="display:flex; align-items:center; flex-wrap:wrap; gap:20px; padding:15px 0; margin:20px 0; border-top:1px solid #eee; border-bottom:1px solid #eee;">
                <button class="action-btn" onclick="toggleLike()" id="like-btn" style="display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; color:#555; padding:0;">
                    <div style="width:36px; height:36px; border:1px solid #ccc; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </div>
                    <span id="nb-like" style="font-weight:bold;">0</span>
                </button>
                <button class="action-btn" onclick="openShare()" style="background:none; border:none; cursor:pointer; color:#555; padding:0;">
                    <div style="width:36px; height:36px; border:1px solid #ccc; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                    </div>
                </button>
                <button class="action-btn" onclick="openComments()" style="display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; color:#555; padding:0;">
                    <div style="width:36px; height:36px; border:1px solid #ccc; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </div>
                    <span id="nb-comm" style="font-weight:bold;">0</span>
                </button>
                <button class="action-btn" onclick="toggleSpeech()" id="speech-btn" style="display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; color:#555; padding:0; margin-left:auto;">
                    <div class="icon-circle" style="width:36px; height:36px; border:1px solid #ccc; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                    </div>
                    <span id="speech-text" style="text-transform:uppercase; font-size:0.7rem; letter-spacing:1px; font-weight:bold;">Écouter</span>
                </button>
            </div>

            <div style="margin-bottom:30px; display:flex; align-items:center; gap:12px;">
                <img src="${art.author_image || 'https://via.placeholder.com/40'}" style="width:42px; height:42px; border-radius:50%; object-fit:cover;">
                <div>
                    <div style="font-weight:bold;">Par ${art.author_name || 'La Rédaction'}</div>
                    <div style="font-size:0.8rem; color:#666;">Publié le ${new Date(art.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})}</div>
                </div>
            </div>
        </header>

        <div style="max-width:1000px; margin: 0 auto; padding: 0 10px;">
            <img src="${art.image_url}" style="width:100%; border-radius:2px;">
            <p style="text-align:right; font-size:0.75rem; color:#777; margin-top:10px; font-style:italic;">${art.image_caption || ''}</p>
        </div>

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
function toggleMenu(show) {
    const menu = document.getElementById('fullMenu');
    if (menu) {
        if (show) {
            menu.classList.add('is-active');
            document.body.style.overflow = 'hidden';
        } else {
            menu.classList.remove('is-active');
            document.body.style.overflow = 'auto';
        }
    }
}
window.toggleMenu = toggleMenu;

function toggleModal(id, show) {
    const m = document.getElementById(id);
    if(m) m.style.display = show ? 'flex' : 'none';
}

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

async function fetchRelatedArticles(tags, category) {
    const box = document.getElementById('recommendations-box');
    const grid = document.getElementById('recommendations-grid');
    if(!grid) return;
    const { data } = await supabaseClient.from('articles').select('id, titre, image_url, category').neq('id', articleId).limit(3);
    if(data && data.length > 0) {
        box.style.display = 'block';
        grid.innerHTML = data.map(r => `
            <a href="redaction.html?id=${r.id}" style="text-decoration:none; color:inherit;">
                <img src="${r.image_url}" style="width:100%; height:160px; object-fit:cover; border-radius:2px;">
                <div style="color:#c00; font-size:0.7rem; font-weight:bold; margin-top:10px;">${r.category}</div>
                <div style="font-family:serif; font-weight:bold; font-size:1rem; margin-top:5px;">${r.titre}</div>
            </a>`).join('');
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
function filterByTag(tagName) {
    // Si tu es sur la page d'accueil avec fetchHybridNews :
    if (typeof fetchHybridNews === 'function') {
        fetchHybridNews('top', tagName);
    } else {
        // Sinon, redirige vers l'accueil avec le tag en paramètre
        window.location.href = `index.html?tag=${encodeURIComponent(tagName)}`;
    }
}