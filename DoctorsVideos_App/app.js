// Home page. Needs common.js (db, escapeHtml, fetchAllRows, video helpers) loaded first.

// Counts come first from site-stats.json (rebuilt daily by .github/workflows/site-stats.yml), so the stats and the
// state list show at once. The doctor list loads alongside it for the state cards, the symptom search and
// "New videos"; the full videos table is only downloaded if site-stats.json can't be read.
let videoCounts = new Map();   // doctor id -> English-friendly videos
let doctorsLoaded = null;      // promise of the visible doctors

document.addEventListener('DOMContentLoaded', async () => {
    const statsLoaded = fetch('site-stats.json', { cache: 'no-cache' })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null);
    doctorsLoaded = loadDoctors();

    const stats = await statsLoaded;
    if (stats) {
        videoCounts = new Map(Object.entries(stats.videos_by_doctor || {}).map(([id, n]) => [Number(id), n]));
        populateStats(stats);
        setupStateGrid(placeCountsFromStats(stats));
    }

    try {
        const doctors = await doctorsLoaded;
        loadNewVideos();
        loadTopics();
        if (!stats) {
            // No counts file: count in the browser, as before.
            const allVideos = await fetchAllRows(() => db
                .from('videos')
                .select('doctor_id, youtube_video_id, title')
                .order('id'));
            const visibleIds = new Set(doctors.map(d => d.db_id));
            const englishVideos = allVideos.filter(v => visibleIds.has(v.doctor_id) && isEnglishFriendlyVideo(v));
            visibleIds.forEach(id => videoCounts.set(id, 0));
            englishVideos.forEach(v => videoCounts.set(v.doctor_id, (videoCounts.get(v.doctor_id) || 0) + 1));
            populateStats({
                doctors: doctors.length,
                videos: englishVideos.length,
                specialties: new Set(doctors.map(d => d.specialty).filter(Boolean)).size,
            });
            setupStateGrid(placeCounts(doctors));
        }
    } catch(err) {
        console.error("Could not load doctors from Supabase.", err);
        window.allDoctors = [];
        const grid = document.querySelector('.state-grid');
        if (grid && !stats) grid.innerHTML = '<p class="directory-subtitle">The doctor directory could not be loaded right now. Please refresh the page or try again later.</p>';
    }
});

async function loadDoctors() {
    let doctors = await fetchAllRows(() => db
        .from('doctors_final')
        .select('*')
        .or(VISIBLE_DOCTOR_FILTER)
        .order('id'));

    console.log(`Fetched ${doctors.length} doctors from live Supabase database!`);

    doctors = doctors.map(doc => {
        const state = doctorLocation(doc);

        return {
            db_id: doc.id,
            channel_id: doc['Channel ID'],
            name: doc['Channel Name'] || doc.doctor_name || doc.Channel_Name || "Doctor",
            state: state,
            specialty: doc['Specialty'] || doc.specialty || "Medical Expert",
            raw: doc,
            video_url: doc['Channel URL'] || doc.video_url || doc.Channel_URL
        };
    });

    window.allDoctors = doctors;
    window.doctorsById = new Map(doctors.map(d => [d.db_id, d]));
    return doctors;
}

function populateStats(stats) {
    const statDoctors = document.getElementById('stat-doctors');
    const statVideos = document.getElementById('stat-videos');
    const statSpecialties = document.getElementById('stat-specialties');
    const asOf = document.getElementById('stats-as-of');

    if (statDoctors) statDoctors.textContent = stats.doctors.toLocaleString();
    if (statVideos) statVideos.textContent = stats.videos.toLocaleString();
    if (statSpecialties) statSpecialties.textContent = stats.specialties.toLocaleString();
    if (asOf && stats.as_of) {
        asOf.textContent = `Counts as of ${formatDate(stats.as_of + 'T12:00:00Z')}`;
        asOf.hidden = false;
    }
}

// Place name -> number of doctors, from the counts file. Country codes become names, as on the doctor cards.
function placeCountsFromStats(stats) {
    const counts = new Map(Object.entries(stats.states || {}));
    Object.entries(stats.countries || {}).forEach(([country, n]) => {
        const name = countryName(country);
        counts.set(name, (counts.get(name) || 0) + n);
    });
    if (stats.unlisted) counts.set(LOCATION_UNLISTED, stats.unlisted);
    return counts;
}

function placeCounts(doctors) {
    const counts = new Map();
    doctors.forEach(d => counts.set(d.state, (counts.get(d.state) || 0) + 1));
    return counts;
}

function setupStateGrid(counts) {
    const grid = document.querySelector('.state-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // US states first, then any other countries doctors practice in, then doctors with no location.
    const countries = [...counts.keys()]
        .filter(place => !ALL_STATES.includes(place) && place !== LOCATION_UNLISTED).sort((a, b) => a.localeCompare(b));
    [...ALL_STATES, ...countries, LOCATION_UNLISTED].forEach(state => {
        const count = counts.get(state) || 0;
        if (state === LOCATION_UNLISTED && count === 0) return;

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'state-link';

        if (count > 0) {
            a.innerHTML = `<span>${state}</span> <span class="doc-count">${count}</span>`;

            a.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const doctors = await doctorsLoaded;
                    const stateDoctors = doctors.filter(d => d.state === state);
                    await loadMissingVideoCounts(stateDoctors);
                    renderDoctorCards(stateDoctors, state, 'state');
                } catch (err) {
                    console.error('Could not load doctors for', state, err);
                }
            });
        } else {
            a.innerHTML = state;
        }

        grid.appendChild(a);
    });
}

// Doctors added since the counts file was built have no video count yet: count theirs now.
async function loadMissingVideoCounts(doctors) {
    const ids = doctors.map(d => d.db_id).filter(id => !videoCounts.has(id));
    if (!ids.length) return;
    const videos = await fetchAllRows(() => db
        .from('videos')
        .select('doctor_id, title')
        .in('doctor_id', ids)
        .order('id'));
    ids.forEach(id => videoCounts.set(id, 0));
    videos.filter(isEnglishFriendlyVideo).forEach(v => videoCounts.set(v.doctor_id, videoCounts.get(v.doctor_id) + 1));
}

function renderDoctorCards(doctors, label, type = 'state') {
    const resultsHeader = document.getElementById('doctor-results-header');
    const resultsTitle = document.getElementById('doctor-results-title');
    const resultsContainer = document.getElementById('doctor-results');

    if(!resultsContainer) return;

    resultsHeader.hidden = false;
    resultsContainer.hidden = false;

    const prefix = type === 'specialty' ? 'Featured' : (label === LOCATION_UNLISTED ? 'Featured Doctors:' : 'Featured Doctors in');
    const suffix = type === 'specialty' ? 'Doctors' : '';
    resultsTitle.innerHTML = `${prefix} <span class="grad-text">${escapeHtml(label)}</span> ${suffix}`;

    resultsContainer.innerHTML = (type === 'state' && ALL_STATES.includes(label) && typeof stateSponsorCardHtml === 'function')
        ? stateSponsorCardHtml(label) : '';

    doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doctor-card';

        const cleanedName = doc.name.replace(/"/g, '').trim();
        const specialty = doc.specialty || 'Medical expert';
        const videoCount = videoCounts.get(doc.db_id) || 0;

        card.innerHTML = `
            <div class="card-inner">
                <div class="doctor-avatar" aria-hidden="true">${escapeHtml(doctorInitials(cleanedName))}</div>
                <div class="card-specialty">${escapeHtml(specialty)}</div>
                <h3 class="card-name">${escapeHtml(cleanedName)}</h3>
                <div class="card-state">📍 ${escapeHtml(doc.state)}</div>
            </div>
            ${videoCount ? `<a class="card-btn" href="doctor.html?id=${encodeURIComponent(doc.db_id)}">▶ See all ${videoCount} video${videoCount === 1 ? '' : 's'}</a>`
                         : '<button class="card-btn" disabled>No videos yet</button>'}
        `;

        resultsContainer.appendChild(card);
    });

    resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// "New videos this week": the newest videos doctors have published (last 7 days, or the latest 8).
async function loadNewVideos() {
    const grid = document.getElementById('new-videos-grid');
    if (!grid) return;
    try {
        const { data, error } = await db
            .from('videos')
            .select('id, doctor_id, youtube_video_id, title, thumbnail_url, published_at')
            .not('youtube_video_id', 'is', null)
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(150);
        if (error) throw error;
        // Only videos the classifier tagged with a health topic (drops channel news, promos, etc.).
        let tagged = new Set();
        const ids = (data || []).map(v => v.id);
        if (ids.length) {
            const { data: links, error: linkError } = await db.from('video_topics').select('video_id').in('video_id', ids);
            if (linkError) throw linkError;
            tagged = new Set((links || []).map(l => l.video_id));
        }
        const visibleDoctors = window.doctorsById || new Map();
        const healthVideos = (data || []).filter(v => tagged.has(v.id)
            && visibleDoctors.has(v.doctor_id) && isEnglishFriendlyVideo(v));
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const recent = healthVideos.filter(v => new Date(v.published_at).getTime() >= weekAgo);
        const heading = document.getElementById('new-videos-title');
        if (heading && recent.length < 4) heading.textContent = 'Latest Doctor Videos';
        const list = (recent.length >= 4 ? recent : healthVideos).slice(0, 8);
        const byId = window.doctorsById || new Map();
        grid.innerHTML = list.map(v => videoCardHtml(v, byId.get(v.doctor_id)?.raw)).join('');
        document.getElementById('new-videos-section').hidden = list.length === 0;
    } catch (err) {
        console.warn('Could not load new videos', err);
    }
}

// Topics power the topic buttons, search suggestions and topic pages.
async function loadTopics() {
    try {
        const { data, error } = await db.from('topics').select('id, name, slug, category, featured').order('name');
        if (error) throw error;
        window.allTopics = data || [];
    } catch (err) {
        console.warn('Could not load topics', err);
        window.allTopics = [];
    }
    // Popular topic buttons go straight to their topic page when one exists.
    document.querySelectorAll('.topic-chip').forEach(chip => {
        const topic = findTopic(chip.dataset.topic);
        if (topic) chip.dataset.href = topicUrl(topic);
    });
}

function normalizeTopicText(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/s\b/g, '').trim();
}

function findTopic(text) {
    const wanted = normalizeTopicText(text);
    return (window.allTopics || []).find(t => normalizeTopicText(t.name) === wanted || normalizeTopicText(t.slug) === wanted);
}

// Topics whose name appears in what the visitor typed (or the other way round).
function matchTopics(text, max = 4) {
    const query = normalizeTopicText(text);
    if (!query) return [];
    return (window.allTopics || [])
        .filter(t => { const n = normalizeTopicText(t.name); return n && (query.includes(n) || n.includes(query)); })
        .slice(0, max);
}
