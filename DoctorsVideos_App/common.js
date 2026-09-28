// Shared helpers for every page that reads from Supabase.
// Load after the supabase-js library and before any page script.
const SUPABASE_URL = 'https://apodzqtcrlvhrgeluomi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vYjgL6oVtI_Qdvxs3emGlg_9e-slavK';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Supabase returns at most 1,000 rows per request, so page through larger tables.
async function fetchAllRows(buildQuery, pageSize = 1000) {
    let rows = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await buildQuery().range(from, from + pageSize - 1);
        if (error) throw error;
        rows = rows.concat(data || []);
        if (!data || data.length < pageSize) return rows;
    }
}

function doctorDisplayName(doc) {
    return String(doc?.['Channel Name'] || doc?.doctor_name || doc?.name || 'Doctor').replace(/"/g, '').trim();
}

function topicUrl(topic) {
    return `topic.html?slug=${encodeURIComponent(topic.slug)}`;
}

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// A video card: thumbnail, title, doctor. Clicking it opens the video player.
function videoCardHtml(video, doctor) {
    const thumb = video.thumbnail_url || `https://i.ytimg.com/vi/${encodeURIComponent(video.youtube_video_id)}/hqdefault.jpg`;
    return `
        <button class="video-card" data-youtube-id="${escapeHtml(video.youtube_video_id)}"
                data-title="${escapeHtml(video.title)}" data-doctor="${escapeHtml(doctor ? doctorDisplayName(doctor) : '')}">
            <img src="${escapeHtml(thumb)}" alt="" loading="lazy">
            <span class="video-card-title">${escapeHtml(video.title || 'Doctor video')}</span>
            <span class="video-card-meta">${escapeHtml(doctor ? doctorDisplayName(doctor) : '')}${video.published_at ? ' · ' + escapeHtml(formatDate(video.published_at)) : ''}</span>
        </button>`;
}

// One shared pop-up player for video cards on any page.
function openVideoPlayer(youtubeId, title, doctorName) {
    let modal = document.getElementById('video-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.className = 'video-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="video-modal-inner">
                <button class="video-modal-close" aria-label="Close video">×</button>
                <div class="video-modal-frame"><iframe title="Doctor video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
                <p class="video-modal-caption"></p>
            </div>`;
        document.body.appendChild(modal);
        const close = () => { modal.hidden = true; modal.querySelector('iframe').src = ''; };
        modal.querySelector('.video-modal-close').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });
    }
    modal.querySelector('iframe').src = `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;
    modal.querySelector('.video-modal-caption').textContent = [title, doctorName].filter(Boolean).join(' · ');
    modal.hidden = false;
    modal.querySelector('.video-modal-close').focus();
}

document.addEventListener('click', e => {
    const card = e.target.closest('.video-card');
    if (card) openVideoPlayer(card.dataset.youtubeId, card.dataset.title, card.dataset.doctor);
});
