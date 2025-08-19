// --- All Helper Functions for this page ---
let allAnimeData = [];

async function loadSearchData() {
    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();
        allAnimeData = data.collection || [];
    } catch (error) { console.error("Could not load anime data for search:", error); }
}

function setupAzLinks() {
    const container = document.getElementById('az-list'); if (!container) return;
    let html = '<a href="./search.html?query=">All</a><a href="./search.html?query=%23">#</a>';
    for (let i = 65; i <= 90; i++) { const letter = String.fromCharCode(i); html += `<a href="./search.html?query=${letter}">${letter}</a>`; }
    container.innerHTML = html;
}

function setupRandomAnimeButton() {
    const randomBtn = document.getElementById('random-anime-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (allAnimeData && allAnimeData.length > 0) {
                const randomAnime = allAnimeData[Math.floor(Math.random() * allAnimeData.length)];
                window.location.href = `./anime.html?id=${randomAnime.id}`;
            }
        });
    }
}

function setupLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    if (!langToggle) return;
    const langOptions = langToggle.querySelectorAll('.lang-option');
    let currentLang = localStorage.getItem('preferredLanguage') || 'en';
    function updateTitles() {
        const titleElements = document.querySelectorAll('[data-en][data-jp]');
        titleElements.forEach(el => {
            const newText = el.dataset[currentLang] || el.dataset['en'];
            if (el.textContent !== newText) { el.textContent = newText; }
        });
        langOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === currentLang);
        });
    }
    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentLang = option.dataset.lang;
            localStorage.setItem('preferredLanguage', currentLang);
            updateTitles();
        });
    });
    const observer = new MutationObserver(() => updateTitles());
    const mainContent = document.getElementById('main-content');
    if(mainContent) observer.observe(mainContent, { childList: true, subtree: true });
    updateTitles();
}

function RefreshLazyLoader() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const lazyImage = entry.target;
                lazyImage.src = lazyImage.dataset.src;
                lazyImage.classList.remove('lzy_img');
                observer.unobserve(lazyImage);
            }
        });
    });
    document.querySelectorAll("img.lzy_img").forEach((v) => imageObserver.observe(v));
}

// --- Main Script ---
document.addEventListener('DOMContentLoaded', async function () {
    loadSearchData().then(setupRandomAnimeButton);
    setupAzLinks();
    setupLanguageToggle();

    const urlParams = new URLSearchParams(window.location.search);
    const animeId = parseInt(urlParams.get('id'));
    if (!animeId) { window.location.href = './index.html'; return; }

    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();
        const anime = data.collection.find(a => a.id === animeId);
        if (anime) loadAnimeDetails(anime, data.popular);
        else throw new Error('Anime not found in local data.');
    } catch (error) {
        console.error('Failed to load local anime data:', error);
        document.getElementById("main-content").innerHTML = `<div style="text-align:center; margin-top: 50px;"><h2>Error Loading Anime</h2><p>${error.message}</p></div>`;
        document.getElementById("load").style.display = "none";
        document.getElementById("main-content").style.display = "block";
    }
});

function loadAnimeDetails(anime, popularList) {
    const titleEn = anime.title.english || anime.title.userPreferred;
    const titleJp = anime.title.userPreferred;
    document.title = `Watch ${titleEn} - AnimeDex`;

    // Banner, Poster, and Main Info
    document.getElementById('anime-banner').style.backgroundImage = `url(${anime.bannerImage || anime.coverImage.large})`;
    document.getElementById('poster-img').src = anime.coverImage.large;
    const titleEl = document.querySelector('.anime-title');
    titleEl.textContent = titleEn;
    titleEl.dataset.en = titleEn;
    titleEl.dataset.jp = titleJp;
    document.querySelector('.synopsis').innerHTML = anime.description || 'No synopsis available.';
    
    const watchBtn = document.getElementById('watch-btn');
    if (anime.episodesList && anime.episodesList.length > 0) {
        watchBtn.href = `./episode.html?id=${anime.id}&ep=1`;
    } else { watchBtn.style.display = 'none'; }

    const metaTagsContainer = document.getElementById('meta-tags');
    metaTagsContainer.innerHTML = `<span class="score"><i class="fas fa-star"></i> ${anime.score || 'N/A'}</span><span>${anime.format}</span><span>${anime.status}</span><span>EP ${anime.episodes || '?'}</span>`;
    
    const detailsContainer = document.getElementById('details-block');
    detailsContainer.innerHTML = `<h4>Information</h4><ul><li><strong>Japanese:</strong> <span>${anime.title.native || 'N/A'}</span></li><li><strong>Synonyms:</strong> <span>${(anime.synonyms || []).join(', ') || 'N/A'}</span></li><li><strong>Aired:</strong> <span>${anime.aired || 'N/A'}</span></li><li><strong>Premiered:</strong> <span>${anime.premiered || 'N/A'}</span></li><li><strong>Duration:</strong> <span>${anime.duration ? anime.duration + ' min' : 'N/A'}</span></li><li><strong>Status:</strong> <span>${anime.status || 'N/A'}</span></li><li><strong>Genres:</strong> <span>${(anime.genres || []).map(g => `<a href="./search.html?query=${g}">${g}</a>`).join(', ')}</span></li><li><strong>Studios:</strong> <span>${(anime.studios || []).join(', ') || 'N/A'}</span></li></ul>`;
    
    const charactersContainer = document.querySelector('.character-carousel');
    if (anime.characters && anime.characters.length > 0) {
        charactersContainer.innerHTML = anime.characters.map(c => {
            const va = c.voiceActors[0];
            return `<div class="cva-card"><div class="cva-entry"><img class="lzy_img" src="./static/loading1.gif" data-src="${c.node.image.large}"><div><div class="cva-name">${c.node.name.full}</div><div class="cva-role">${c.role}</div></div></div>${va ? `<div class="cva-entry voice-actor"><div><div class="cva-name">${va.name.full}</div><div class="cva-role">Japanese</div></div><img class="lzy_img" src="./static/loading1.gif" data-src="${va.image.large}"></div>` : ''}</div>`;
        }).join('');
    } else { document.getElementById('characters-section').style.display = 'none'; }
    
    if (anime.trailer && anime.trailer.site === 'youtube') { document.getElementById('trailer-container').innerHTML = `<iframe src="https://www.youtube.com/embed/${anime.trailer.id}" allowfullscreen></iframe>`;
    } else { document.getElementById('trailer-section').style.display = 'none'; }

    const recommendationsContainer = document.querySelector('.recommendations-carousel');
    if (anime.recommendations && anime.recommendations.length > 0) {
        recommendationsContainer.innerHTML = anime.recommendations.map(rec => `<a href="./anime.html?id=${rec.id}" class="poster la-anime"><div class="shadow"><img class="lzy_img" src="./static/loading1.gif" data-src="${rec.coverImage.large}"></div><div class="la-details"><h3 data-en="${rec.title.userPreferred}" data-jp="${rec.title.userPreferred}">${rec.title.userPreferred}</h3></div></a>`).join('');
    } else { document.getElementById('recommendations-section').style.display = 'none'; }
    
    const relationsContainer = document.querySelector('.related-anime-list');
    const toggleBtn = document.getElementById('toggle-related-btn');
    const validFormats = ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'];
    const filteredRelations = (anime.relations || []).filter(rel => validFormats.includes(rel.node.format));

    if (filteredRelations.length > 0) {
        relationsContainer.innerHTML = filteredRelations.map(rel => `<a href="./anime.html?id=${rel.node.id}" class="related-item"><img class="lzy_img" src="./static/loading1.gif" data-src="${rel.node.coverImage.large}"><div class="related-item-info"><h5>${rel.node.title.userPreferred}</h5><p>${rel.relationType.replace(/_/g, ' ')} • ${rel.node.format}</p></div></a>`).join('');
        if (filteredRelations.length > 5) {
            relationsContainer.classList.add('collapsed');
            toggleBtn.style.display = 'block';
            toggleBtn.textContent = 'Show More';
            toggleBtn.onclick = () => {
                relationsContainer.classList.toggle('collapsed');
                toggleBtn.textContent = relationsContainer.classList.contains('collapsed') ? 'Show More' : 'Show Less';
            };
        }
    } else { document.getElementById('related-anime-section').style.display = 'none'; }

    const popularContainer = document.querySelector('.popular-anime-list');
    if(popularList && popularList.length > 0) {
        popularContainer.innerHTML = popularList.slice(0, 10).map(pop => `<a href="./anime.html?id=${pop.id}" class="related-item"><img class="lzy_img" src="./static/loading1.gif" data-src="${pop.coverImage.large}"><div class="related-item-info"><h5>${pop.title.userPreferred}</h5><p>${pop.format} • ⭐ ${pop.score || 'N/A'}</p></div></a>`).join('');
    } else { document.getElementById('popular-anime-section').style.display = 'none'; }

    document.getElementById('load').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    RefreshLazyLoader();
}