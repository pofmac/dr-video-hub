// Doctors page: every visible doctor, A to Z, with a name search and a specialty filter.
// Alphabetical on purpose: the site never ranks doctors.
const DOCTORS_PER_PAGE = 24;

let directory = [];     // { id, name, specialty, state, videos: [] }
let filtered = [];
let shownDoctors = 0;

function doctorCardHtml(doc) {
    const count = doc.videos.length;
    return `
        <div class="doctor-card">
            <div class="card-inner">
                <div class="doctor-avatar" aria-hidden="true">${escapeHtml(doctorInitials(doc.name))}</div>
                <div class="card-specialty">${escapeHtml(doc.specialty || 'Medical expert')}</div>
                <h3 class="card-name">${escapeHtml(doc.name)}</h3>
                <div class="card-state">📍 ${escapeHtml(doc.state)} · ${count} video${count === 1 ? '' : 's'}</div>
            </div>
            <button class="card-btn" data-doctor-id="${escapeHtml(doc.id)}" ${count ? '' : 'disabled'}>
                ${count ? '▶ Watch a video' : 'No videos yet'}
            </button>
        </div>`;
}

function showMoreDoctors() {
    const grid = document.getElementById('doctor-grid');
    const next = filtered.slice(shownDoctors, shownDoctors + DOCTORS_PER_PAGE);
    grid.insertAdjacentHTML('beforeend', next.map(doctorCardHtml).join(''));
    shownDoctors += next.length;
    document.getElementById('doctor-more').hidden = shownDoctors >= filtered.length;
}

function applyFilters() {
    const q = document.getElementById('doctor-search').value.trim().toLowerCase();
    const spec = document.getElementById('doctor-specialty').value;
    filtered = directory.filter(d => (!q || d.name.toLowerCase().includes(q)) && (!spec || d.specialty === spec));
    shownDoctors = 0;
    const grid = document.getElementById('doctor-grid');
    grid.innerHTML = filtered.length ? '' : '<p class="page-status">No doctors match that search. Try fewer letters or pick "All specialties".</p>';
    document.getElementById('doctor-count').textContent =
        `Showing ${filtered.length.toLocaleString()} of ${directory.length.toLocaleString()} doctors`;
    showMoreDoctors();
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('doctor-grid');
    try {
        const [doctors, videos] = await Promise.all([
            fetchAllRows(() => db.from('doctors_final').select('id, "Channel Name", "Specialty", "State", status').or(VISIBLE_DOCTOR_FILTER).order('id')),
            fetchAllRows(() => db.from('videos').select('doctor_id, youtube_video_id, title').not('youtube_video_id', 'is', null).order('id')),
        ]);

        const videosByDoctor = new Map();
        videos.filter(isEnglishFriendlyVideo).forEach(v => {
            if (!videosByDoctor.has(v.doctor_id)) videosByDoctor.set(v.doctor_id, []);
            videosByDoctor.get(v.doctor_id).push(v);
        });

        directory = doctors.map(d => ({
            id: d.id,
            name: doctorDisplayName(d),
            specialty: String(d.Specialty || '').trim().toLowerCase(),
            state: normalizeState(d.State),
            videos: videosByDoctor.get(d.id) || [],
        })).sort((a, b) => a.name.replace(/^dr\.?\s+/i, '').localeCompare(b.name.replace(/^dr\.?\s+/i, '')));

        const specialties = [...new Set(directory.map(d => d.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        document.getElementById('doctor-specialty').insertAdjacentHTML('beforeend',
            specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</option>`).join(''));

        // Links from other pages from other pages can pre-fill the search: experts.html?q=Biernacki
        const preset = new URLSearchParams(location.search).get('q');
        if (preset) document.getElementById('doctor-search').value = preset;
        document.getElementById('doctor-search').addEventListener('input', applyFilters);
        document.getElementById('doctor-specialty').addEventListener('change', applyFilters);
        document.getElementById('doctor-more').addEventListener('click', showMoreDoctors);
        applyFilters();
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="page-status">The doctor list could not be loaded right now. Please refresh the page.</p>';
    }
});

// "Watch a video" opens one of that doctor's videos in the pop-up player.
document.addEventListener('click', e => {
    const btn = e.target.closest('.card-btn[data-doctor-id]');
    if (!btn) return;
    const doc = directory.find(d => String(d.id) === btn.dataset.doctorId);
    const video = doc && doc.videos[0];
    if (video) openVideoPlayer(video.youtube_video_id, video.title, doc.name);
});
