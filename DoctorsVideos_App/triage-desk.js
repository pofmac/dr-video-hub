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

    if (matchGroups.length === 0) {
        responseEl.innerHTML = `
            <div class="triage-bot-msg">
                I couldn't match that to a specialty yet. Try different words,
                or browse the full directory below.
            </div>`;
        return;
    }

    const buttonsHtml = matchGroups.map(fragments => {
        const matchedDocs = findDoctorsForFragments(doctors, fragments);
        const label = fragments[0];
        return `<button class="triage-suggestion-btn" data-fragments='${JSON.stringify(fragments)}'>
                    Show doctors (${matchedDocs.length})
                </button>`;
    }).join('');

    responseEl.innerHTML = `
        <div class="triage-bot-msg">
            Here's what might cover that. Want to see who's available?
        </div>
        <div class="triage-suggestions">${buttonsHtml}</div>`;

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

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    }

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
