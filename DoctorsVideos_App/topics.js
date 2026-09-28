// All Topics page: every topic, grouped by category, with a quick filter.
const CATEGORY_ORDER = ['symptom', 'condition', 'procedure', 'specialty'];
const CATEGORY_LABELS = { symptom: 'Symptoms', condition: 'Conditions', procedure: 'Procedures', specialty: 'Specialties' };

function categoryLabel(cat) {
    const key = String(cat || '').toLowerCase().replace(/s$/, '');
    return CATEGORY_LABELS[key] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other topics');
}

function categoryRank(cat) {
    const i = CATEGORY_ORDER.indexOf(String(cat || '').toLowerCase().replace(/s$/, ''));
    return i === -1 ? CATEGORY_ORDER.length : i;
}

function renderTopics(topics, filter) {
    const list = document.getElementById('topics-list');
    const q = filter.trim().toLowerCase();
    const shown = q ? topics.filter(t => t.name.toLowerCase().includes(q)) : topics;
    if (!shown.length) {
        list.innerHTML = `<p class="page-status">No topics match "${escapeHtml(filter)}". Try a shorter word.</p>`;
        return;
    }
    const groups = new Map();
    shown.forEach(t => {
        const label = categoryLabel(t.category);
        if (!groups.has(label)) groups.set(label, { rank: categoryRank(t.category), items: [] });
        groups.get(label).items.push(t);
    });
    list.innerHTML = [...groups.entries()]
        .sort((a, b) => a[1].rank - b[1].rank || a[0].localeCompare(b[0]))
        .map(([label, g]) => `
            <section class="topic-group">
                <h2>${escapeHtml(label)} <span class="topic-count">${g.items.length}</span></h2>
                <div class="topic-chips topic-chips-left">
                    ${g.items.map(t => `<a class="topic-chip${t.featured ? ' topic-chip-featured' : ''}" href="${escapeHtml(topicUrl(t))}">${escapeHtml(t.name)}</a>`).join('')}
                </div>
            </section>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('topics-list');
    try {
        const topics = await fetchAllRows(() => db.from('topics').select('id, name, slug, category, featured').order('name'));
        if (!topics.length) {
            list.innerHTML = '<p class="page-status">Topics are being added. Please check back soon.</p>';
            return;
        }
        const input = document.getElementById('topic-filter-input');
        renderTopics(topics, '');
        input.addEventListener('input', () => renderTopics(topics, input.value));
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="page-status">Topics could not be loaded right now. Please refresh the page.</p>';
    }
});
