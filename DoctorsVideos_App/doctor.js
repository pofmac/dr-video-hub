// One doctor's page: doctor.html?id=123 lists all of their videos, newest first, with a search box.
const DOCTOR_VIDEOS_PER_PAGE = 24;
let doctorVideos = [];
let shownDoctorVideos = [];
let shownCount = 0;
let doctor = null;

function showMoreDoctorVideos() {
    const grid = document.getElementById('doc-videos');
    const next = shownDoctorVideos.slice(shownCount, shownCount + DOCTOR_VIDEOS_PER_PAGE);
    grid.insertAdjacentHTML('beforeend', next.map(v => videoCardHtml(v, doctor)).join(''));
    shownCount += next.length;
    document.getElementById('doc-more').hidden = shownCount >= shownDoctorVideos.length;
}

function filterDoctorVideos() {
    const q = document.getElementById('doc-search').value.trim().toLowerCase();
    shownDoctorVideos = q ? doctorVideos.filter(v => (v.title || '').toLowerCase().includes(q)) : doctorVideos;
    shownCount = 0;
    document.getElementById('doc-videos').innerHTML = shownDoctorVideos.length ? ''
        : `<p class="page-status">No videos match "${escapeHtml(q)}". Try a shorter word.</p>`;
    document.getElementById('doc-count').textContent = q
        ? `${shownDoctorVideos.length.toLocaleString()} of ${doctorVideos.length.toLocaleString()} videos match`
        : `${doctorVideos.length.toLocaleString()} videos, newest first`;
    showMoreDoctorVideos();
}

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const title = document.getElementById('doc-name');
    const grid = document.getElementById('doc-videos');
    if (!id) { location.replace('experts.html'); return; }
    try {
        const { data, error } = await db.from('doctors_final')
            .select('id, "Channel Name", "Channel URL", "Specialty", "State", status').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data || !isVisibleDoctor(data)) {
            title.textContent = 'Doctor not found';
            grid.innerHTML = '<p class="page-status">We couldn\'t find that doctor. <a href="experts.html">See all doctors</a>.</p>';
            return;
        }
        doctor = data;
        const name = doctorDisplayName(data);
        document.title = `${name}: Videos | DoctorsVideos.video`;
        document.querySelector('meta[name="description"]')?.setAttribute('content', `Watch educational videos from ${name}, newest first.`);
        title.textContent = name;
        document.getElementById('doc-avatar').textContent = doctorInitials(name);
        document.getElementById('doc-specialty').textContent = data.Specialty || '';

        doctorVideos = (await fetchAllRows(() => db.from('videos')
            .select('id, doctor_id, youtube_video_id, title, thumbnail_url, published_at')
            .eq('doctor_id', id).not('youtube_video_id', 'is', null)
            .order('published_at', { ascending: false, nullsFirst: false })))
            .filter(isEnglishFriendlyVideo);

        const channel = /^https?:\/\//i.test(data['Channel URL'] || '') ? data['Channel URL'] : '';
        const meta = document.getElementById('doc-meta');
        meta.textContent = `📍 ${normalizeState(data.State)} · ${doctorVideos.length.toLocaleString()} video${doctorVideos.length === 1 ? '' : 's'}`;
        if (channel) meta.insertAdjacentHTML('beforeend', ` · <a href="${escapeHtml(channel)}" target="_blank" rel="noopener">YouTube channel ↗</a>`);

        if (!doctorVideos.length) {
            grid.innerHTML = '<p class="page-status">This doctor\'s videos are coming soon.</p>';
            return;
        }
        document.getElementById('doc-filter').hidden = doctorVideos.length < 8;
        document.getElementById('doc-search').addEventListener('input', filterDoctorVideos);
        document.getElementById('doc-more').addEventListener('click', showMoreDoctorVideos);
        filterDoctorVideos();
    } catch (err) {
        console.error(err);
        title.textContent = 'Something went wrong';
        grid.innerHTML = '<p class="page-status">This doctor could not be loaded right now. Please refresh the page.</p>';
    }
});
