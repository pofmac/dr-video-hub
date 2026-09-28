// Home page. Needs common.js (db, escapeHtml, fetchAllRows, video helpers) loaded first.

const ALL_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const STATE_ABBR = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

// Doctors whose state is blank or outside the US are grouped here instead of being given a made-up state.
const LOCATION_UNLISTED = 'Location not listed';

function normalizeState(raw) {
    const value = (raw || '').trim();
    if (!value) return LOCATION_UNLISTED;
    const byName = ALL_STATES.find(s => s.toLowerCase() === value.toLowerCase());
    if (byName) return byName;
    return STATE_ABBR[value.toUpperCase()] || LOCATION_UNLISTED;
}


let allVideos = [];
let totalVideoCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Connecting to Supabase...");

        let doctors = await fetchAllRows(() => db
            .from('doctors_final')
            .select('*')
            .or('status.neq.pending,status.is.null')
            .order('id'));

        console.log(`Fetched ${doctors.length} doctors from live Supabase database!`);

        // Only the columns the home page needs, paged past Supabase's 1,000-row limit.
        allVideos = await fetchAllRows(() => db
            .from('videos')
            .select('doctor_id, youtube_video_id')
            .order('id'));
        totalVideoCount = allVideos.length;

        console.log(`Fetched ${allVideos.length} videos from live Supabase database!`);

        doctors = doctors.map(doc => {
            const state = normalizeState(doc['State'] || doc.state);

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
        loadNewVideos();
        loadTopics();

        populateUI(doctors);
        populateStats(doctors);

    } catch(err) {
        console.error("Could not load doctors from Supabase.", err);
        window.allDoctors = [];
        const grid = document.querySelector('.state-grid');
        if (grid) grid.innerHTML = '<p class="directory-subtitle">The doctor directory could not be loaded right now. Please refresh the page or try again later.</p>';
        const caption = document.getElementById('cinema-caption');
        if (caption) caption.textContent = 'Videos could not be loaded right now.';
    }
});

function populateUI(doctors) {
    setupStateGrid(doctors);
    setupCinemaPlayer(doctors);
}

function populateStats(doctors) {
    const statDoctors = document.getElementById('stat-doctors');
    const statVideos = document.getElementById('stat-videos');
    const statSpecialties = document.getElementById('stat-specialties');

    if (statDoctors) statDoctors.textContent = doctors.length.toLocaleString();
    if (statVideos) statVideos.textContent = totalVideoCount.toLocaleString();

    if (statSpecialties) {
        const uniqueSpecialties = new Set(doctors.map(d => d.specialty).filter(Boolean));
        statSpecialties.textContent = uniqueSpecialties.size.toLocaleString();
    }
}

function setupStateGrid(doctors) {
    const grid = document.querySelector('.state-grid');
    if (!grid) return;

    grid.innerHTML = '';

    [...ALL_STATES, LOCATION_UNLISTED].forEach(state => {
        const stateDoctors = doctors.filter(d => d.state === state);
        if (state === LOCATION_UNLISTED && stateDoctors.length === 0) return;

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'state-link';

        if (stateDoctors.length > 0) {
            a.innerHTML = `${state} <span class="doc-count" style="background:#ff4757; color:white; font-size:0.75rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">${stateDoctors.length}</span>`;

            a.addEventListener('click', (e) => {
                e.preventDefault();
                renderDoctorCards(stateDoctors, state, 'state');
            });
        } else {
            a.innerHTML = state;
        }

        grid.appendChild(a);
    });
}

function getVideoForDoctor(dbId) {
    return allVideos.find(v => v.doctor_id === dbId);
}

function playVideoInCinema(doctor) {
    const iframe = document.getElementById('cinema-iframe');
    const caption = document.getElementById('cinema-caption');
    const video = getVideoForDoctor(doctor.db_id);

    if (iframe && video && video.youtube_video_id) {
        iframe.src = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1`;
    }

    if (caption) {
        caption.innerHTML = `<span class="live-pulse"></span><strong>Now Playing:</strong> ${escapeHtml(doctor.name)} - ${escapeHtml(doctor.specialty)}`;
    }

    document.querySelector('.cinema-player-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupCinemaPlayer(doctors) {
    const doctorsWithVideos = doctors.filter(d => getVideoForDoctor(d.db_id));
    if (doctorsWithVideos.length === 0) {
        const caption = document.getElementById('cinema-caption');
        if (caption) caption.textContent = 'Featured videos are coming soon.';
        return;
    }

    const randomDoc = doctorsWithVideos[Math.floor(Math.random() * doctorsWithVideos.length)];
    playVideoInCinema(randomDoc);
}

function renderDoctorCards(doctors, label, type = 'state') {
    const resultsHeader = document.getElementById('doctor-results-header');
    const resultsTitle = document.getElementById('doctor-results-title');
    const resultsContainer = document.getElementById('doctor-results');

    if(!resultsContainer) return;

    resultsHeader.style.display = 'block';
    resultsContainer.style.display = 'flex';

    const prefix = type === 'specialty' ? 'Featured' : (label === LOCATION_UNLISTED ? 'Featured Doctors:' : 'Featured Doctors in');
    const suffix = type === 'specialty' ? 'Doctors' : '';
    resultsTitle.innerHTML = `<span style="color:#fff;">${prefix}</span> <span style="background: -webkit-linear-gradient(#0ea5e9, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${escapeHtml(label)}</span> <span style="color:#fff;">${suffix}</span>`;

    resultsContainer.innerHTML = (type === 'state' && label !== LOCATION_UNLISTED && typeof stateSponsorCardHtml === 'function')
        ? stateSponsorCardHtml(label) : '';

    doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doctor-card';

        const cleanedName = doc.name.replace(/"/g, '').trim();
        const specialty = doc.specialty ? doc.specialty.toUpperCase() : 'MEDICAL EXPERT';
        const hasVideo = !!getVideoForDoctor(doc.db_id);

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-specialty">${escapeHtml(specialty)}</div>
                <h3 class="card-name">${escapeHtml(cleanedName)}</h3>
                <div class="card-state">📍 ${escapeHtml(doc.state)}</div>
            </div>
            <button class="card-btn" ${hasVideo ? '' : 'disabled'}>
                ${hasVideo ? '▶ Watch Video' : 'No Video Yet'}
            </button>
        `;

        if (hasVideo) {
            card.querySelector('.card-btn').addEventListener('click', () => playVideoInCinema(doc));
        }

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
            .limit(24);
        if (error) throw error;
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const recent = (data || []).filter(v => new Date(v.published_at).getTime() >= weekAgo);
        const heading = document.getElementById('new-videos-title');
        if (heading && recent.length < 4) heading.textContent = 'Latest Doctor Videos';
        const list = (recent.length >= 4 ? recent : (data || [])).slice(0, 8);
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
