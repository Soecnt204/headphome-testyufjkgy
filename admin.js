document.addEventListener('DOMContentLoaded', function () {
    const animeForm = document.getElementById('anime-form');
    const fetchButton = document.getElementById('fetch-button');
    const anilistIdInput = document.getElementById('anilist-id');
    const malIdInput = document.getElementById('mal-id');
    const fetchAnilistByYearButton = document.getElementById('fetch-anilist-by-year-button');
    const anilistYearInput = document.getElementById('anilist-year-input');
    const fetchMalByYearButton = document.getElementById('fetch-mal-by-year-button');
    const malYearInput = document.getElementById('mal-year-input');
    const episodesContainer = document.getElementById('episodes-container');
    const addEpisodeButton = document.getElementById('add-episode');
    const animeListContainer = document.getElementById('anime-list');
    const downloadButton = document.getElementById('download-button');
    const feedbackMessage = document.getElementById('feedback-message');
    
    let animeCollection = [];
    let latestEpisodes = [];

    // Load existing data from anime_data.json
    fetch('./anime_data.json')
        .then(response => response.ok ? response.json() : { collection: [], latest_episodes: [] })
        .then(data => {
            animeCollection = data.collection || [];
            latestEpisodes = data.latest_episodes || [];
            renderAnimeList();
        })
        .catch(() => renderAnimeList());

    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const JIKAN_API_URL = 'https://api.jikan.moe/v4/anime';

    fetchButton.addEventListener('click', async function () {
        const anilistId = anilistIdInput.value;
        const malId = malIdInput.value;
        if (!anilistId) return;
        feedbackMessage.textContent = 'Fetching from AniList and MAL...';

        try {
            const [aniListData, jikanData] = await Promise.all([
                fetchAniListById(anilistId),
                malId ? fetchJikanById(malId) : Promise.resolve(null)
            ]);

            if (aniListData) {
                fillForm(aniListData, jikanData);
                feedbackMessage.textContent = `Successfully fetched "${aniListData.title.userPreferred}"!`;
                setTimeout(() => feedbackMessage.textContent = '', 4000);
            } else {
                throw new Error(`Anime with ID "${anilistId}" was not found on AniList.`);
            }
        } catch (error) {
            feedbackMessage.textContent = `Error: ${error.message}`;
        }
    });

    fetchAnilistByYearButton.addEventListener('click', async function () {
        const year = anilistYearInput.value;
        if (!year) return;
        feedbackMessage.textContent = `Fetching anime from ${year} from AniList...`;
        try {
            const animeList = await fetchAllAniListByYear(year);
            const formattedAnimeList = animeList.map(anilistData => formatAnilistData(anilistData));

            formattedAnimeList.forEach(anime => {
                if (!animeCollection.some(a => a.id === anime.id)) {
                    animeCollection.push(anime);
                }
            });
            renderAnimeList();
            feedbackMessage.textContent = `Successfully fetched ${animeList.length} anime from ${year}!`;
            setTimeout(() => feedbackMessage.textContent = '', 4000);
        } catch (error) {
            feedbackMessage.textContent = `Error: ${error.message}`;
        }
    });

    fetchMalByYearButton.addEventListener('click', async function () {
        const year = malYearInput.value;
        if (!year) return;
        feedbackMessage.textContent = `Fetching anime from ${year} from MAL...`;
        try {
            const animeList = await fetchAllJikanByYear(year);
            const formattedAnimeList = animeList.map(jikanData => {
                return {
                    id: jikanData.mal_id,
                    score: jikanData.score,
                    title: {
                        userPreferred: jikanData.title,
                        english: jikanData.title_english,
                        native: jikanData.title_japanese
                    },
                    synonyms: jikanData.title_synonyms,
                    description: jikanData.synopsis,
                    coverImage: { large: jikanData.images.jpg.large_image_url },
                    bannerImage: '',
                    genres: jikanData.genres.map(g => g.name),
                    status: jikanData.status,
                    format: jikanData.type,
                    episodes: jikanData.episodes,
                    duration: jikanData.duration,
                    premiered: jikanData.season,
                    aired: jikanData.aired.string,
                    studios: jikanData.studios.map(s => s.name),
                    producers: jikanData.producers.map(p => p.name),
                    views: { monthly: 0, weekly: 0, daily: 0 },
                    trailer: null,
                    characters: [],
                    relations: [],
                    recommendations: [],
                    episodesList: []
                };
            });

            formattedAnimeList.forEach(anime => {
                if (!animeCollection.some(a => a.id === anime.id)) {
                    animeCollection.push(anime);
                }
            });
            renderAnimeList();
            feedbackMessage.textContent = `Successfully fetched ${animeList.length} anime from ${year}!`;
            setTimeout(() => feedbackMessage.textContent = '', 4000);
        } catch (error) {
            feedbackMessage.textContent = `Error: ${error.message}`;
        }
    });
    
    // Helper function to format AniList data into the structure we need
    function formatAnilistData(anilistData) {
        const mainStudios = anilistData.studios.edges.filter(edge => edge.isMain).map(edge => edge.node.name);
        const studioNames = mainStudios.length > 0 ? mainStudios : anilistData.studios.edges.slice(0, 3).map(edge => edge.node.name);
        const formatDate = (date) => date && date.year ? `${date.month}/${date.day}/${date.year}` : '?';
        
        return {
            id: anilistData.id,
            score: anilistData.averageScore, // Use averageScore from AniList
            title: anilistData.title,
            synonyms: anilistData.synonyms,
            description: anilistData.description,
            coverImage: anilistData.coverImage,
            bannerImage: anilistData.bannerImage,
            genres: anilistData.genres,
            status: anilistData.status,
            format: anilistData.format,
            episodes: anilistData.episodes,
            duration: anilistData.duration,
            premiered: (anilistData.season ? anilistData.season.charAt(0) + anilistData.season.slice(1).toLowerCase() : '') + ' ' + (anilistData.seasonYear || ''),
            aired: `${formatDate(anilistData.startDate)} to ${formatDate(anilistData.endDate)}`,
            studios: studioNames,
            producers: [], // AniList API doesn't provide producers in the same way
            views: {
                monthly: anilistData.popularity || 0,
                weekly: (anilistData.popularity + (anilistData.trending * 2)) || 0,
                daily: anilistData.trending || 0
            },
            trailer: anilistData.trailer,
            characters: anilistData.characters.edges,
            relations: anilistData.relations.edges,
            recommendations: anilistData.recommendations.nodes.map(n => n.mediaRecommendation),
            episodesList: [] // Default to empty, will be added manually
        };
    }

    async function fetchAllAniListByYear(year) {
        let page = 1;
        let hasNextPage = true;
        const allMedia = [];

        while (hasNextPage) {
            feedbackMessage.textContent = `Fetching page ${page} from AniList...`;
            const graphqlQuery = `
            query ($year: Int, $page: Int) {
              Page(page: $page, perPage: 50) {
                pageInfo {
                  hasNextPage
                }
                media(seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
                  id
                  averageScore
                  title { romaji english native userPreferred }
                  synonyms
                  description(asHtml: false)
                  coverImage { large }
                  bannerImage
                  genres
                  episodes
                  status
                  format
                  duration
                  season
                  seasonYear
                  startDate { year month day }
                  endDate { year month day }
                  studios { edges { isMain node { name } } }
                  trailer { id site thumbnail }
                  characters(sort: ROLE, perPage: 10) { edges { role node { name { full } image { large } } voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { large } } } }
                  relations { edges { relationType node { id title { userPreferred } coverImage { large } format } } }
                  recommendations(sort: RATING_DESC, perPage: 10) { nodes { mediaRecommendation { id title { userPreferred } coverImage { large } format } } }
                  popularity
                  trending
                }
              }
            }
            `;
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: graphqlQuery, variables: { year: parseInt(year), page: page } })
            });
            const data = await response.json();
            allMedia.push(...data.data.Page.media);
            hasNextPage = data.data.Page.pageInfo.hasNextPage;
            page++;
        }
        return allMedia;
    }

    async function fetchAllJikanByYear(year) {
        let page = 1;
        let hasNextPage = true;
        const allData = [];

        while(hasNextPage) {
            feedbackMessage.textContent = `Fetching page ${page} from MAL...`;
            const response = await fetch(`${JIKAN_API_URL}?start_date=${year}-01-01&end_date=${year}-12-31&page=${page}`);
            if (!response.ok) break;
            const data = await response.json();
            allData.push(...data.data);
            hasNextPage = data.pagination.has_next_page;
            page++;
        }
        return allData;
    }

    async function fetchAniListById(id) {
        const graphqlQuery = `
        query ($id: Int) {
          Media (id: $id, type: ANIME) {
            id
            averageScore
            title { romaji english native userPreferred }
            synonyms
            description(asHtml: false)
            coverImage { large }
            bannerImage
            genres
            episodes
            status
            format
            duration
            season
            seasonYear
            startDate { year month day }
            endDate { year month day }
            studios { edges { isMain node { name } } }
            trailer { id site thumbnail }
            characters(sort: ROLE, perPage: 10) { edges { role node { name { full } image { large } } voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { large } } } }
            relations { edges { relationType node { id title { userPreferred } coverImage { large } format } } }
            recommendations(sort: RATING_DESC, perPage: 10) { nodes { mediaRecommendation { id title { userPreferred } coverImage { large } format } } }
            popularity
            trending
          }
        }
        `;
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: graphqlQuery, variables: { id: parseInt(id) } })
        });
        const data = await response.json();
        return data.data.Media;
    }

    async function fetchJikanById(id) {
        try {
            const response = await fetch(`${JIKAN_API_URL}/${id}/full`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Jikan API fetch failed, but continuing without extra data.", error);
            return null;
        }
    }

    function fillForm(anilistData, jikanData) {
        anilistIdInput.value = anilistData.id || '';
        document.getElementById('anime-title').value = anilistData.title.userPreferred || anilistData.title.romaji || '';
        document.getElementById('anime-title-english').value = anilistData.title.english || '';
        document.getElementById('anime-title-native').value = anilistData.title.native || '';
        document.getElementById('anime-synonyms').value = (anilistData.synonyms || []).join(', ');
        // Use Anilist score (it's out of 100, so divide by 10 for a 1-10 scale)
        document.getElementById('anime-score').value = anilistData.averageScore ? (anilistData.averageScore / 10).toFixed(2) : (jikanData ? jikanData.score : '');
        document.getElementById('anime-description').value = anilistData.description || '';
        document.getElementById('anime-cover').value = anilistData.coverImage.large || '';
        document.getElementById('anime-banner').value = anilistData.bannerImage || '';
        document.getElementById('anime-genres').value = (anilistData.genres || []).join(', ');
        document.getElementById('anime-episodes').value = anilistData.episodes || '';
        document.getElementById('anime-duration').value = anilistData.duration || '';
        document.getElementById('anime-status').value = anilistData.status || '';
        document.getElementById('anime-format').value = anilistData.format || '';
        
        const premiered = (anilistData.season ? anilistData.season.charAt(0) + anilistData.season.slice(1).toLowerCase() : '') + ' ' + (anilistData.seasonYear || '');
        document.getElementById('anime-premiered').value = premiered.trim();

        const formatDate = (date) => date && date.year ? `${date.month}/${date.day}/${date.year}` : '?';
        document.getElementById('anime-aired').value = `${formatDate(anilistData.startDate)} to ${formatDate(anilistData.endDate)}`;
        
        const mainStudios = anilistData.studios.edges.filter(edge => edge.isMain).map(edge => edge.node.name);
        const studioNames = mainStudios.length > 0 ? mainStudios : anilistData.studios.edges.slice(0, 3).map(edge => edge.node.name);
        document.getElementById('anime-studios').value = studioNames.join(', ');

        document.getElementById('anime-producers').value = (jikanData?.producers || []).map(p => p.name).join(', ');
        
        document.getElementById('monthly-views').value = anilistData.popularity || 0;
        document.getElementById('weekly-views').value = (anilistData.popularity + (anilistData.trending * 2)) || 0;
        document.getElementById('daily-views').value = anilistData.trending || 0;
    }
    
    addEpisodeButton.addEventListener('click', () => addEpisodeField());

    function addEpisodeField(number = '', url = '') {
        const episodeCount = episodesContainer.children.length + 1;
        const episodeItem = document.createElement('div');
        episodeItem.classList.add('episode-item');
        episodeItem.innerHTML = `
            <input type="text" placeholder="Ep Number" value="${number || episodeCount}" class="episode-number">
            <input type="text" placeholder="Embed URL" value="${url}" class="episode-url">
            <button type="button" class="remove-episode">-</button>
        `;
        episodeItem.querySelector('.remove-episode').addEventListener('click', () => episodeItem.remove());
        episodesContainer.appendChild(episodeItem);
    }

    animeForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const animeId = parseInt(anilistIdInput.value);
        if (!animeId) {
            feedbackMessage.textContent = "Error: Please fetch an anime by ID before saving.";
            return;
        }
        
        // We re-fetch here to get the full, clean data object from the API
        // This avoids any potential issues with manipulated form fields
        const aniListData = await fetchAniListById(animeId);
        if (!aniListData) {
            feedbackMessage.textContent = "Error: Could not re-fetch anime data to save.";
            return;
        }

        const newAnime = formatAnilistData(aniListData);

        // Overwrite the episodesList with the one from the form
        newAnime.episodesList = Array.from(episodesContainer.querySelectorAll('.episode-item')).map(item => ({
            number: item.querySelector('.episode-number').value,
            url: item.querySelector('.episode-url').value
        }));
        
        const isLatestEpisode = document.getElementById('latest-episode-checkbox').checked;

        const existingIndex = animeCollection.findIndex(a => a.id === newAnime.id);
        if (existingIndex > -1) {
            animeCollection[existingIndex] = newAnime;
        } else {
            animeCollection.push(newAnime);
        }

        latestEpisodes = latestEpisodes.filter(a => a.id !== newAnime.id);
        if(isLatestEpisode) {
            latestEpisodes.push(newAnime);
        }
        
        renderAnimeList();
        animeForm.reset();
        episodesContainer.innerHTML = '';
        feedbackMessage.textContent = `"${newAnime.title.userPreferred}" was saved successfully!`;
        setTimeout(() => feedbackMessage.textContent = '', 3000);
    });

    function renderAnimeList() {
        animeListContainer.innerHTML = '<h3>Your Anime Collection</h3>';
        animeCollection.sort((a, b) => a.title.userPreferred.localeCompare(b.title.userPreferred));
        
        animeCollection.forEach(anime => {
            const animeItem = document.createElement('div');
            animeItem.classList.add('anime-list-item');
            animeItem.innerHTML = `
                <span>${anime.title.userPreferred}</span>
                <div>
                    <button class="edit-button" data-id="${anime.id}">Edit</button>
                    <button class="delete-button" data-id="${anime.id}">Delete</button>
                </div>
            `;
            animeListContainer.appendChild(animeItem);
        });
        
        document.querySelectorAll('.edit-button').forEach(btn => btn.onclick = () => editAnime(btn.dataset.id));
        document.querySelectorAll('.delete-button').forEach(btn => btn.onclick = () => deleteAnime(btn.dataset.id));
    }

    async function editAnime(id) {
        const anime = animeCollection.find(a => a.id == id);
        if (!anime) return;
        
        // We can just use the data we already have in the collection to fill the form
        // But for consistency and to get the latest data, we can re-fetch
        const aniListData = await fetchAniListById(id);
        const jikanData = await fetchJikanById(id); // Keep fetching MAL for producers, etc.
        
        fillForm(aniListData, jikanData);
        document.getElementById('latest-episode-checkbox').checked = latestEpisodes.some(a => a.id === anime.id);
        episodesContainer.innerHTML = '';
        anime.episodesList.forEach(ep => addEpisodeField(ep.number, ep.url));
    }

    function deleteAnime(id) {
        animeCollection = animeCollection.filter(a => a.id != id);
        latestEpisodes = latestEpisodes.filter(a => a.id != id);
        renderAnimeList();
    }

    downloadButton.addEventListener('click', function () {
        // This sorting logic is now safer because we ensure `score` exists from AniList
        const sortedByMonthlyViews = [...animeCollection].sort((a, b) => (b.views?.monthly || 0) - (a.views?.monthly || 0));
        const sortedByDailyViews = [...animeCollection].sort((a, b) => (b.views?.daily || 0) - (a.views?.daily || 0));
        const sortedByWeeklyViews = [...animeCollection].sort((a, b) => (b.views?.weekly || 0) - (a.views?.weekly || 0));

        const finalData = {
            slider: sortedByMonthlyViews.slice(0, 11),
            trending: sortedByDailyViews.slice(0, 11),
            popular: sortedByWeeklyViews.slice(0, 10),
            most_favorite: sortedByMonthlyViews.slice(11, 21),
            latest_completed: [...animeCollection].filter(a => a.status && a.status.toUpperCase() === 'FINISHED').slice(0, 20),
            recent_added: [...animeCollection].slice(-30).reverse(),
            latest_episodes: latestEpisodes,
            collection: animeCollection
        };

        const dataStr = JSON.stringify(finalData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", "anime_data.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
        
        feedbackMessage.textContent = 'anime_data.json has been generated and downloaded!';
        setTimeout(() => feedbackMessage.textContent = '', 3000);
    });
});
