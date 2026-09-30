// Specialty guide pages (hip-and-knee.html, foot-and-ankle.html): adds doctor videos to each section,
// matched by video title, and lists the doctors in that specialty. Text is written by tools/build_guides.py.
const GUIDE_VIDEOS_PER_SECTION = 4;

function guideTermsRegex(terms) {
    const parts = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${parts.join('|')})`, 'i');
}

// Newest first with one video per doctor; if that leaves gaps, fill them with more from the same doctors.
function pickGuideVideos(videos, count, used) {
    const fresh = videos.filter(v => !used.has(v.id));
    const picked = [];
    const doctors = new Set();
    fresh.forEach(v => { if (picked.length < count && !doctors.has(v.doctor_id)) { doctors.add(v.doctor_id); picked.push(v); } });
    fresh.forEach(v => { if (picked.length < count && !picked.includes(v)) picked.push(v); });
    picked.forEach(v => used.add(v.id));
    return picked;
}

function guideDoctorCard(doc) {
    const name = doctorDisplayName(doc);
    return `
        <div class="doctor-card">
            <div class="card-inner">
                <div class="doctor-avatar" aria-hidden="true">${escapeHtml(doctorInitials(name))}</div>
                <div class="card-specialty">${escapeHtml(doc.Specialty || 'Medical expert')}</div>
                <h3 class="card-name">${escapeHtml(name)}</h3>
                <div class="card-state">📍 ${escapeHtml(normalizeState(doc.State))}</div>
            </div>
            <a class="card-btn" href="experts.html?q=${encodeURIComponent(name)}">See their videos</a>
        </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const page = document.querySelector('.guide-page');
    if (!page) return;
    const boxes = [...document.querySelectorAll('.guide-videos')];
    const doctorBox = document.getElementById('guide-doctors');
    boxes.forEach(b => { b.querySelector('.video-grid').innerHTML = '<p class="page-status">Loading videos...</p>'; });

    try {
        const doctors = (await fetchAllRows(() => db.from('doctors_final')
            .select('id, "Channel Name", "Specialty", "State", status').order('id'))).filter(isVisibleDoctor);
        const doctorsById = new Map(doctors.map(d => [d.id, d]));
        const specialtyRe = guideTermsRegex(JSON.parse(doctorBox.dataset.terms));
        const specialists = doctors.filter(d => specialtyRe.test(d.Specialty || ''))
            .sort((a, b) => doctorDisplayName(a).replace(/^dr\.?\s+/i, '').localeCompare(doctorDisplayName(b).replace(/^dr\.?\s+/i, '')));
        const specialistIds = new Set(specialists.map(d => d.id));
        doctorBox.innerHTML = specialists.length ? specialists.map(guideDoctorCard).join('')
            : '<p class="page-status">Doctors for this specialty are being added.</p>';

        // A video belongs on this page if it's from one of these specialists or its title is about this body area.
        const scopeRe = guideTermsRegex(JSON.parse(page.dataset.scope || '[]'));
        const used = new Set();
        await Promise.all(boxes.map(async box => {
            const terms = JSON.parse(box.dataset.terms);
            const { data, error } = await db.from('videos')
                .select('id, doctor_id, youtube_video_id, title, thumbnail_url, published_at')
                .or(terms.map(t => `title.ilike.*${t}*`).join(','))
                .not('youtube_video_id', 'is', null)
                .order('published_at', { ascending: false, nullsFirst: false })
                .limit(150);
            if (error) throw error;
            const re = guideTermsRegex(terms);
            box._videos = (data || []).filter(v => doctorsById.has(v.doctor_id) && isEnglishFriendlyVideo(v)
                && re.test(v.title || '') && (specialistIds.has(v.doctor_id) || scopeRe.test(v.title || '')));
        }));
        // Fill sections in page order so the same video isn't shown twice.
        boxes.forEach(box => {
            const picked = pickGuideVideos(box._videos, GUIDE_VIDEOS_PER_SECTION, used);
            box.querySelector('.video-grid').innerHTML = picked.length
                ? picked.map(v => videoCardHtml(v, doctorsById.get(v.doctor_id))).join('')
                : '<p class="page-status">Doctor videos on this are coming soon.</p>';
        });
    } catch (err) {
        console.error(err);
        boxes.forEach(b => { b.innerHTML = '<p class="page-status">Videos could not be loaded right now. Please refresh the page.</p>'; });
        doctorBox.innerHTML = '<p class="page-status">Doctors could not be loaded right now. Please refresh the page.</p>';
    }
});
