// One topic page: topic.html?slug=back-pain
// Shows doctors' viewpoints, videos from many different doctors (newest first, no ranking)
// and related topics.
const VIDEOS_PER_PAGE = 12;
const MAX_VIDEOS_PER_DOCTOR = 2; // keeps the page varied so no single doctor dominates

let topicVideos = [];
let shownVideos = 0;
let topicDoctors = new Map();

function setMeta(topic) {
    document.title = `${topic.name}: What Doctors Say | DoctorsVideos.video`;
    const desc = topic.description || `Compare what many different doctors say about ${topic.name.toLowerCase()} in short videos.`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc.slice(0, 160));
}

// Spread videos across doctors: round-robin, newest first, at most MAX_VIDEOS_PER_DOCTOR each.
function mixByDoctor(videos) {
    const perDoctor = new Map();
    videos.forEach(v => {
        if (!perDoctor.has(v.doctor_id)) perDoctor.set(v.doctor_id, []);
        const list = perDoctor.get(v.doctor_id);
        if (list.length < MAX_VIDEOS_PER_DOCTOR) list.push(v);
    });
    const queues = [...perDoctor.values()];
    const mixed = [];
    for (let round = 0; round < MAX_VIDEOS_PER_DOCTOR; round++) {
        queues.forEach(q => { if (q[round]) mixed.push(q[round]); });
    }
    return mixed;
}

function showMoreVideos() {
    const grid = document.getElementById('topic-videos');
    const next = topicVideos.slice(shownVideos, shownVideos + VIDEOS_PER_PAGE);
    grid.insertAdjacentHTML('beforeend', next.map(v => videoCardHtml(v, topicDoctors.get(v.doctor_id))).join(''));
    shownVideos += next.length;
    document.getElementById('topic-more').hidden = shownVideos >= topicVideos.length;
}

async function loadDoctors(ids) {
    const unique = [...new Set(ids)].filter(id => id != null);
    for (let i = 0; i < unique.length; i += 200) {
        const { data, error } = await db.from('doctors_final').select('id, "Channel Name", "Specialty"').in('id', unique.slice(i, i + 200));
        if (error) throw error;
        (data || []).forEach(d => topicDoctors.set(d.id, d));
    }
}

async function loadVideos(topic) {
    const links = await fetchAllRows(() => db.from('video_topics').select('video_id').eq('topic_id', topic.id));
    const ids = links.map(l => l.video_id);
    let videos = [];
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from('videos')
            .select('id, doctor_id, youtube_video_id, title, thumbnail_url, published_at')
            .in('id', ids.slice(i, i + 200))
            .not('youtube_video_id', 'is', null);
        if (error) throw error;
        videos = videos.concat(data || []);
    }
    videos.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    return videos;
}

async function loadViewpoints(topic) {
    const { data, error } = await db.from('viewpoints')
        .select('doctor_id, video_id, stance_summary')
        .eq('topic_id', topic.id)
        .limit(50);
    if (error) throw error;
    return (data || []).filter(v => v.stance_summary);
}

async function loadRelated(topic) {
    if (!topic.category) return [];
    const { data, error } = await db.from('topics').select('name, slug')
        .eq('category', topic.category).neq('id', topic.id).order('name').limit(12);
    if (error) throw error;
    return data || [];
}

document.addEventListener('DOMContentLoaded', async () => {
    const slug = new URLSearchParams(location.search).get('slug');
    const title = document.getElementById('topic-title');
    const grid = document.getElementById('topic-videos');
    if (!slug) { location.replace('topics.html'); return; }

    try {
        const { data: topic, error } = await db.from('topics')
            .select('id, name, slug, description, category').eq('slug', slug).maybeSingle();
        if (error) throw error;
        if (!topic) {
            title.textContent = 'Topic not found';
            grid.innerHTML = '<p class="page-status">We couldn\'t find that topic. <a href="topics.html">See all topics</a>.</p>';
            return;
        }
        setMeta(topic);
        title.textContent = topic.name;
        document.getElementById('topic-description').textContent = topic.description || '';
        document.getElementById('topic-category').textContent = topic.category || '';

        const [videos, viewpoints, related] = await Promise.all([
            loadVideos(topic),
            loadViewpoints(topic).catch(() => []),
            loadRelated(topic).catch(() => []),
        ]);
        await loadDoctors([...videos.map(v => v.doctor_id), ...viewpoints.map(v => v.doctor_id)]);

        // Viewpoints, alphabetical by doctor so nobody is "ranked".
        if (viewpoints.length) {
            const videoById = new Map(videos.map(v => [v.id, v]));
            viewpoints.sort((a, b) => doctorDisplayName(topicDoctors.get(a.doctor_id)).localeCompare(doctorDisplayName(topicDoctors.get(b.doctor_id))));
            document.getElementById('viewpoints-list').innerHTML = viewpoints.map(vp => {
                const doc = topicDoctors.get(vp.doctor_id);
                const video = videoById.get(vp.video_id);
                return `
                    <div class="viewpoint-card">
                        <p class="viewpoint-doctor">${escapeHtml(doctorDisplayName(doc))}${doc?.Specialty ? ` <span>${escapeHtml(doc.Specialty)}</span>` : ''}</p>
                        <p class="viewpoint-summary">${escapeHtml(vp.stance_summary)}</p>
                        ${video ? `<button class="viewpoint-watch video-card-link" data-youtube-id="${escapeHtml(video.youtube_video_id)}" data-title="${escapeHtml(video.title)}" data-doctor="${escapeHtml(doctorDisplayName(doc))}">▶ Watch this video</button>` : ''}
                    </div>`;
            }).join('');
            document.getElementById('viewpoints-section').hidden = false;
        }

        topicVideos = mixByDoctor(videos);
        const doctorCount = new Set(topicVideos.map(v => v.doctor_id)).size;
        document.getElementById('topic-videos-title').textContent =
            topicVideos.length ? `Videos from ${doctorCount} doctor${doctorCount === 1 ? '' : 's'}` : 'Videos';
        grid.innerHTML = topicVideos.length ? '' : '<p class="page-status">Videos for this topic are coming soon.</p>';
        if (topicVideos.length) showMoreVideos();
        document.getElementById('topic-more').addEventListener('click', showMoreVideos);

        if (related.length) {
            document.getElementById('related-topics').innerHTML = related
                .map(t => `<a class="topic-chip" href="${escapeHtml(topicUrl(t))}">${escapeHtml(t.name)}</a>`).join('');
            document.getElementById('related-section').hidden = false;
        }
    } catch (err) {
        console.error(err);
        title.textContent = 'Something went wrong';
        grid.innerHTML = '<p class="page-status">This topic could not be loaded right now. Please refresh the page.</p>';
    }
});

// "Watch this video" buttons in the viewpoint cards use the shared player.
document.addEventListener('click', e => {
    const btn = e.target.closest('.video-card-link');
    if (btn) openVideoPlayer(btn.dataset.youtubeId, btn.dataset.title, btn.dataset.doctor);
});
