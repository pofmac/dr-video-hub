const supabaseUrl = 'https://apodzqtcrlvhrgeluomi.supabase.co';
const supabaseKey = 'sb_publishable_vYjgL6oVtI_Qdvxs3emGlg_9e-slavK';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const ALL_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

let allVideos = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Connecting to Supabase...");

        let { data: doctors, error } = await supabaseClient
            .from('doctors_final')
            .select('*')
            .or('status.neq.pending,status.is.null')
            .limit(1000);

        if (error) throw error;

        console.log(`Fetched ${doctors.length} doctors from live Supabase database!`);

        let { data: videos, error: vidError } = await supabaseClient
            .from('videos')
            .select('*')
            .limit(10000);

        if (vidError) throw vidError;
        allVideos = videos || [];

        console.log(`Fetched ${allVideos.length} videos from live Supabase database!`);

        doctors = doctors.map(doc => {
            const rawState = doc['State'] || doc.state || "";
            const state = rawState.trim() || ALL_STATES[Math.floor(Math.random() * ALL_STATES.length)];

            return {
                db_id: doc.id,
                channel_id: doc['Channel ID'],
                name: doc['Channel Name'] || doc.doctor_name || doc.Channel_Name || "Doctor",
                state: state,
                specialty: doc['Specialty'] || doc.specialty || "Medical Expert",
                video_url: doc['Channel URL'] || doc.video_url || doc.Channel_URL
            };
        });

        window.allDoctors = doctors;

        populateUI(doctors);
        populateStats(doctors);

    } catch(err) {
        console.warn("Could not connect to Supabase. Reverting to local simulation mode...", err);

        const mockDoctors = [];
        ALL_STATES.forEach(state => {
            for(let i=0; i < 5; i++) {
                mockDoctors.push({
                    db_id: Math.random(),
                    name: `Dr. Sample ${state}`,
                    state: state,
                    specialty: i % 2 === 0 ? "Cardiologist" : "Neurologist",
                    video_url: "#"
                });
            }
        });
        window.allDoctors = mockDoctors;
        populateUI(mockDoctors);
    }
});

function populateUI(doctors) {
    setupStateGrid(doctors);
    setupCinemaPlayer(doctors);
}

function populateStats(doctors) {
    const statDoctors = document.getElementById('stat-doctors');
    const statVideos = document.getElementById('stat-videos');
    const statSpecialties = document.getElementById('stat-specialties');

    if (statDoctors) statDoctors.textContent = doctors.length.toLocaleString();
    if (statVideos) statVideos.textContent = allVideos.length.toLocaleString();

    if (statSpecialties) {
        const uniqueSpecialties = new Set(doctors.map(d => d.specialty).filter(Boolean));
        statSpecialties.textContent = uniqueSpecialties.size.toLocaleString();
    }
}

function setupStateGrid(doctors) {
    const grid = document.querySelector('.state-grid');
    if (!grid) return;

    grid.innerHTML = '';

    ALL_STATES.forEach(state => {
        const stateDoctors = doctors.filter(d => d.state === state);

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'state-link';

        if (stateDoctors.length > 0) {
            a.innerHTML = `${state} <span class="doc-count" style="background:#ff4757; color:white; font-size:0.75rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">${stateDoctors.length}</span>`;

            a.addEventListener('click', (e) => {
                e.preventDefault();
                renderDoctorCards(stateDoctors, state, 'state');
            });
        } else {
            a.innerHTML = state;
        }

        grid.appendChild(a);
    });
}

function getVideoForDoctor(dbId) {
    return allVideos.find(v => v.doctor_id === dbId);
}

function playVideoInCinema(doctor) {
    const iframe = document.getElementById('cinema-iframe');
    const caption = document.getElementById('cinema-caption');
    const video = getVideoForDoctor(doctor.db_id);

    if (iframe && video && video.youtube_video_id) {
        iframe.src = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1`;
    }

    if (caption) {
        caption.innerHTML = `<span class="live-pulse"></span><strong>Now Playing:</strong> ${doctor.name} - ${doctor.specialty}`;
    }

    document.querySelector('.cinema-player-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupCinemaPlayer(doctors) {
    const doctorsWithVideos = doctors.filter(d => getVideoForDoctor(d.db_id));
    if (doctorsWithVideos.length === 0) return;

    const randomDoc = doctorsWithVideos[Math.floor(Math.random() * doctorsWithVideos.length)];
    playVideoInCinema(randomDoc);
}

function renderDoctorCards(doctors, label, type = 'state') {
    const resultsHeader = document.getElementById('doctor-results-header');
    const resultsTitle = document.getElementById('doctor-results-title');
    const resultsContainer = document.getElementById('doctor-results');

    if(!resultsContainer) return;

    resultsHeader.style.display = 'block';
    resultsContainer.style.display = 'flex';

    const prefix = type === 'specialty' ? 'Vetted' : 'Vetted Doctors in';
    const suffix = type === 'specialty' ? 'Specialists' : '';
    resultsTitle.innerHTML = `<span style="color:#fff;">${prefix}</span> <span style="background: -webkit-linear-gradient(#0ea5e9, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${label}</span> <span style="color:#fff;">${suffix}</span>`;

    resultsContainer.innerHTML = '';

    doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doctor-card';

        const cleanedName = doc.name.replace(/"/g, '').trim();
        const specialty = doc.specialty ? doc.specialty.toUpperCase() : 'MEDICAL EXPERT';
        const hasVideo = !!getVideoForDoctor(doc.db_id);

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-specialty">${specialty}</div>
                <h3 class="card-name">${cleanedName}</h3>
                <div class="card-state">📍 ${doc.state}</div>
            </div>
            <button class="card-btn" ${hasVideo ? '' : 'disabled'}>
                ${hasVideo ? '▶ Watch Video' : 'No Video Yet'}
            </button>
        `;

        if (hasVideo) {
            card.querySelector('.card-btn').addEventListener('click', () => playVideoInCinema(doc));
        }

        resultsContainer.appendChild(card);
    });

    resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
