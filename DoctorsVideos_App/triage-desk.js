 const SYMPTOM_MAP = [
    { keywords: ['headache', 'migraine', 'head pain'], specialtyMatch: ['neuro'] },
    { keywords: ['chest pain', 'heart', 'palpitations', 'cholesterol', 'blood pressure', 'hypertension', 'triglycerides'], specialtyMatch: ['cardio', 'heart'] },
    { keywords: ['cough', 'shortness of breath', 'breathing', 'asthma'], specialtyMatch: ['pulmon', 'lung', 'respirat'] },
    { keywords: ['fever', 'infection', 'flu', 'cold symptoms'], specialtyMatch: ['internal medicine', 'family medicine'] },
    { keywords: ['back pain', 'sciatica', 'neck pain', 'joint pain', 'shoulder pain', 'knee pain', 'hip pain', 'body aches', 'arthritis', 'sports injury', 'wrist', 'elbow', 'hand', 'finger'], specialtyMatch: ['orthoped', 'joint', 'bone'] },
    { keywords: ['nausea', 'vomiting', 'stomach pain', 'bloating', 'heartburn', 'indigestion', 'diarrhea', 'constipation', 'liver', 'fatty liver', 'gut'], specialtyMatch: ['gastro', 'digest', 'stomach'] },
    { keywords: ['fatigue', 'tired', 'exhaustion', 'low energy'], specialtyMatch: ['internal medicine', 'family medicine'] },
    { keywords: ['anxiety', 'depression', 'stress', 'mental health'], specialtyMatch: ['psychiat', 'mental health'] },
    // A diabetes search also suggests the supporting specialties listed in "also".
    { keywords: ['diabetes'], specialtyMatch: ['endocrin', 'diabetes', 'thyroid'],
      also: [['cardio', 'heart'], ['nephro', 'kidney'], ['podiat', 'foot', 'ankle'], ['ophthalmolog', 'eye']] },
    { keywords: ['diabetes', 'blood sugar', 'insulin', 'thyroid', 'weight', 'obesity', 'weight gain', 'belly fat', 'pcos', 'triglycerides'], specialtyMatch: ['endocrin', 'diabetes', 'thyroid'] },
    { keywords: ['weight', 'obesity', 'weight gain', 'belly fat'], specialtyMatch: ['internal medicine', 'family medicine'] },
    { keywords: ['eye', 'vision'], specialtyMatch: ['ophthalmolog', 'eye'] },
    { keywords: ['hair loss', 'acne', 'rash', 'skin'], specialtyMatch: ['dermatolog', 'skin'] },
    { keywords: ['dizziness', 'lightheaded', 'memory loss', 'balance'], specialtyMatch: ['neuro'] },
    { keywords: ['sore throat', 'ear', 'sinus', 'nasal congestion'], specialtyMatch: ['ent', 'ear nose throat', 'otolaryng'] },
    { keywords: ['kidney stones', 'urinary', 'prostate'], specialtyMatch: ['urolog', 'kidney'] },
    { keywords: ['sleep', 'insomnia', 'snoring'], specialtyMatch: ['sleep'] },
    { keywords: ['pregnancy', 'fertility', 'pcos', 'menopause', 'hot flashes'], specialtyMatch: ['ob/gyn', 'obstetric', 'gynecolog', 'fertility'] },
    { keywords: ['foot', 'feet', 'heel', 'plantar', 'bunion', 'toenail', 'big toe', 'ankle', 'arch pain', 'flat feet', 'neuropathy in feet', 'running shoes', 'shoe'], specialtyMatch: ['podiat', 'foot', 'ankle'] },
];

// Specialty guide pages suggested when a search mentions that body area.
const GUIDE_LINKS = [
    { re: /\b(knee|knees|hip|hips|acl|meniscus)\b/i, name: 'Hip & Knee guide', href: 'hip-and-knee.html' },
    { re: /\b(foot|feet|heel|ankle|toe|toes|toenail|plantar|bunion|achilles|arch)\b/i, name: 'Foot & Ankle guide', href: 'foot-and-ankle.html' },
];

// Phrases that should always get an emergency message first.
const EMERGENCY_KEYWORDS = [
    'chest pain', "can't breathe", 'cant breathe', 'trouble breathing', 'difficulty breathing', 'stroke',
    'face drooping', 'slurred speech', 'unconscious', 'passed out', 'seizure', 'severe bleeding',
    'overdose', 'suicid', 'kill myself', 'self harm', 'self-harm'
];

// Friendly names for the specialty buttons, keyed by each group's first match fragment.
const SPECIALTY_LABELS = {
    neuro: 'neurology', cardio: 'heart', pulmon: 'lung', 'internal medicine': 'primary care', orthoped: 'bone & joint',
    gastro: 'digestive', psychiat: 'mental health', endocrin: 'hormone & diabetes', dermatolog: 'skin', ent: 'ear, nose & throat',
    urolog: 'urology', sleep: 'sleep', 'ob/gyn': "women's health", podiat: 'foot & ankle',
    ophthalmolog: 'eye', nephro: 'kidney'
};

function isEmergency(userText) {
    const text = userText.toLowerCase();
    return EMERGENCY_KEYWORDS.some(kw => text.includes(kw));
}

function matchSpecialty(userText) {
    const text = userText.toLowerCase();
    const hits = SYMPTOM_MAP.filter(entry => entry.keywords.some(kw => text.includes(kw)));
    const seen = new Set();
    const main = [];
    const also = [];
    // Main specialties first, each shown once; then any supporting ("Also:") specialties.
    hits.forEach(entry => {
        if (seen.has(entry.specialtyMatch[0])) return;
        seen.add(entry.specialtyMatch[0]);
        main.push({ fragments: entry.specialtyMatch, also: false });
    });
    hits.forEach(entry => (entry.also || []).forEach(fragments => {
        if (seen.has(fragments[0])) return;
        seen.add(fragments[0]);
        also.push({ fragments, also: true });
    }));
    return main.concat(also);
}

function findDoctorsForFragments(doctors, fragments) {
    return doctors.filter(d => {
        const spec = (d.specialty || '').toLowerCase();
        return fragments.some(frag => spec.includes(frag));
    });
}

function renderTriageResponse(userText) {
    const responseEl = document.getElementById('triage-response');
    if (!responseEl) return;
    responseEl.hidden = false;
    const doctors = window.allDoctors || [];
    const matchGroups = matchSpecialty(userText);
    const emergencyHtml = isEmergency(userText) ? `
        <div class="triage-emergency" role="alert">
            <strong>If this is happening now, call 911.</strong> For a mental health crisis, call or text 988.
            Don't wait for a video.
        </div>` : '';
    const noteHtml = `<div class="triage-note">This only points you to the kind of doctor who covers a topic. It is not medical advice.</div>`;

    const topics = (typeof matchTopics === 'function' ? matchTopics(userText) : [])
        .concat(GUIDE_LINKS.filter(g => g.re.test(userText)).map(g => ({ name: g.name, href: g.href })));
    const topicsHtml = topics.length ? `
        <div class="triage-bot-msg">Videos on this topic:</div>
        <div class="triage-topics">${topics.map(t => `<a class="triage-topic-link" href="${escapeHtml(topicUrl(t))}">${escapeHtml(t.name)} →</a>`).join('')}</div>` : '';

    if (matchGroups.length === 0 && topics.length) {
        responseEl.innerHTML = `${emergencyHtml}${topicsHtml}${noteHtml}`;
        return;
    }

    if (matchGroups.length === 0) {
        responseEl.innerHTML = `${emergencyHtml}
            <div class="triage-bot-msg">
                I couldn't match that to a specialty yet. Try different words,
                or browse the full directory below.
            </div>${noteHtml}`;
        return;
    }

    const buttonsHtml = matchGroups.map(group => {
        const fragments = group.fragments;
        const matchedDocs = findDoctorsForFragments(doctors, fragments);
        const label = SPECIALTY_LABELS[fragments[0]] || fragments[0];
        return `<button class="triage-suggestion-btn" data-fragments='${JSON.stringify(fragments)}'>
                    ${group.also ? 'Also:' : 'Show'} ${label} doctors (${matchedDocs.length})
                </button>`;
    }).join('');

    responseEl.innerHTML = `${emergencyHtml}${topicsHtml}
        <div class="triage-bot-msg">
            These doctors talk about that. Pick one to see who's on the site:
        </div>
        <div class="triage-suggestions">${buttonsHtml}</div>${noteHtml}`;

    document.querySelectorAll('.triage-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fragments = JSON.parse(btn.dataset.fragments);
            const filtered = findDoctorsForFragments(doctors, fragments);
            const label = (SPECIALTY_LABELS[fragments[0]] || fragments[0]).replace(/\b\w/g, c => c.toUpperCase());
            renderDoctorCards(filtered, label, 'specialty');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const heroInput = document.getElementById('hero-search');
    const heroBtn = document.getElementById('hero-search-btn');
    const results = document.getElementById('triage-response');

    const runSearch = (text) => {
        const query = (text || '').trim();
        if (!query) return;
        renderTriageResponse(query);
        results?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    if (heroBtn) heroBtn.addEventListener('click', () => runSearch(heroInput?.value));
    if (heroInput) heroInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') runSearch(heroInput.value);
    });

    // Popular topic buttons fill the search box and run the search.
    document.querySelectorAll('.topic-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.dataset.href) { location.href = chip.dataset.href; return; }
            if (heroInput) heroInput.value = chip.textContent.trim();
            runSearch(chip.dataset.topic);
        });
    });
});
