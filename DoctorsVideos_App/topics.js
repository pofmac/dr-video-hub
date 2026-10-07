// Health Topics page: most searched topics, every topic grouped by category, and the latest articles.
const CATEGORY_ORDER = ['symptom', 'condition', 'procedure', 'specialty'];
const CATEGORY_INFO = {
    symptom: { label: 'Symptoms', single: 'Symptom', id: 'symptoms', icon: '🤕', tint: 'tint-rose' },
    condition: { label: 'Conditions', single: 'Condition', id: 'conditions', icon: '🩺', tint: 'tint-blue' },
    procedure: { label: 'Procedures', single: 'Procedure', id: 'procedures', icon: '🏥', tint: 'tint-violet' },
    specialty: { label: 'Specialties', single: 'Specialty', id: 'specialties', icon: '👩‍⚕️', tint: 'tint-green' },
};

// Keep in step with the cards on blog.html.
const SITE_ARTICLES = [
    { url: 'insulin-weight-gain.html', tag: 'Metabolism', icon: '⚖️', tint: 'tint-blue',
      title: 'How Insulin Controls Your Weight',
      text: 'How insulin resistance is linked to weight gain, and what doctors say about lowering it.' },
    { url: 'intermittent-fasting-guide.html', tag: 'Fasting', icon: '⏱️', tint: 'tint-green',
      title: 'Intermittent Fasting Guide: 16:8 vs 36-Hour Fasts',
      text: 'The difference between daily 16:8 fasting and longer fasts, and who should be careful.' },
    { url: 'cortisol-belly-fat.html', tag: 'Stress & sleep', icon: '😴', tint: 'tint-violet',
      title: 'How Stress and Poor Sleep Can Add Belly Fat',
      text: 'Why stress hormones and short sleep can make weight harder to lose.' },
];

// A small picture for each topic, picked from words in its name.
const TOPIC_ICONS = [
    [/back|spine|neck|sciatica|disc|posture/i, '🦴', 'tint-amber'],
    [/knee|hip|joint|arthritis|shoulder|ankle|foot|feet|hand|wrist|elbow/i, '🦵', 'tint-amber'],
    [/head|migraine|brain|memory|dementia|alzheimer|stroke|nerve|neuro/i, '🧠', 'tint-violet'],
    [/heart|blood pressure|hypertension|cholesterol|cardio/i, '❤️', 'tint-rose'],
    [/diabet|insulin|sugar|glucose|thyroid|hormone/i, '🩸', 'tint-rose'],
    [/sleep|fatigue|tired|insomnia/i, '😴', 'tint-blue'],
    [/stomach|gut|digest|bowel|reflux|ibs|liver|colon/i, '🫃', 'tint-green'],
    [/skin|rash|acne|eczema|psoriasis|hair/i, '🧴', 'tint-amber'],
    [/lung|breath|asthma|cough|copd/i, '🫁', 'tint-blue'],
    [/eye|vision/i, '👁️', 'tint-blue'],
    [/weight|obesity|diet|fasting|nutrition/i, '⚖️', 'tint-green'],
    [/anxiety|depress|mental|stress/i, '💭', 'tint-violet'],
    [/cancer|tumor/i, '🎗️', 'tint-rose'],
    [/pregnan|fertility|menopause|women/i, '🤰', 'tint-rose'],
];

function categoryKey(cat) {
    return String(cat || '').toLowerCase().replace(/ies$/, 'y').replace(/s$/, '');
}

function topicIcon(topic) {
    const hit = TOPIC_ICONS.find(([re]) => re.test(topic.name));
    if (hit) return { icon: hit[1], tint: hit[2] };
    const info = CATEGORY_INFO[categoryKey(topic.category)];
    return info ? { icon: info.icon, tint: info.tint } : { icon: '🩺', tint: 'tint-blue' };
}

function renderPopular(topics) {
    const featured = topics.filter(t => t.featured);
    const popular = (featured.length ? featured : topics).slice(0, 12);
    document.getElementById('popular-topics').innerHTML = popular.map(t => {
        const { icon, tint } = topicIcon(t);
        const info = CATEGORY_INFO[categoryKey(t.category)];
        return `<a class="popular-card" href="${escapeHtml(topicUrl(t))}">
                    <span class="browse-icon ${tint}" aria-hidden="true">${icon}</span>
                    <span>${escapeHtml(t.name)}<small>${info ? info.single : 'Topic'}</small></span>
                </a>`;
    }).join('');
    document.getElementById('popular-block').hidden = !popular.length;
}

function renderTopics(topics, filter) {
    const list = document.getElementById('topics-list');
    const q = filter.trim().toLowerCase();
    document.getElementById('popular-block').hidden = !!q || !document.getElementById('popular-topics').children.length;
    const shown = q ? topics.filter(t => t.name.toLowerCase().includes(q)) : topics;
    if (!shown.length) {
        list.innerHTML = `<p class="page-status">No topics match "${escapeHtml(filter)}". Try a shorter word.</p>`;
        return;
    }
    const groups = new Map();
    shown.forEach(t => {
        const key = categoryKey(t.category);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
    });
    const rank = k => (CATEGORY_ORDER.indexOf(k) + 1) || CATEGORY_ORDER.length + 1;
    list.innerHTML = [...groups.entries()]
        .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
        .map(([key, items]) => {
            const info = CATEGORY_INFO[key] || { label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Other topics', id: key || 'other', icon: '🩺', tint: 'tint-blue' };
            return `
            <section class="topic-group" id="${escapeHtml(info.id)}">
                <h2><span class="topic-group-icon ${info.tint}" aria-hidden="true">${info.icon}</span>${escapeHtml(info.label)} <span class="topic-count">${items.length}</span></h2>
                <div class="topic-chips topic-chips-left">
                    ${items.map(t => `<a class="topic-chip${t.featured ? ' topic-chip-featured' : ''}" href="${escapeHtml(topicUrl(t))}">${escapeHtml(t.name)}</a>`).join('')}
                </div>
            </section>`;
        }).join('');
}

function renderArticles() {
    document.getElementById('topic-articles').innerHTML = SITE_ARTICLES.map(a => `
        <a class="article-card" href="${a.url}">
            <span class="article-cover ${a.tint}" aria-hidden="true">${a.icon}</span>
            <span class="article-body">
                <span class="article-tag">${escapeHtml(a.tag)}</span>
                <h3>${escapeHtml(a.title)}</h3>
                <p>${escapeHtml(a.text)}</p>
                <span class="read-btn">Read article →</span>
            </span>
        </a>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    renderArticles();
    const list = document.getElementById('topics-list');
    try {
        const topics = await fetchAllRows(() => db.from('topics').select('id, name, slug, category, featured').order('name'));
        if (!topics.length) {
            list.innerHTML = '<p class="page-status">Topics are being added. Please check back soon.</p>';
            return;
        }
        renderPopular(topics);
        const input = document.getElementById('topic-filter-input');
        renderTopics(topics, '');
        input.addEventListener('input', () => renderTopics(topics, input.value));
        // The category links in the header work once the sections exist.
        if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="page-status">Topics could not be loaded right now. Please refresh the page.</p>';
    }
});
