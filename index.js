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

// --- Main Script ---
document.addEventListener('DOMContentLoaded', async function () {
    setupAzLinks();
    loadSearchData();
    setupRandomAnimeButton();
    setupLanguageToggle();
    
    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();

        if (data.slider) await getSlider(data.slider);
        if (data.trending) await populateCarousel(data.trending, ".trending-carousel");
        if (data.popular) await populateCarousel(data.popular, ".popular-carousel");
        if (data.most_favorite) await populateCarousel(data.most_favorite, ".favorite-carousel");
        if (data.recent_added) await populateCarousel(data.recent_added, ".recent-carousel");
        if (data.collection) {
            const top10 = [...data.collection].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
            await populateTopList(top10, ".top-100-list");
        }
        
        document.getElementById('load').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        RefreshLazyLoader();
        setupTooltipHoverFix();
        
    } catch (error) {
        console.error("Failed to load section data:", error);
        document.getElementById('load').innerHTML = `<p>Error loading data. Please try again later.</p>`;
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
    const mainContent = document.getElementById('main-content');
    if(mainContent) observer.observe(mainContent, { childList: true, subtree: true });
    
    updateTitles();
}


async function populateCarousel(animeList, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    let html = "";
    animeList.forEach(anime => {
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
    container.innerHTML = html;
}

async function getSlider(data) {
    const container = document.querySelector(".slideshow-container");
    if (!container) return;
    let SLIDER_HTML = "";
    data.forEach(anime => {
        let plainTextDesc = (anime.description || '').replace(/<[^>]*>?/gm, '');
        let description = plainTextDesc.length > 250 ? plainTextDesc.substring(0, 250) + '...' : plainTextDesc;
        const titleEn = anime.title.english || anime.title.userPreferred;
        const titleJp = anime.title.userPreferred;
        SLIDER_HTML += `
            <div class="mySlides">
                <div class="data-slider">
                    <h1 data-en="${titleEn}" data-jp="${titleJp}"></h1>
                    <p class="small-synop">${description}</p>
                    <div id="watchh"><a href="./anime.html?id=${anime.id}" class="watch-btn"><i class="fa fa-play-circle"></i> Watch Now</a></div>
                </div>
                <div class="shado"></div>
                <img src="${anime.bannerImage || anime.coverImage.large}">
            </div>`;
    });
    container.innerHTML = SLIDER_HTML + '<a class="prev" onclick="plusSlides(-1)">❮</a><a class="next" onclick="plusSlides(1)">❯</a>';
    showSlides(1);
}
async function populateTopList(animeList, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    let html = "";
    animeList.forEach((anime, index) => {
        if (!anime || !anime.title) {
            // Skip this anime if it's missing essential data
            return;
        }

        const scorePercent = anime.score ? Math.round((anime.score / 10) * 100) : 'N/A';
        const genresHTML = (anime.genres || []).slice(0, 3).map(g => `<div class="genre-tag">${g}</div>`).join('');
        
        const titleEn = anime.title.english || anime.title.userPreferred || anime.title.romaji || 'No Title Available';
        const titleJp = anime.title.userPreferred || anime.title.romaji || 'No Title Available';
        
        const year = anime.seasonYear || (anime.premiered ? anime.premiered.split(' ')[1] : 'N/A');
        const status = anime.status || 'N/A';
        const format = anime.format || 'N/A';
        const episodes = anime.episodes || '??';

        html += `
            <a href="./anime.html?id=${anime.id}" class="list-item">
                <div class="rank">#${index + 1}</div>
                <img class="item-cover lzy_img" src="./static/loading1.gif" data-src="${anime.coverImage.large}">
                <div class="item-details">
                    <h3 data-en="${titleEn}" data-jp="${titleJp}">${titleEn}</h3>
                    <div class="item-genres">${genresHTML}</div>
                </div>
                <div class="item-stats">
                    <div class="stat-item score">
                        <span class="value">${scorePercent}%</span>
                        <span class="label">${(anime.views && anime.views.monthly ? anime.views.monthly : 0).toLocaleString()} users</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${format}</span>
                        <span class="label">${episodes} episodes</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${year}</span>
                        <span class="label">${status}</span>
                    </div>
                </div>
            </a>`;
    });
    container.innerHTML = html;
}
let slideIndex = 1;
let slideTimeout;
function plusSlides(n) { clearTimeout(slideTimeout); showSlides(slideIndex += n); }
function showSlides(n) {
  let slides = document.getElementsByClassName("mySlides");
  if (!slides || slides.length === 0) return;
  if (n > slides.length) { slideIndex = 1; }
  if (n < 1) { slideIndex = slides.length; }
  let currentActive = document.querySelector(".mySlides.active");
  if (currentActive) {
      currentActive.classList.remove('active', 'slide-in');
      currentActive.classList.add('slide-out');
      setTimeout(() => {
          if (currentActive) currentActive.style.display = "none";
          currentActive.classList.remove('slide-out');
      }, 750);
  }
  let newSlide = slides[slideIndex - 1];
  if(newSlide) {
      newSlide.style.display = "flex";
      newSlide.classList.add('active', 'slide-in');
  }
  slideTimeout = setTimeout(() => plusSlides(1), 5000);
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
function setupTooltipHoverFix() {
    const carousels = document.querySelectorAll('.anime-carousel');

    carousels.forEach(carousel => {
        const posters = carousel.querySelectorAll('.poster-container');
        posters.forEach(poster => {
            poster.addEventListener('mouseenter', () => {
                carousel.classList.add('is-tooltip-active');
                document.body.classList.add('is-tooltip-locked');
            });
            poster.addEventListener('mouseleave', () => {
                carousel.classList.remove('is-tooltip-active');
                document.body.classList.remove('is-tooltip-locked');
            });
        });
    });
}