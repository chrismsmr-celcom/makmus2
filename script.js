// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://logphtrdkpbfgtejtime.supabase.co';
const SUPABASE_KEY = 'TON_API_KEY'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CACHE_DURATION = 60 * 60 * 1000;

// --- 2. UI HANDLERS (Menu, Date) ---
function initUI() {
    // Gestion du menu mobile/sections
    const btnOpen = document.getElementById('btnOpenMenu');
    const btnClose = document.getElementById('closeMenu');
    const fullMenu = document.getElementById('fullMenu');

    if (btnOpen) btnOpen.onclick = () => fullMenu.classList.add('open');
    if (btnClose) btnClose.onclick = () => fullMenu.classList.remove('open');

    updateDate();
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const liveDate = document.getElementById('live-date');
    if (liveDate) liveDate.textContent = new Date().toLocaleDateString('fr-FR', options).toUpperCase();
}

// --- 3. FETCHING DATA ---
async function fetchAllContent(category = 'top', query = '') {
    const status = document.getElementById('status-line');
    if (status) status.textContent = "CHARGEMENT...";

    try {
        let queryBuilder = supabaseClient.from('articles').select('*').eq('is_published', true);
        
        if (category !== 'top') queryBuilder = queryBuilder.eq('category', category);
        if (query) queryBuilder = queryBuilder.or(`titre.ilike.%${query}%,description.ilike.%${query}%`);

        const { data, error } = await queryBuilder.order('created_at', { ascending: false });

        if (data) {
            renderGrid(data);
            if (status) status.textContent = "ÉDITION ACTUALISÉE";
        }
    } catch (e) {
        console.error(e);
    }
}

function renderGrid(articles) {
    const hero = document.getElementById('hero-zone');
    const grid = document.getElementById('news-grid');

    if (articles.length > 0) {
        const h = articles[0];
        hero.innerHTML = `
            <div class="hero-container" onclick="location.href='redaction.html?id=${h.id}'">
                <div class="hero-text">
                    <h1>${h.titre}</h1>
                    <p>${(h.description || "").substring(0, 160)}...</p>
                </div>
                <div class="hero-img"><img src="${h.image_url}"></div>
            </div>`;
        
        grid.innerHTML = articles.slice(1, 7).map(art => `
            <div class="article-card" onclick="location.href='redaction.html?id=${art.id}'">
                <img src="${art.image_url}">
                <h3>${art.titre}</h3>
            </div>`).join('');
    }
}

// --- 4. INITIALISATION ---
window.onload = () => {
    initUI();
    fetchAllContent('top');
    // Ajoute ici tes autres fonctions (fetchVideos, etc.)
};
