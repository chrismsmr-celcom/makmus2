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
    document.body.style.overflow = show ? 'hidden' : 'auto';
};

window.toggleSidePanel = (isOpen) => {
    const panel = document.getElementById('sideAccount');
    if (panel) panel.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
};

/* ==========================================================================
   3. MOTEUR DE NEWS (Articles & Recherche)
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
            gridZone.innerHTML = "<p>Aucun article trouvé.</p>";
            return;
        }

        const main = data[0];
        heroZone.innerHTML = `
            <div class="main-card" onclick="window.location.href='redaction.html?id=${main.id}'">
                <img src="${main.image_url}" alt="">
                <div class="main-card-content">
                    <span class="category-badge">${main.tags || 'INFO'}</span>
                    <h1>${main.titre}</h1>
                </div>
            </div>`;

        gridZone.innerHTML = data.slice(1).map(art => `
            <div class="news-card" onclick="window.location.href='redaction.html?id=${art.id}'">
                <img src="${art.image_url}" alt="">
                <div class="news-card-body">
                    <span class="category-badge">${art.tags || 'NEWS'}</span>
                    <h3>${art.titre}</h3>
                </div>
            </div>`).join('');
    } catch (e) { console.error("News Engine Error:", e); }
};

/* ==========================================================================
   4. TAGS TENDANCES (Corrigé pour colonne 'tags')
   ========================================================================== */
window.loadAutoTrendingTags = async function() {
    const tagContainer = document.getElementById('trending-tags');
    if (!tagContainer) return;
    try {
        // CORRECTION : On sélectionne la colonne 'tags'
        const { data, error } = await supabaseClient.from('articles').select('tags');
        if (error) throw error;

        const counts = {};
        data.forEach(a => {
            if (a.tags) {
                const val = a.tags.trim();
                counts[val] = (counts[val] || 0) + 1;
            }
        });

        const sorted = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 6);
        tagContainer.innerHTML = sorted.map(tag => 
            `<span class="tag-badge" onclick="fetchMakmusNews('${tag}')">#${tag}</span>`
        ).join('');
    } catch (e) { console.warn("Tags error:", e.message); }
};

/* ==========================================================================
   5. VIDÉOS & PUBS
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
    if (!container) return;
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
            </div>`).join('') : "<p>Aucun résultat.</p>";
    } catch (e) { console.warn("Sport error"); }
};

window.fetchMarketData = async function() {
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
        const data = await res.json();
        const ticker = document.getElementById('ticker-rates');
        if (ticker && data.conversion_rates) {
            ticker.innerHTML = `<span>🇺🇸 USD/CDF : ${data.conversion_rates['CDF']}</span> | <span>🇪🇺 EUR/USD : 1.08</span>`;
        }
    } catch (e) { console.warn("Ticker error"); }
};

/* ==========================================================================
   7. INITIALISATION GÉNÉRALE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Date
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).toUpperCase();
    }

    // 2. Lancement immédiat des articles
    window.fetchMakmusNews();

    // 3. Lancement différé pour éviter la saturation
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
});
