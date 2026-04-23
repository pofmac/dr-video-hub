const supabaseUrl = 'https://apodzqtcrlvhrgeluomi.supabase.co';
const supabaseKey = 'sb_publishable_vYjgL6oVtI_Qdvxs3emGlg_9e-slavK';

// Initialize Supabase Client
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ALL_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Connecting to Supabase...");
        
        let { data: doctors, error } = await supabase
            .from('doctors_final')
            .select('*')
            .limit(1000); // Fetch up to 1000 records

        if (error) {
            console.error("Supabase connection error:", error);
            throw error; // Jump to catch block
        }

        console.log(`Fetched ${doctors.length} doctors from live Supabase database!`);
        
        // Ensure every doctor has a state for the mockup (until the new CSV is uploaded to Supabase)
        doctors = doctors.map(doc => {
            const state = doc.state || ALL_STATES[Math.floor(Math.random() * ALL_STATES.length)];
            return {
                id: doc.id,
                name: doc.doctor_name || doc.Channel_Name || "Doctor",
                state: state,
                specialty: doc.specialty || "Medical Expert",
                video_url: doc.video_url || doc.Channel_URL
            };
        });

        populateUI(doctors);
        
    } catch(err) {
        console.warn("Could not connect to Supabase (key might be invalid or tables not pubilcly accessible). Reverting to local simulation mode...");
        
        // --- SIMULATION MODE ---
        // If the key is incorrect or database fails, we show 5 simulated doctors per state so the site looks amazing.
        const mockDoctors = [];
        ALL_STATES.forEach(state => {
            for(let i=0; i < 5; i++) {
                mockDoctors.push({
                    id: Math.random(),
                    name: `Dr. Sample ${state}`,
                    state: state,
                    specialty: i % 2 === 0 ? "Cardiologist" : "Neurologist",
                    video_url: "#"
                });
            }
        });
        populateUI(mockDoctors);
    }
});

function populateUI(doctors) {
    setupStateGrid(doctors);
    setupCinemaPlayer(doctors);
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
                renderDoctorCards(stateDoctors, state);
            });
        } else {
            a.innerHTML = state;
        }
        
        grid.appendChild(a);
    });
}

function setupCinemaPlayer(doctors) {
    if (doctors.length === 0) return;
    
    const randomDoc = doctors[Math.floor(Math.random() * doctors.length)];
    const caption = document.querySelector('.cinema-caption');
    
    if (caption && randomDoc) {
        caption.innerHTML = `<span class="live-pulse"></span><strong>Live Portal:</strong> ${randomDoc.name} - ${randomDoc.specialty}`;
    }
}

function renderDoctorCards(doctors, stateName) {
    const resultsHeader = document.getElementById('doctor-results-header');
    const resultsTitle = document.getElementById('doctor-results-title');
    const resultsContainer = document.getElementById('doctor-results');
    
    if(!resultsContainer) return;
    
    resultsHeader.style.display = 'block';
    resultsContainer.style.display = 'flex';
    resultsTitle.innerHTML = `<span style="color:#fff;">Vetted Doctors in</span> <span style="background: -webkit-linear-gradient(#0ea5e9, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${stateName}</span>`;
    
    resultsContainer.innerHTML = '';
    
    doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        
        // Clean up the name a bit in case it has quotes
        const cleanedName = doc.name.replace(/"/g, '').trim();
        const specialty = doc.specialty ? doc.specialty.toUpperCase() : 'MEDICAL EXPERT';
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-specialty">${specialty}</div>
                <h3 class="card-name">${cleanedName}</h3>
                <div class="card-state">📍 ${doc.state}</div>
            </div>
            <a href="${doc.video_url}" target="_blank" class="card-btn">▶ Watch Videos</a>
        `;
        resultsContainer.appendChild(card);
    });
    
    // Smooth scroll down to the results
    resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
