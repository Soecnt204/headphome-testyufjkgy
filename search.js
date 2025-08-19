// A-Z List Generator
function setupAzLinks() {
    const container = document.getElementById('az-list');
    if (!container) return;
    let html = '<a href="./search.html?query=">All</a><a href="./search.html?query=%23">#</a>';
    for (let i = 65; i <= 90; i++) { // ASCII A-Z
        const letter = String.fromCharCode(i);
        html += `<a href="./search.html?query=${letter}">${letter}</a>`;
    }
    container.innerHTML = html;
}

// --- Search Suggestions Logic ---
const searchInput = document.getElementById('query');
const searchResultsList = document.getElementById('search-results-list');
let allAnimeData = [];

async function loadSearchData() {
    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();
        allAnimeData = data.collection || [];
    } catch (error) {
        console.error("Could not load anime data for search:", error);
    }
}

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    searchResultsList.innerHTML = '';
    if (query.length < 3) {
        searchResultsList.style.display = 'none';
        return;
    }
    const results = allAnimeData.filter(anime => {
        const title = anime.title.userPreferred?.toLowerCase() || '';
        const englishTitle = anime.title.english?.toLowerCase() || '';
        return title.includes(query) || englishTitle.includes(query);
    }).slice(0, 7);
    if (results.length > 0) {
        searchResultsList.style.display = 'block';
        results.forEach(anime => {
            const resultItem = document.createElement('a');
            resultItem.href = `./anime.html?id=${anime.id}`;
            resultItem.innerHTML = `<img src="${anime.coverImage.large}" alt=""><span class="title">${anime.title.userPreferred}</span>`;
            searchResultsList.appendChild(resultItem);
        });
    } else {
        searchResultsList.style.display = 'none';
    }
});

document.addEventListener('click', function(event) {
    if (!event.target.closest('.search-container')) {
        searchResultsList.style.display = 'none';
    }
});

function setupRandomAnimeButton() {
    const randomBtn = document.getElementById('random-anime-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (allAnimeData && allAnimeData.length > 0) {
                const randomIndex = Math.floor(Math.random() * allAnimeData.length);
                const randomAnime = allAnimeData[randomIndex];
                window.location.href = `./anime.html?id=${randomAnime.id}`;
            } else {
                alert('Anime data not loaded yet. Please wait a moment and try again.');
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
            const newText = el.dataset[currentLang] || el.dataset['en']; // Fallback to EN
            // *** FIX: Only update the text if it's different to prevent infinite loops ***
            if (el.textContent !== newText) {
                el.textContent = newText;
            }
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
    const mainContent = document.getElementById('main-section');
    if(mainContent) observer.observe(mainContent, { childList: true, subtree: true });
    
    updateTitles();
}


// --- Main Page Logic ---
document.addEventListener('DOMContentLoaded', async function () {
    setupAzLinks();
    loadSearchData(); 
    setupRandomAnimeButton();
    setupLanguageToggle();

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    const resultsContainer = document.getElementById('latest2');

    if (query === null) return;

    document.getElementById('query').value = query;
    
    const rankedLists = ['trending', 'popular', 'most_favorite', 'recent_added'];
    const isRanked = rankedLists.includes(query);
    const isViewAll = isRanked || query === 'top-100' || query === '';
    
    const heading = document.getElementById("latest");
    if(isViewAll) {
        heading.style.display = 'block';
        heading.innerHTML = `View All: ${query.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    } else {
         heading.innerHTML = `Results for: "${query}"`;
    }

    const badgeColors = ['#8bc34a', '#e91e63', '#3f51b5', '#cddc39', '#ff9800', '#00bcd4', '#ff5722', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ffeb3b'];

    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();
        let allResults = [];

        if (data[query]) {
            allResults = data[query];
        } else if (query === 'top-100' || query === '') {
            allResults = [...data.collection].sort((a, b) => (b.score || 0) - (a.score || 0));
        } else if (query === '#') {
            allResults = (data.collection || []).filter(anime => !/^[A-Z]/i.test(anime.title.userPreferred?.charAt(0)));
        } else if (query.length === 1 && query.match(/[A-Z]/i)) {
             allResults = (data.collection || []).filter(anime => 
                (anime.title.userPreferred && anime.title.userPreferred.toUpperCase().startsWith(query.toUpperCase())) ||
                (anime.title.english && anime.title.english.toUpperCase().startsWith(query.toUpperCase()))
             );
        } else {
            const queryLower = query.toLowerCase();
            allResults = (data.collection || []).filter(anime => {
                const title = anime.title.userPreferred?.toLowerCase() || '';
                const englishTitle = anime.title.english?.toLowerCase() || '';
                return title.includes(queryLower) || englishTitle.includes(queryLower);
            });
        }

        if (allResults.length === 0) throw new Error(`No results found for "${query}".`);

        let html = "";
        allResults.forEach((anime, index) => {
            const color = badgeColors[index % badgeColors.length];
        const rankBadge = isRanked ? `<div class="rank-badge" style="background-color: ${color};">#${index + 1}</div>` : '';
        let plainTextDesc = (anime.description || '').replace(/<[^>]*>?/gm, '');
        let synopsis = plainTextDesc.length > 120 ? plainTextDesc.substring(0, 120) + '...' : plainTextDesc;
        const score = anime.score ? (anime.score / 10).toFixed(1) : "N/A";
        const year = anime.seasonYear || '';
        const status = anime.status || 'N/A';
        const genresHTML = (anime.genres || []).slice(0, 3).map(g => `<span>${g}</span>`).join(', ');
        const titleEn = anime.title.english || anime.title.userPreferred;
        const titleJp = anime.title.userPreferred;

        html += `
            <a href="./anime.html?id=${anime.id}" class="poster-container">
                <div class="poster la-anime">
                    ${rankBadge}
                    <div class="shadow"><img class="lzy_img" src="./static/loading1.gif" data-src="${anime.coverImage.large}"></div>
                    <div class="la-details">
                        <h3 data-en="${titleEn}" data-jp="${titleJp}"></h3>
                        <span class="sub-title">${year}</span>
                    </div>
                </div>

                <div class="tooltip">
                    <div class="tooltip-bg-img" style="background-image: url('${anime.bannerImage || anime.coverImage.large}')"></div>
                    <div class="tooltip-content">
                         <h3 class="tooltip-title" data-en="${titleEn}" data-jp="${titleJp}"></h3>
                        <div class="tooltip-meta">
                            <span class="meta-item rating">⭐ ${score}</span>
                            <span class="meta-item">HD</span>
                            <span class="meta-item"><i class="fas fa-closed-captioning"></i> ${anime.episodes || '?'}</span>
                            <span class="meta-item format">${anime.format}</span>
                        </div>
                        <p class="tooltip-synopsis">${synopsis}</p>
                        <div class="tooltip-details">
                            <p><strong>Other:</strong> ${anime.title.english || 'N/A'}</p>
                            <p><strong>Aired:</strong> ${anime.aired || 'N/A'}</p>
                            <p><strong>Status:</strong> ${status}</p>
                            <p><strong>Genres:</strong> ${genresHTML}</p>
                        </div>
                        <div class="tooltip-actions">
                            <div class="watch-now-btn"><i class="fas fa-play"></i> Watch now</div>
                            <button class="add-btn">+</button>
                        </div>
                    </div>
                </div>
            </a>`;
        });
        
        resultsContainer.innerHTML = html;
        document.getElementById('load').style.display = 'none';
        resultsContainer.style.display = 'grid';
        RefreshLazyLoader();

    } catch (error) {
        console.error('Failed to search anime data:', error);
        document.getElementById("main-section").style.display = "none";
        document.getElementById("error-page").style.display = "block";
        document.getElementById("error-desc").innerHTML = error;
    }
});

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