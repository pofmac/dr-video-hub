// Health question pages: fills each "What doctors say" box with videos whose titles match the question.
// Page text is written by tools/build_questions.py; this only adds the videos.
const VIDEOS_PER_QUESTION = 4;
const MORE_VIDEOS = 8;

function termsRegex(terms) {
    const parts = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${parts.join('|')})`, 'i');
}

// Newest first, at most one video per doctor, so no single doctor fills a box.
function pickVideos(videos, count, used) {
    const doctors = new Set();
    const picked = [];
    for (const v of videos) {
        if (picked.length >= count) break;
        if (doctors.has(v.doctor_id) || used.has(v.id)) continue;
        doctors.add(v.doctor_id);
        picked.push(v);
    }
    picked.forEach(v => used.add(v.id));
    return picked;
}

function fillBox(box, videos, doctorsById) {
    const grid = box.querySelector('.video-grid');
    if (!videos.length) {
        box.innerHTML = `<p class="page-status">${escapeHtml(box.dataset.empty)}</p>`;
        return;
    }
    grid.innerHTML = videos.map(v => videoCardHtml(v, doctorsById.get(v.doctor_id))).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    const page = document.querySelector('.qa-page');
    const boxes = [...document.querySelectorAll('.qa-videos')];
    if (!page || !boxes.length) return;
    const conditionTerms = JSON.parse(page.dataset.conditionTerms || '[]');
    boxes.forEach(b => { b.querySelector('.video-grid').innerHTML = '<p class="page-status">Loading videos...</p>'; });

    try {
        const { data, error } = await db.from('videos')
            .select('id, doctor_id, youtube_video_id, title, thumbnail_url, published_at')
            .or(conditionTerms.map(t => `title.ilike.*${t}*`).join(','))
            .not('youtube_video_id', 'is', null)
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(600);
        if (error) throw error;

        const conditionRe = termsRegex(conditionTerms);
        let videos = (data || []).filter(v => conditionRe.test(v.title || '') && isEnglishFriendlyVideo(v));

        const doctorsById = new Map();
        const ids = [...new Set(videos.map(v => v.doctor_id))].filter(id => id != null);
        for (let i = 0; i < ids.length; i += 200) {
            const { data: docs, error: docError } = await db.from('doctors_final')
                .select('id, "Channel Name", "Specialty", status').in('id', ids.slice(i, i + 200));
            if (docError) throw docError;
            (docs || []).filter(isVisibleDoctor).forEach(d => doctorsById.set(d.id, d));
        }
        videos = videos.filter(v => doctorsById.has(v.doctor_id));

        // Question boxes first (they need a diet word in the title), then "more videos" gets the rest.
        const used = new Set();
        boxes.forEach(box => {
            const dietTerms = JSON.parse(box.dataset.terms || '[]');
            if (!dietTerms.length) return;
            const dietRe = termsRegex(dietTerms);
            fillBox(box, pickVideos(videos.filter(v => dietRe.test(v.title || '')), VIDEOS_PER_QUESTION, used), doctorsById);
        });
        boxes.filter(box => !JSON.parse(box.dataset.terms || '[]').length)
            .forEach(box => fillBox(box, pickVideos(videos, MORE_VIDEOS, used), doctorsById));
    } catch (err) {
        console.error(err);
        boxes.forEach(box => { box.innerHTML = '<p class="page-status">Videos could not be loaded right now. Please refresh the page.</p>'; });
    }
});
