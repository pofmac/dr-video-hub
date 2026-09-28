// Ad spaces for DoctorsVideos.video.
//
// To sell a spot, add an entry to SPONSORS below. Any spot without a sponsor shows an
// "Advertise here" box that links to advertise.html. Ads are matched to the page only;
// nothing about what a visitor searches for is sent anywhere.
//
// slot:  'home-banner' | 'blog-banner' | 'article-inline' | 'article-end' | 'state-listing'
// state: only for 'state-listing', the full state name (e.g. 'Texas')
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
};

function escapeAdText(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? url : '#';
}

function findSponsor(slot, extra = {}) {
    const page = location.pathname.split('/').pop() || 'index.html';
    return SPONSORS.find(s => s.slot === slot
        && (!s.page || s.page === page)
        && (!extra.state || s.state === extra.state));
}

function renderAdSlot(el) {
    const slot = el.dataset.adSlot;
    const sponsor = findSponsor(slot);
    if (sponsor) {
        el.innerHTML = `
            <span class="ad-label">Advertisement</span>
            <a class="ad-body" href="${escapeAdText(safeUrl(sponsor.url))}" target="_blank" rel="sponsored noopener">
                ${sponsor.image ? `<img src="${escapeAdText(sponsor.image)}" alt="${escapeAdText(sponsor.name)}">` : ''}
                <strong>${escapeAdText(sponsor.name)}</strong>
                <span>${escapeAdText(sponsor.text)}</span>
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ad-slot]').forEach(renderAdSlot);
});
