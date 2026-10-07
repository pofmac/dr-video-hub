// Ad spaces for DoctorsVideos.video.
//
// Ads come from the Supabase table `sponsored_placements` (rows with active = true and today
// between start_date and end_date, when those are set). Set placement_location to one of:
//   home-banner | blog-banner | article-inline | article-end
//   topic            (every topic page)      topic:back-pain   (one topic page, by slug)
//   state:Texas      (top of that state's doctor results)
// You can also hard-code sponsors in the SPONSORS list below.
// Any spot without a sponsor shows an "Advertise here" box linking to advertise.html.
// Ads are matched to the page only; nothing about what a visitor searches for is sent anywhere.
//
// slot:  'home-banner' | 'blog-banner' | 'article-inline' | 'article-end' | 'topic-sponsor' | 'state-listing'
// state: only for 'state-listing', the full state name (e.g. 'Texas')
// topic: optional for 'topic-sponsor', the topic slug (e.g. 'back-pain')
// page:  optional, limits an article ad to one page file (e.g. 'insulin-weight-gain.html')
const SPONSORS = [
    // Example (remove the // to switch it on):
    // { slot: 'state-listing', state: 'Texas', name: 'Lone Star Physical Therapy',
    //   text: 'Back and knee pain specialists in Austin. New patients seen this week.',
    //   url: 'https://example.com', phone: '(512) 555-0100' },
];

const AD_SLOT_PITCH = {
    'home-banner': 'Reach people researching their symptoms, right on the home page.',
    'blog-banner': 'Put your practice in front of readers of our health articles.',
    'article-inline': 'Reach readers of this article.',
    'article-end': 'Reach readers who just finished this article.',
    'topic-sponsor': 'Reach people researching this exact health topic.',
};

let dbSponsors = [];

// Turn a sponsored_placements row into the same shape as a SPONSORS entry.
function placementToSponsor(row) {
    const loc = String(row.placement_location || '').trim();
    const [kind, ...rest] = loc.split(':');
    const value = rest.join(':').trim();
    const base = { name: row.sponsor_name, headline: row.headline, text: row.body, url: row.target_url, image: row.image_url };
    if (kind === 'state') return { ...base, slot: 'state-listing', state: value };
    if (kind === 'topic') return { ...base, slot: 'topic-sponsor', topic: value || undefined };
    return { ...base, slot: kind };
}

async function loadSponsoredPlacements() {
    if (typeof db === 'undefined') return;
    try {
        const { data, error } = await db.from('sponsored_placements')
            .select('sponsor_name, headline, body, image_url, target_url, placement_location, start_date, end_date')
            .eq('active', true);
        if (error) throw error;
        const today = new Date().toISOString().slice(0, 10);
        dbSponsors = (data || [])
            .filter(r => (!r.start_date || r.start_date <= today) && (!r.end_date || r.end_date >= today))
            .map(placementToSponsor);
    } catch (err) {
        console.warn('Could not load sponsored placements', err);
    }
}

function escapeAdText(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? url : '#';
}

function currentTopicSlug() {
    return new URLSearchParams(location.search).get('slug') || '';
}

function findSponsor(slot, extra = {}) {
    const page = location.pathname.split('/').pop() || 'index.html';
    const topic = slot === 'topic-sponsor' ? currentTopicSlug() : '';
    const candidates = [...dbSponsors, ...SPONSORS].filter(s => s.slot === slot
        && (!s.page || s.page === page)
        && (!extra.state || s.state === extra.state)
        && (!s.topic || s.topic === topic));
    // A sponsor for this exact topic beats one for every topic page.
    return candidates.find(s => s.topic) || candidates[0];
}

function renderAdSlot(el) {
    const slot = el.dataset.adSlot;
    const sponsor = findSponsor(slot);
    if (sponsor) {
        el.innerHTML = `
            <span class="ad-label">Advertisement</span>
            <a class="ad-body" href="${escapeAdText(safeUrl(sponsor.url))}" target="_blank" rel="sponsored noopener">
                ${sponsor.image ? `<img src="${escapeAdText(sponsor.image)}" alt="${escapeAdText(sponsor.name)}">` : ''}
                <strong>${escapeAdText(sponsor.headline || sponsor.name)}</strong>
                <span>${escapeAdText(sponsor.text)}</span>
                ${sponsor.headline ? `<span class="ad-sponsor-name">${escapeAdText(sponsor.name)}</span>` : ''}
            </a>`;
    } else {
        el.innerHTML = `
            <span class="ad-label">Advertisement</span>
            <a class="ad-body ad-placeholder" href="advertise.html?spot=${encodeURIComponent(slot)}">
                <strong>Advertise here</strong>
                <span>${escapeAdText(AD_SLOT_PITCH[slot] || 'Reach people researching their health.')}</span>
            </a>`;
    }
}

// Card shown at the top of a state's doctor results. Called from app.js.
function stateSponsorCardHtml(state) {
    const sponsor = findSponsor('state-listing', { state });
    if (sponsor) {
        return `
            <div class="doctor-card sponsor-card">
                <div class="card-inner">
                    <div class="card-specialty">SPONSORED</div>
                    <h3 class="card-name">${escapeAdText(sponsor.name)}</h3>
                    <div class="card-state">${escapeAdText(sponsor.text)}</div>
                    ${sponsor.phone ? `<div class="card-state">📞 ${escapeAdText(sponsor.phone)}</div>` : ''}
                </div>
                <a class="card-btn" href="${escapeAdText(safeUrl(sponsor.url))}" target="_blank" rel="sponsored noopener">Visit website</a>
            </div>`;
    }
    return `
        <div class="doctor-card sponsor-card sponsor-open">
            <div class="card-inner">
                <div class="card-specialty">SPONSORED SPOT</div>
                <h3 class="card-name">Your clinic here</h3>
                <div class="card-state">Be the first practice people see when they look for doctors in ${escapeAdText(state)}.</div>
            </div>
            <a class="card-btn" href="advertise.html?spot=state-listing&amp;state=${encodeURIComponent(state)}">Advertise in ${escapeAdText(state)}</a>
        </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-ad-slot]').forEach(renderAdSlot);
    await loadSponsoredPlacements();
    if (dbSponsors.length) document.querySelectorAll('[data-ad-slot]').forEach(renderAdSlot);
});
