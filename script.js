/* ===================================
   EXPLOREX - NASA MISSIONS EXPLORER
   JavaScript with NASA API Integration
   =================================== */

// Global variables
let allMissions = []; // Store all mission data
let currentFilter = 'all'; // Current active filter

/* ===================================
   INITIALIZATION ON PAGE LOAD
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeNavigation();
    initializeScrollEffects();
    initializeSearchAndFilter();
    initializeModal();
    loadMissionData();
    loadAPOD(); // Load Astronomy Picture of the Day
    
    // Initialize new features
    initializeStarfieldCanvas(); // Canvas starfield animation
    initializeThemeToggle(); // Dark/Light mode
    initialize3DPlanet(); // 3D rotating planet
    // initializeMissionTimeline() will be called after missions load
    initializeMissionCountdowns(); // Mission launch countdowns
    initializeVoiceAssistant(); // Voice commands
    initializeSpaceFacts(); // Space facts widget
    initializeBackToTop(); // Back to top button
    initializeAPODShare(); // APOD share functionality
});

/* ===================================
   NAVIGATION FUNCTIONALITY
   =================================== */

function initializeNavigation() {
    // Get navigation elements
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.getElementById('navbar');
    
    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            // Change icon between bars and times
            const icon = navToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }
    
    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            const icon = navToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* ===================================
   SMOOTH SCROLL TO MISSIONS SECTION
   =================================== */

function initializeScrollEffects() {
    const exploreBtn = document.getElementById('explore-btn');
    
    if (exploreBtn) {
        exploreBtn.addEventListener('click', function() {
            const missionsSection = document.getElementById('missions');
            if (missionsSection) {
                missionsSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
}

/* ===================================
   SEARCH AND FILTER FUNCTIONALITY
   =================================== */

function initializeSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterMissions();
        });
    }
    
    // Filter button event listeners
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update current filter
            currentFilter = this.getAttribute('data-filter');
            // Filter missions
            filterMissions();
        });
    });
}

/* ===================================
   FILTER MISSIONS BASED ON SEARCH AND CATEGORY
   =================================== */

function filterMissions() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const missionsGrid = document.getElementById('missions-grid');
    const noResults = document.getElementById('no-results');
    
    // Filter missions based on search term and category
    const filteredMissions = allMissions.filter(mission => {
        // Check if mission matches search term
        const matchesSearch = 
            mission.title.toLowerCase().includes(searchTerm) ||
            (mission.description && mission.description.toLowerCase().includes(searchTerm)) ||
            (mission.destination && mission.destination.toLowerCase().includes(searchTerm)) ||
            (mission.keywords && mission.keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm)
            ));
        
        // Check if mission matches category filter using destination property
        const matchesFilter = 
            currentFilter === 'all' || 
            (mission.destination && mission.destination.toLowerCase() === currentFilter.toLowerCase()) ||
            (mission.keywords && mission.keywords.some(keyword => 
                keyword.toLowerCase().includes(currentFilter.toLowerCase())
            )) ||
            (mission.title && mission.title.toLowerCase().includes(currentFilter.toLowerCase()));
        
        return matchesSearch && matchesFilter;
    });
    
    // Display filtered missions
    if (filteredMissions.length > 0) {
        displayMissions(filteredMissions);
        noResults.style.display = 'none';
    } else {
        missionsGrid.innerHTML = '';
        noResults.style.display = 'block';
    }
}

/* ===================================
   LOAD MISSION DATA FROM NASA API
   =================================== */

async function loadMissionData() {
    const loading = document.getElementById('loading');
    const missionsGrid = document.getElementById('missions-grid');
    
    try {
        // Show loading spinner
        loading.style.display = 'block';
        missionsGrid.innerHTML = '';
        
        // Check localStorage cache first for performance
        const cachedData = localStorage.getItem('nasaMissionsCache');
        const cacheTimestamp = localStorage.getItem('nasaMissionsCacheTime');
        const oneDay = 24 * 60 * 60 * 1000; // Cache for 24 hours
        
        if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < oneDay) {
            // Use cached data
            console.log('Using cached mission data');
            allMissions = JSON.parse(cachedData);
            loading.style.display = 'none';
            displayMissions(allMissions);
            
            // Initialize timeline with cached data
            initializeMissionTimeline();
            return;
        }
        
        // NASA Image and Video Library API endpoint
        // Search for space missions with diverse planet targets
        const searchQueries = [
            { query: 'apollo moon mission', target: 'Moon', limit: 3 },
            { query: 'artemis moon', target: 'Moon', limit: 2 },
            { query: 'mars rover perseverance', target: 'Mars', limit: 3 },
            { query: 'mars curiosity', target: 'Mars', limit: 2 },
            { query: 'mars opportunity spirit', target: 'Mars', limit: 2 },
            { query: 'cassini saturn', target: 'Saturn', limit: 3 },
            { query: 'juno jupiter', target: 'Jupiter', limit: 3 },
            { query: 'galileo jupiter', target: 'Jupiter', limit: 2 },
            { query: 'voyager mission', target: 'Jupiter', limit: 2 },
            { query: 'hubble space telescope', target: 'Earth', limit: 3 },
            { query: 'ISS space station', target: 'Earth', limit: 2 }
        ];
        
        // Fetch data from multiple search queries to get diverse missions
        const fetchPromises = searchQueries.map(item => 
            fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(item.query)}&media_type=image`)
                .then(response => response.json())
                .then(data => ({ ...item, data }))
        );
        
        const results = await Promise.all(fetchPromises);
        
        // Process results with balanced distribution across planets
        const uniqueMissions = new Map();
        
        results.forEach(result => {
            if (result.data.collection && result.data.collection.items) {
                const items = result.data.collection.items.slice(0, result.limit);
                
                items.forEach(item => {
                    if (item.data && item.data[0] && item.links && item.links[0]) {
                        const data = item.data[0];
                        const nasaId = data.nasa_id;
                        
                        // Only add unique missions
                        if (!uniqueMissions.has(nasaId)) {
                            uniqueMissions.set(nasaId, {
                                id: nasaId,
                                title: data.title || 'Unknown Mission',
                                description: data.description || 'No description available.',
                                keywords: data.keywords || [],
                                dateCreated: data.date_created || 'Unknown',
                                center: data.center || 'NASA',
                                imageUrl: item.links[0].href,
                                photographer: data.photographer || data.secondary_creator || 'NASA',
                                location: data.location || 'Space',
                                destination: result.target // Added destination tracking
                            });
                        }
                    }
                });
            }
        });
        
        // Convert Map to Array
        allMissions = Array.from(uniqueMissions.values());
        
        // Cache the data in localStorage for performance
        localStorage.setItem('nasaMissionsCache', JSON.stringify(allMissions));
        localStorage.setItem('nasaMissionsCacheTime', Date.now().toString());
        
        // Hide loading and display missions
        loading.style.display = 'none';
        displayMissions(allMissions);
        
        // Initialize timeline after missions are loaded
        initializeMissionTimeline();
        
        console.log(`Loaded ${allMissions.length} missions from NASA API`);
        
    } catch (error) {
        console.error('Error loading mission data:', error);
        loading.innerHTML = `
            <div style="color: #ff6464;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>Failed to load mission data. Please check your internet connection and try again.</p>
                <button onclick="loadMissionData()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #64c8ff; border: none; border-radius: 25px; color: white; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/* ===================================
   DISPLAY MISSIONS AS CARDS
   =================================== */

function displayMissions(missions) {
    const missionsGrid = document.getElementById('missions-grid');
    missionsGrid.innerHTML = '';
    
    missions.forEach((mission, index) => {
        // Extract year from date
        const year = mission.dateCreated ? new Date(mission.dateCreated).getFullYear() : 'Unknown';
        
        // Use destination from mission data, or determine from keywords/title
        let destination = mission.destination || 'Space';
        
        if (!mission.destination) {
            const lowerTitle = mission.title.toLowerCase();
            const keywords = mission.keywords.map(k => k.toLowerCase());
            
            if (keywords.includes('mars') || lowerTitle.includes('mars')) {
                destination = 'Mars';
            } else if (keywords.includes('moon') || lowerTitle.includes('moon') || lowerTitle.includes('apollo') || lowerTitle.includes('artemis')) {
                destination = 'Moon';
            } else if (keywords.includes('jupiter') || lowerTitle.includes('jupiter')) {
                destination = 'Jupiter';
            } else if (keywords.includes('saturn') || lowerTitle.includes('saturn')) {
                destination = 'Saturn';
            } else if (keywords.includes('venus') || lowerTitle.includes('venus')) {
                destination = 'Venus';
            } else if (keywords.includes('earth') || lowerTitle.includes('earth') || lowerTitle.includes('iss') || lowerTitle.includes('hubble')) {
                destination = 'Earth';
            }
            
            // Update mission object with determined destination
            mission.destination = destination;
        }
        
        // Create mission card with lazy loading for images
        const card = document.createElement('div');
        card.className = 'mission-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <img src="${mission.imageUrl}" alt="${mission.title}" class="mission-image" loading="lazy">
            <div class="mission-info">
                <h3 class="mission-name">${mission.title}</h3>
                <div class="mission-details">
                    <p><i class="fas fa-calendar-alt"></i> Year: ${year}</p>
                    <p><i class="fas fa-map-marker-alt"></i> Destination: ${destination}</p>
                    <p><i class="fas fa-building"></i> ${mission.center}</p>
                </div>
                <button class="view-details-btn" onclick="showMissionDetails('${mission.id}')">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
            </div>
        `;
        
        missionsGrid.appendChild(card);
    });
}

/* ===================================
   MODAL FUNCTIONALITY
   =================================== */

function initializeModal() {
    const modal = document.getElementById('mission-modal');
    const closeBtn = document.getElementById('modal-close');
    
    // Close modal when clicking close button
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside the modal content
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

/* ===================================
   SHOW MISSION DETAILS IN MODAL
   =================================== */

function showMissionDetails(missionId) {
    const mission = allMissions.find(m => m.id === missionId);
    
    if (!mission) return;
    
    const modal = document.getElementById('mission-modal');
    const modalBody = document.getElementById('modal-body');
    
    // Extract year from date
    const year = mission.dateCreated ? new Date(mission.dateCreated).getFullYear() : 'Unknown';
    const fullDate = mission.dateCreated ? 
        new Date(mission.dateCreated).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : 'Unknown';
    
    // Create modal content
    modalBody.innerHTML = `
        <h2><i class="fas fa-satellite"></i> ${mission.title}</h2>
        
        <img src="${mission.imageUrl}" alt="${mission.title}" class="modal-image">
        
        <div style="margin: 1.5rem 0;">
            <p><strong><i class="fas fa-calendar-alt"></i> Launch Year:</strong> ${year}</p>
            <p><strong><i class="fas fa-clock"></i> Date Created:</strong> ${fullDate}</p>
            <p><strong><i class="fas fa-building"></i> NASA Center:</strong> ${mission.center}</p>
            ${mission.photographer ? `<p><strong><i class="fas fa-camera"></i> Credit:</strong> ${mission.photographer}</p>` : ''}
            ${mission.location !== 'Space' ? `<p><strong><i class="fas fa-map-pin"></i> Location:</strong> ${mission.location}</p>` : ''}
        </div>
        
        <div style="margin: 1.5rem 0;">
            <h3 style="color: #a864ff; margin-bottom: 1rem;"><i class="fas fa-info-circle"></i> Mission Description</h3>
            <p style="line-height: 1.8;">${mission.description}</p>
        </div>
        
        ${mission.keywords && mission.keywords.length > 0 ? `
            <div style="margin: 1.5rem 0;">
                <h3 style="color: #a864ff; margin-bottom: 1rem;"><i class="fas fa-tags"></i> Keywords</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${mission.keywords.map(keyword => 
                        `<span style="background: rgba(100, 200, 255, 0.2); padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem;">${keyword}</span>`
                    ).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(100, 200, 255, 0.3);">
            <p style="color: #7b8ba3; font-size: 0.9rem;">
                <i class="fas fa-id-badge"></i> NASA ID: ${mission.id}
            </p>
        </div>
    `;
    
    // Show modal
    modal.classList.add('active');
}

/* ===================================
   LOAD NASA APOD (ASTRONOMY PICTURE OF THE DAY)
   =================================== */

async function loadAPOD() {
    try {
        // Check localStorage cache for APOD (cache for current day only)
        const today = new Date().toDateString();
        const cachedAPOD = localStorage.getItem('nasaAPOD');
        const cachedDate = localStorage.getItem('nasaAPODDate');
        
        if (cachedAPOD && cachedDate === today) {
            displayAPOD(JSON.parse(cachedAPOD));
            return;
        }
        
        // NASA APOD API - using DEMO_KEY (works without API key for limited requests)
        const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        const data = await response.json();
        
        // Cache APOD data
        localStorage.setItem('nasaAPOD', JSON.stringify(data));
        localStorage.setItem('nasaAPODDate', today);
        
        displayAPOD(data);
        
    } catch (error) {
        console.error('Error loading APOD:', error);
        // Hide APOD section if it fails
        const apodSection = document.getElementById('apod-section');
        if (apodSection) {
            apodSection.style.display = 'none';
        }
    }
}

function displayAPOD(data) {
    const apodImage = document.getElementById('apod-image');
    const apodTitle = document.getElementById('apod-title');
    const apodDate = document.getElementById('apod-date');
    const apodExplanation = document.getElementById('apod-explanation');
    const apodCredit = document.getElementById('apod-credit');
    
    if (apodImage && apodTitle && apodExplanation) {
        // Handle both image and video media types
        if (data.media_type === 'image') {
            apodImage.src = data.url;
            apodImage.alt = data.title;
            apodImage.style.display = 'block';
        } else if (data.media_type === 'video') {
            // Replace img with iframe for video content
            const videoFrame = document.createElement('iframe');
            videoFrame.src = data.url;
            videoFrame.className = 'apod-video';
            videoFrame.style.width = '100%';
            videoFrame.style.height = '400px';
            videoFrame.style.borderRadius = '10px';
            videoFrame.setAttribute('allowfullscreen', 'true');
            apodImage.replaceWith(videoFrame);
        }
        
        apodTitle.textContent = data.title;
        apodDate.textContent = new Date(data.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        apodExplanation.textContent = data.explanation;
        
        if (apodCredit && data.copyright) {
            apodCredit.innerHTML = `<i class="fas fa-camera"></i> Credit: ${data.copyright}`;
            apodCredit.style.display = 'block';
        } else if (apodCredit) {
            apodCredit.style.display = 'none';
        }
    }
}

/* ===================================
   ADDITIONAL HELPER FUNCTIONS
   =================================== */

// Function to format large numbers
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

/* ===================================
   CANVAS STARFIELD ANIMATION
   =================================== */

function initializeStarfieldCanvas() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create stars array (100-150 stars for performance)
    const stars = [];
    const starCount = 120;
    
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1,
            opacity: Math.random()
        });
    }
    
    let scrollY = 0;
    
    // Animation loop
    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y + scrollY * 0.5, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
            
            // Move star down
            star.y += star.speed;
            
            // Reset star position when it goes off screen
            if (star.y > canvas.height) {
                star.y = -10;
                star.x = Math.random() * canvas.width;
            }
        });
        
        requestAnimationFrame(animateStars);
    }
    
    animateStars();
    
    // Parallax effect on scroll
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY * 0.3;
    });
    
    // Resize handling
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

/* ===================================
   DARK/LIGHT MODE TOGGLE
   =================================== */

function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        
        const isLight = body.classList.contains('light-mode');
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // Save theme preference
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // Glow effect
        themeToggle.style.transform = 'scale(1.2)';
        setTimeout(() => {
            themeToggle.style.transform = 'scale(1)';
        }, 200);
    });
}

/* ===================================
   3D ROTATING PLANET (THREE.JS)
   =================================== */

function initialize3DPlanet() {
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded');
        return;
    }
    
    const container = document.getElementById('planet-canvas-container');
    if (!container) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Create realistic Earth sphere with texture
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Create texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Load Earth texture from NASA's public domain images
    const earthTexture = textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
        () => {
            console.log('Earth texture loaded successfully');
        },
        undefined,
        (error) => {
            console.warn('Earth texture failed to load, using blue color');
        }
    );
    
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 25,
        specular: 0x333333,
        bumpScale: 0.05
    });
    
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
    // Add clouds layer for realism
    const cloudGeometry = new THREE.SphereGeometry(2.01, 64, 64);
    const cloudTexture = textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
        undefined,
        undefined,
        () => {
            console.warn('Cloud texture failed to load');
        }
    );
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
    
    // Add atmospheric glow effect
    const glowGeometry = new THREE.SphereGeometry(2.15, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x64c8ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    // Create orbiting satellites
    const satellites = [];
    const satelliteCount = 3;
    
    for (let i = 0; i < satelliteCount; i++) {
        // Satellite body
        const satGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const satMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0x64c8ff,
            emissiveIntensity: 0.3
        });
        const satellite = new THREE.Mesh(satGeometry, satMaterial);
        
        // Satellite solar panels
        const panelGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.15);
        const panelMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            emissive: 0x111111
        });
        const panel1 = new THREE.Mesh(panelGeometry, panelMaterial);
        const panel2 = new THREE.Mesh(panelGeometry, panelMaterial);
        panel1.position.x = 0.15;
        panel2.position.x = -0.15;
        satellite.add(panel1);
        satellite.add(panel2);
        
        // Orbital parameters
        const orbitRadius = 3 + (i * 0.4);
        const orbitSpeed = 0.01 + (i * 0.003);
        const orbitAngle = (i * Math.PI * 2) / satelliteCount;
        const orbitTilt = (i * Math.PI) / 6;
        
        satellites.push({
            mesh: satellite,
            orbitRadius,
            orbitSpeed,
            angle: orbitAngle,
            tilt: orbitTilt
        });
        
        scene.add(satellite);
        
        // Create orbit path visualization
        const orbitCurve = new THREE.EllipseCurve(
            0, 0,
            orbitRadius, orbitRadius,
            0, 2 * Math.PI,
            false,
            0
        );
        const orbitPoints = orbitCurve.getPoints(100);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x64c8ff,
            transparent: true,
            opacity: 0.2
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitLine.rotation.x = Math.PI / 2 + orbitTilt;
        scene.add(orbitLine);
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x64c8ff, 0.5);
    pointLight.position.set(-5, -3, -5);
    scene.add(pointLight);
    
    camera.position.z = 7;
    
    // Animation state
    let isRotating = true;
    let mouseDown = false;
    let mouseX = 0, mouseY = 0;
    let time = 0;
    
    // Mouse controls
    container.addEventListener('mousedown', (e) => {
        mouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    container.addEventListener('mousemove', (e) => {
        if (mouseDown) {
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            planet.rotation.y += deltaX * 0.01;
            planet.rotation.x += deltaY * 0.01;
            glow.rotation.copy(planet.rotation);
            clouds.rotation.y = planet.rotation.y;
            clouds.rotation.x = planet.rotation.x;
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        }
    });
    
    container.addEventListener('mouseup', () => {
        mouseDown = false;
    });
    
    container.addEventListener('mouseleave', () => {
        mouseDown = false;
    });
    
    // Pause/Resume button
    const pauseBtn = document.getElementById('pause-rotation');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            isRotating = !isRotating;
            pauseBtn.innerHTML = isRotating ? 
                '<i class="fas fa-pause"></i> Pause Rotation' : 
                '<i class="fas fa-play"></i> Resume Rotation';
        });
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.01;
        
        if (isRotating && !mouseDown) {
            planet.rotation.y += 0.005;
            glow.rotation.y += 0.005;
            clouds.rotation.y += 0.0055; // Clouds rotate slightly faster for realism
        }
        
        // Update satellite positions
        satellites.forEach((sat) => {
            sat.angle += sat.orbitSpeed;
            
            sat.mesh.position.x = Math.cos(sat.angle) * sat.orbitRadius;
            sat.mesh.position.z = Math.sin(sat.angle) * sat.orbitRadius;
            sat.mesh.position.y = Math.sin(sat.angle + sat.tilt) * 0.5;
            
            // Make satellites face the planet
            sat.mesh.lookAt(planet.position);
            
            // Rotate satellites on their axis
            sat.mesh.rotation.y += 0.02;
        });
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Resize handling
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Intersection Observer to pause when not visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                isRotating = false;
            }
        });
    });
    
    observer.observe(container);
}

/* ===================================
   MISSION LAUNCH COUNTDOWNS
   =================================== */

function initializeMissionCountdowns() {
    const countdownGrid = document.getElementById('countdown-grid');
    if (!countdownGrid) return;
    
    // Sample upcoming missions with realistic future dates
    const upcomingMissions = [
        {
            name: 'Artemis III',
            destination: 'Moon',
            launchDate: new Date('2026-09-15T12:00:00Z')
        },
        {
            name: 'Europa Clipper',
            destination: 'Jupiter\'s Moon Europa',
            launchDate: new Date('2024-10-10T14:30:00Z')
        },
        {
            name: 'Mars Sample Return',
            destination: 'Mars',
            launchDate: new Date('2027-06-20T10:00:00Z')
        }
    ];
    
    upcomingMissions.forEach((mission, index) => {
        const card = document.createElement('div');
        card.className = 'countdown-card';
        card.style.animationDelay = `${index * 0.2}s`;
        
        card.innerHTML = `
            <div class="countdown-mission-name">${mission.name}</div>
            <div class="countdown-date">
                <i class="fas fa-map-marker-alt"></i> ${mission.destination}
            </div>
            <div class="countdown-date">
                <i class="fas fa-calendar"></i> ${mission.launchDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}
            </div>
            <div class="countdown-timer" data-launch="${mission.launchDate.getTime()}">
                <div class="countdown-unit">
                    <span class="countdown-number days">00</span>
                    <span class="countdown-label">Days</span>
                </div>
                <div class="countdown-unit">
                    <span class="countdown-number hours">00</span>
                    <span class="countdown-label">Hours</span>
                </div>
                <div class="countdown-unit">
                    <span class="countdown-number minutes">00</span>
                    <span class="countdown-label">Minutes</span>
                </div>
                <div class="countdown-unit">
                    <span class="countdown-number seconds">00</span>
                    <span class="countdown-label">Seconds</span>
                </div>
            </div>
        `;
        
        countdownGrid.appendChild(card);
    });
    
    // Update countdowns every second
    function updateCountdowns() {
        const timers = document.querySelectorAll('.countdown-timer');
        const now = new Date().getTime();
        
        timers.forEach(timer => {
            const launchTime = parseInt(timer.getAttribute('data-launch'));
            const distance = launchTime - now;
            
            if (distance > 0) {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                timer.querySelector('.days').textContent = String(days).padStart(2, '0');
                timer.querySelector('.hours').textContent = String(hours).padStart(2, '0');
                timer.querySelector('.minutes').textContent = String(minutes).padStart(2, '0');
                timer.querySelector('.seconds').textContent = String(seconds).padStart(2, '0');
            } else {
                timer.innerHTML = '<div style="color: #64c8ff; font-size: 1.5rem;"><i class="fas fa-rocket"></i> Launched!</div>';
            }
        });
    }
    
    updateCountdowns();
    setInterval(updateCountdowns, 1000);
}

/* ===================================
   MISSION TIMELINE
   =================================== */

function initializeMissionTimeline() {
    const timelineTrack = document.getElementById('timeline-track');
    if (!timelineTrack || allMissions.length === 0) return;
    
    // Sort missions by year
    const sortedMissions = [...allMissions].sort((a, b) => {
        const yearA = a.dateCreated ? new Date(a.dateCreated).getFullYear() : 0;
        const yearB = b.dateCreated ? new Date(b.dateCreated).getFullYear() : 0;
        return yearA - yearB;
    }).slice(0, 15); // Limit to 15 for performance
    
    timelineTrack.innerHTML = '';
    
    sortedMissions.forEach((mission, index) => {
        const year = mission.dateCreated ? new Date(mission.dateCreated).getFullYear() : 'Unknown';
        const destination = mission.destination || 'Space';
        
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="timeline-year">${year}</div>
            <div class="timeline-mission">${truncateText(mission.title, 60)}</div>
            <div class="timeline-destination"><i class="fas fa-map-marker-alt"></i> ${destination}</div>
        `;
        
        timelineTrack.appendChild(item);
    });
}

/* ===================================
   VOICE ASSISTANT (WEB SPEECH API)
   =================================== */

function initializeVoiceAssistant() {
    const voiceBtn = document.getElementById('voice-btn');
    const voiceFeedback = document.getElementById('voice-feedback');
    const voiceStatus = document.getElementById('voice-status');
    
    if (!voiceBtn || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        if (voiceBtn) voiceBtn.style.display = 'none';
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const synth = window.speechSynthesis;
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    
    voiceBtn.addEventListener('click', () => {
        recognition.start();
        voiceBtn.classList.add('active');
        voiceFeedback.classList.add('active');
        voiceStatus.textContent = 'Listening...';
    });
    
    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        voiceStatus.textContent = `You said: "${command}"`;
        
        // Process commands
        let response = 'Command not recognized';
        
        if (command.includes('mars')) {
            filterByDestination('Mars');
            response = 'Showing Mars missions';
        } else if (command.includes('moon')) {
            filterByDestination('Moon');
            response = 'Showing Moon missions';
        } else if (command.includes('jupiter')) {
            filterByDestination('Jupiter');
            response = 'Showing Jupiter missions';
        } else if (command.includes('saturn')) {
            filterByDestination('Saturn');
            response = 'Showing Saturn missions';
        } else if (command.includes('earth')) {
            filterByDestination('Earth');
            response = 'Showing Earth missions';
        } else if (command.includes('all missions')) {
            filterByDestination('all');
            response = 'Showing all missions';
        } else if (command.includes('mission of the day')) {
            document.getElementById('apod-section').scrollIntoView({ behavior: 'smooth' });
            response = 'Here is the astronomy picture of the day';
        }
        
        // Speak response
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.rate = 1.1;
        synth.speak(utterance);
        
        setTimeout(() => {
            voiceFeedback.classList.remove('active');
            voiceBtn.classList.remove('active');
        }, 2000);
    };
    
    recognition.onerror = () => {
        voiceFeedback.classList.remove('active');
        voiceBtn.classList.remove('active');
    };
}

function filterByDestination(destination) {
    currentFilter = destination;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === destination) {
            btn.classList.add('active');
        }
    });
    
    filterMissions();
    
    // Scroll to missions section
    document.getElementById('missions').scrollIntoView({ behavior: 'smooth' });
}

/* ===================================
   SPACE FACTS WIDGET
   =================================== */

function initializeSpaceFacts() {
    const spaceFacts = [
        "The Sun accounts for 99.86% of the mass in our solar system.",
        "One million Earths could fit inside the Sun.",
        "Light from the Sun takes 8 minutes to reach Earth.",
        "Venus is the hottest planet in our solar system.",
        "A day on Venus is longer than its year.",
        "Mars has the largest volcano in the solar system - Olympus Mons.",
        "Jupiter's Great Red Spot is a storm that has raged for over 400 years.",
        "Saturn's rings are made of ice and rock particles.",
        "Neptune has the fastest winds in the solar system at 1,200 mph.",
        "There are more stars in the universe than grains of sand on Earth.",
        "The International Space Station orbits Earth every 90 minutes.",
        "The footprints on the Moon will last for millions of years.",
        "One teaspoon of a neutron star would weigh 6 billion tons.",
        "The Milky Way galaxy is on a collision course with Andromeda.",
        "Space is completely silent - there's no atmosphere to carry sound."
    ];
    
    const factText = document.getElementById('fact-text');
    let currentIndex = 0;
    
    function showFact() {
        factText.style.opacity = '0';
        
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % spaceFacts.length;
            factText.textContent = spaceFacts[currentIndex];
            factText.style.opacity = '1';
        }, 500);
    }
    
    // Change fact every 10 seconds
    setInterval(showFact, 10000);
    
    // Show first fact
    factText.textContent = spaceFacts[0];
}

/* ===================================
   BACK TO TOP BUTTON
   =================================== */

function initializeBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/* ===================================
   APOD SHARE FUNCTIONALITY
   =================================== */

function initializeAPODShare() {
    const shareBtn = document.getElementById('share-apod-btn');
    
    shareBtn.addEventListener('click', () => {
        const apodTitle = document.getElementById('apod-title').textContent;
        const tweetText = `Check out NASA's Astronomy Picture of the Day: ${apodTitle} 🌌 #NASA #ExploreX #APOD`;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        window.open(tweetUrl, '_blank', 'width=550,height=420');
    });
}

// Log when everything is loaded
console.log('%c🚀 ExploreX - NASA Missions Explorer', 'color: #64c8ff; font-size: 20px; font-weight: bold;');
console.log('%cLoaded successfully! Fetching mission data from NASA API...', 'color: #a864ff; font-size: 14px;');
