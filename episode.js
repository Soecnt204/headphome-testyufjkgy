document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = parseInt(urlParams.get('id'));
    const episodeNumber = urlParams.get('ep');

    if (!animeId || !episodeNumber) {
        window.location.href = './index.html';
        return;
    }

    try {
        const response = await fetch('./anime_data.json');
        const data = await response.json();
        const allAnime = [...(data.trending || []), ...(data.popular || []), ...(data.recent || [])];
        const anime = allAnime.find(a => a.id === animeId);
        const episode = anime.episodesList.find(e => e.number == episodeNumber);

        if (episode) {
            document.title = `Watch ${anime.title.userPreferred} Episode ${episode.number} - AnimeDex`;
            document.querySelector('meta[name="title"]').setAttribute("content", `Watch ${anime.title.userPreferred} Episode ${episode.number} - AnimeDex`);

            document.getElementById('ep-name').innerHTML = `<h1>${anime.title.userPreferred} - Episode ${episode.number}</h1>`;
            document.getElementById('AnimeDexFrame').src = episode.url;

            // Episode List
            const episodesContainer = document.getElementById("ep-lower-div");
            anime.episodesList.forEach(ep => {
                const epElement = document.createElement('a');
                epElement.href = `./episode.html?id=${anime.id}&ep=${ep.number}`;
                epElement.textContent = ep.number;
                epElement.classList.add('ep-btn');
                if (ep.number == episodeNumber) {
                    epElement.classList.add('ep-btn-playing');
                }
                episodesContainer.appendChild(epElement);
            });
            
            document.getElementById('load').style.display = 'none';
            document.getElementById('main-section').style.display = 'block';
            document.getElementById('main-section').style.opacity = 1;

        } else {
             throw new Error('Episode not found in local data.');
        }
    } catch (error) {
        console.error('Failed to load local episode data:', error);
        document.getElementById("error-page").style.display = "block";
        document.getElementById("load").style.display = "none";
        document.getElementById("main-section").style.display = "none";
        document.getElementById("error-desc").innerHTML = error;
    }
});

// --- All the code from the previous step remains the same ---
// ... (DOMContentLoaded, scrollCarousel, setupAzLinks, getSlider, etc.)

// --- ADD THIS NEW SECTION FOR SEARCH SUGGESTIONS ---
const searchInput = document.getElementById('query');
const searchResultsList = document.getElementById('search-results-list');
let allAnimeData = []; // To store anime data for searching

// Fetch data once for search
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
    searchResultsList.innerHTML = ''; // Clear previous results

    if (query.length < 3) { // Only search if query is 3 or more characters
        return;
    }

    const results = allAnimeData.filter(anime => {
        const title = anime.title.userPreferred?.toLowerCase() || '';
        const englishTitle = anime.title.english?.toLowerCase() || '';
        return title.includes(query) || englishTitle.includes(query);
    }).slice(0, 7); // Show max 7 results

    if (results.length > 0) {
        results.forEach(anime => {
            const resultItem = document.createElement('a');
            resultItem.href = `./anime.html?id=${anime.id}`;
            resultItem.innerHTML = `
                <img src="${anime.coverImage.large}" alt="">
                <span class="title">${anime.title.userPreferred}</span>
            `;
            searchResultsList.appendChild(resultItem);
        });
    }
});

// Hide search results when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.search-container')) {
        searchResultsList.innerHTML = '';
    }
});


// --- MAIN SCRIPT ---
document.addEventListener('DOMContentLoaded', async function () {
    loadSearchData(); // Pre-load data for search suggestions

    if (window.location.protocol === 'file:') {
        document.getElementById('load').innerHTML = `<strong style="color: #ed3832;">Error: Files Cannot Be Loaded Directly.</strong><br><br>You must run this project on a local server. If you are using VS Code, right-click on <strong>index.html</strong> and select "Open with Live Server".`;
        return;
    }
    try {
        const response = await fetch('./anime_data.json');
        if (!response.ok) throw new Error(`Failed to fetch anime_data.json`);
        const data = await response.json();

        if (data.slider) await getSlider(data.slider);
        if (data.trending) await populateCarousel(data.trending, ".trending-carousel");
        if (data.popular) await populateCarousel(data.popular, ".popular-carousel");
        // ... (rest of the populateCarousel calls)

        const genres = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi", "Romance", "Mystery"];
        await getGenres(genres);
        setupAzLinks();
        document.getElementById('load').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        RefreshLazyLoader();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('load').innerHTML = `<strong>Error:</strong> Failed to load anime data.`;
    }
});
// ... (The rest of your functions: scrollCarousel, setupAzLinks, getSlider, etc. remain here)