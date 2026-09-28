 const SYMPTOM_MAP = [
    { keywords: ['headache', 'migraine', 'head pain'], specialtyMatch: ['neuro'] },
    { keywords: ['chest pain', 'heart', 'palpitations', 'cholesterol'], specialtyMatch: ['cardio', 'heart'] },
    { keywords: ['cough', 'shortness of breath', 'breathing', 'asthma'], specialtyMatch: ['pulmon', 'lung', 'respirat'] },
    { keywords: ['fever', 'infection', 'flu', 'cold symptoms'], specialtyMatch: ['internal medicine', 'family medicine'] },
    { keywords: ['back pain', 'joint pain', 'shoulder pain', 'knee pain', 'hip pain', 'body aches', 'arthritis', 'sports injury'], specialtyMatch: ['orthoped', 'joint', 'bone'] },
    { keywords: ['nausea', 'vomiting', 'stomach pain', 'bloating', 'heartburn', 'indigestion', 'diarrhea', 'constipation'], specialtyMatch: ['gastro', 'digest', 'stomach'] },
    { keywords: ['fatigue', 'tired', 'exhaustion', 'low energy'], specialtyMatch: ['internal medicine', 'family medicine'] },
    { keywords: ['anxiety', 'depression', 'stress', 'mental health'], specialtyMatch: ['psychiat', 'mental health'] },
    { keywords: ['diabetes', 'blood sugar', 'insulin', 'thyroid'], specialtyMatch: ['endocrin', 'diabetes', 'thyroid'] },
    { keywords: ['hair loss', 'acne', 'rash', 'skin'], specialtyMatch: ['dermatolog', 'skin'] },
    { keywords: ['dizziness', 'lightheaded', 'memory loss', 'balance'], specialtyMatch: ['neuro'] },
    { keywords: ['sore throat', 'ear', 'sinus', 'nasal congestion'], specialtyMatch: ['ent', 'ear nose throat', 'otolaryng'] },
    { keywords: ['kidney stones', 'urinary'], specialtyMatch: ['urolog', 'kidney'] },
    { keywords: ['sleep', 'insomnia', 'snoring'], specialtyMatch: ['sleep'] },
    { keywords: ['pregnancy', 'fertility'], specialtyMatch: ['ob/gyn', 'obstetric', 'gynecolog', 'fertility'] },
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
    urolog: 'urology', sleep: 'sleep', 'ob/gyn': "women's health"
};

function isEmergency(userText) {
    const text = userText.toLowerCase();
    return EMERGENCY_KEYWORDS.some(kw => text.includes(kw));
}

function matchSpecialty(userText) {
    const text = userText.toLowerCase();
    const matches = [];
    SYMPTOM_MAP.forEach(entry => {
        const hit = entry.keywords.some(kw => text.includes(kw));
        if (hit) matches.push(entry.specialtyMatch);
    });
    return matches;
}

function findDoctorsForFragments(doctors, fragments) {
    return doctors.filter(d => {
        const spec = (d.specialty || '').toLowerCase();
        return fragments.some(frag => spec.includes(frag));
    });
}

function renderTriageResponse(userText) {
    const responseEl = document.getElementById('triage-response');
    const doctors = window.allDoctors || [];
    const matchGroups = matchSpecialty(userText);
    const emergencyHtml = isEmergency(userText) ? `
        <div class="triage-emergency" role="alert">
            <strong>If this is happening now, call 911.</strong> For a mental health crisis, call or text 988.
            Don't wait for a video.
        </div>` : '';
    const noteHtml = `<div class="triage-note">This desk only suggests which kind of doctor covers a topic. It is not medical advice.</div>`;

    if (matchGroups.length === 0) {
        responseEl.innerHTML = `${emergencyHtml}
            <div class="triage-bot-msg">
                I couldn't match that to a specialty yet. Try different words,
                or browse the full directory below.
            </div>${noteHtml}`;
        return;
    }

    const buttonsHtml = matchGroups.map(fragments => {
        const matchedDocs = findDoctorsForFragments(doctors, fragments);
        const label = SPECIALTY_LABELS[fragments[0]] || fragments[0];
        return `<button class="triage-suggestion-btn" data-fragments='${JSON.stringify(fragments)}'>
                    Show ${label} doctors (${matchedDocs.length})
                </button>`;
    }).join('');

    responseEl.innerHTML = `${emergencyHtml}
        <div class="triage-bot-msg">
            Here's the kind of doctor who talks about that. Want to see their videos?
        </div>
        <div class="triage-suggestions">${buttonsHtml}</div>${noteHtml}`;

    document.querySelectorAll('.triage-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fragments = JSON.parse(btn.dataset.fragments);
            const filtered = findDoctorsForFragments(doctors, fragments);
            renderDoctorCards(filtered, fragments[0], 'specialty');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('triage-input');
    const sendBtn = document.getElementById('triage-send');
    const toggleBtn = document.getElementById('triage-toggle');
    const panel = document.getElementById('triage-panel');

    const openPanel = () => {
        if (!panel) return;
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    }

    // "Ask the AI Symptom Desk" link under the hero search
    document.querySelectorAll('.triage-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openPanel();
            if (input) input.focus();
        });
    });

    // The hero search box runs the same triage lookup.
    const heroInput = document.getElementById('hero-search');
    const heroBtn = document.getElementById('hero-search-btn');
    const handleHeroSearch = () => {
        const text = heroInput ? heroInput.value.trim() : '';
        if (!text) return;
        openPanel();
        renderTriageResponse(text);
    };
    if (heroBtn) heroBtn.addEventListener('click', handleHeroSearch);
    if (heroInput) heroInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHeroSearch();
    });

    document.querySelectorAll('.triage-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const example = chip.dataset.example;
            renderTriageResponse(example);
        });
    });

    if (!input || !sendBtn) return;

    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        renderTriageResponse(text);
        input.value = '';
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
