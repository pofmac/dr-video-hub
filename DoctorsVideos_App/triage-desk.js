const SYMPTOM_MAP = [
    { keywords: ['headache', 'migraine', 'head pain'], specialty: 'Neurology' },
    { keywords: ['chest pain', 'heart', 'palpitations', 'cholesterol'], specialty: 'Cardiology' },
    { keywords: ['cough', 'shortness of breath', 'breathing', 'asthma'], specialty: 'Pulmonology' },
    { keywords: ['fever', 'infection', 'flu', 'cold symptoms'], specialty: 'Internal Medicine' },
    { keywords: ['back pain', 'joint pain', 'body aches', 'arthritis'], specialty: 'Orthopedics' },
    { keywords: ['nausea', 'vomiting', 'stomach pain', 'bloating', 'heartburn', 'indigestion', 'diarrhea', 'constipation'], specialty: 'Gastroenterology' },
    { keywords: ['fatigue', 'tired', 'exhaustion', 'low energy'], specialty: 'Internal Medicine' },
    { keywords: ['anxiety', 'depression', 'stress', 'mental health'], specialty: 'Psychiatry' },
    { keywords: ['diabetes', 'blood sugar', 'insulin', 'thyroid'], specialty: 'Endocrinology' },
    { keywords: ['hair loss', 'acne', 'rash', 'skin'], specialty: 'Dermatology' },
    { keywords: ['dizziness', 'lightheaded', 'memory loss', 'balance'], specialty: 'Neurology' },
    { keywords: ['sore throat', 'ear', 'sinus', 'nasal congestion'], specialty: 'ENT' },
    { keywords: ['kidney stones', 'urinary'], specialty: 'Urology' },
    { keywords: ['sleep', 'insomnia', 'snoring'], specialty: 'Sleep Medicine' },
    { keywords: ['pregnancy', 'fertility'], specialty: 'OB/GYN' },
];

function matchSpecialty(userText) {
    const text = userText.toLowerCase();
    const matches = [];
    SYMPTOM_MAP.forEach(entry => {
        const hit = entry.keywords.some(kw => text.includes(kw));
        if (hit && !matches.includes(entry.specialty)) matches.push(entry.specialty);
    });
    return matches;
}

function renderTriageResponse(userText) {
    const responseEl = document.getElementById('triage-response');
    const doctors = window.allDoctors || [];
    const matches = matchSpecialty(userText);

    if (matches.length === 0) {
        responseEl.innerHTML = `
            <div class="triage-bot-msg">
                I couldn't match that to a specialty yet. Try different words,
                or browse the full directory below.
            </div>`;
        return;
    }

    const buttonsHtml = matches.map(specialty => {
        const count = doctors.filter(d => d.specialty === specialty).length;
        return `<button class="triage-suggestion-btn" data-specialty="${specialty}">
                    Show ${specialty} doctors (${count})
                </button>`;
    }).join('');

    responseEl.innerHTML = `
        <div class="triage-bot-msg">
            That could fall under ${matches.join(' or ')}. Want to see who covers that?
        </div>
        <div class="triage-suggestions">${buttonsHtml}</div>`;

    document.querySelectorAll('.triage-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const specialty = btn.dataset.specialty;
            const filtered = doctors.filter(d => d.specialty === specialty);
            renderDoctorCards(filtered, specialty, 'specialty');
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
