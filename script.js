// API Keys (Note: In production, these should be secured via a backend)
const OPENWEATHER_API_KEY = '46611c7c5329683082d7027c4b5a856e'; // Get from https://openweathermap.org/api

// Global state
let userEnergy = 'medium';
let currentWeather = null;
let userLocation = null;
let currentTime = new Date();
let tasks = JSON.parse(localStorage.getItem('tempus_tasks')) || [];
let isPlaying = false;
let currentPlaylist = null;
let currentTask = null;
let timerInterval = null;
let timerDuration = 0;
let timerRemaining = 0;
let timerPaused = true;
let weatherAnimation = null;
let ytPlayer = null;
let currentTrackIndex = 0;

// DOM Elements
const weatherIcon = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const weatherDescriptionEl = document.getElementById('weather-description');
const locationEl = document.getElementById('location');
const energyButtons = document.querySelectorAll('.energy-btn');
const currentTimeEl = document.getElementById('current-time');
const currentDateEl = document.getElementById('current-date');
const taskForm = document.getElementById('add-task-form');
const taskList = document.getElementById('task-list');
const sortSelect = document.getElementById('sort-tasks');
const themeToggle = document.getElementById('theme-toggle');
const weatherCanvas = document.getElementById('weather-canvas');
const modal = document.getElementById('task-modal');
const closeModal = document.getElementById('close-modal');
const modalTaskTitle = document.getElementById('modal-task-title');
const timerDisplay = document.getElementById('timer-display');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const playlistCover = document.getElementById('playlist-cover');
const playlistTitle = document.getElementById('playlist-title');
const playlistDescription = document.getElementById('playlist-description');
const playPauseBtn = document.getElementById('play-pause');
const prevTrackBtn = document.getElementById('prev-track');
const nextTrackBtn = document.getElementById('next-track');

// Playlists for different task types
const playlists = {
    workout: {
        title: "Workout Mix",
        description: "Energy-boosting tracks for your workout",
        cover: "🏋️",
        tracks: [
            "Eye of the Tiger - Survivor",
            "Stronger - Kanye West",
            "Can't Hold Us - Macklemore & Ryan Lewis",
            "Till I Collapse - Eminem",
            "Work B**ch - Britney Spears",
            "Channa Mereya"
        ]
    },
    creative: {
        title: "Creative Flow",
        description: "Music to enhance your creativity",
        cover: "🎨",
        tracks: [
            "Weightless - Marconi Union",
            "Strawberry Swing - Coldplay",
            "Sunflower - Post Malone & Swae Lee",
            "Riverside - Agnes Obel",
            "Experience - Ludovico Einaudi"
        ]
    },
    focus: {
        title: "Deep Focus",
        description: "Concentration music for deep work",
        cover: "📚",
        tracks: [
            "Alpha Waves - Brain Power",
            "Study Music - Concentration",
            "Memory Consolidation - Intelligent Brain",
            "Focus Rhythm - Mind Energy",
            "Learning Enhancer - Cognitive Boost"
        ]
    },
    relax: {
        title: "Chill Vibes",
        description: "Relaxing music for downtime",
        cover: "😌",
        tracks: [
            "Baarishein - Anuv Jain",
            "Arz kiya Hai - Anuv Jain",
            "Cherathukal (From Kumbalangi Nights)",
            "Blue - young kai",
            "Finding Her",
            "Jhol x Jhol | Full Version | Remix Song | Classic Version"
        ]
    }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set up energy level buttons
    energyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            energyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userEnergy = btn.dataset.energy;
            updateAllTaskScores();
        });
    });
    
    // Set up task form
    taskForm.addEventListener('submit', addNewTask);
    
    // Set up sort selector
    sortSelect.addEventListener('change', renderTasks);
    
    // Set up theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Set up modal controls
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        stopTimer();
    });
    
    // Set up timer controls
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
    
    // Set up player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevTrackBtn.addEventListener('click', playPreviousTrack);
    nextTrackBtn.addEventListener('click', playNextTrack);
    
    // Close modal if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            stopTimer();
        }
    });
    
    // Get user's location and weather
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                getWeatherData();
                getLocationName();
            },
            error => {
                console.error('Error getting location:', error);
                // Default to a major city if location access is denied
                userLocation = { lat: 40.7128, lon: -74.0060 }; // New York
                getWeatherData();
                locationEl.textContent = "New York, US";
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
    
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Set initial theme based on time
    setThemeBasedOnTime();
    
    // Render existing tasks
    renderTasks();
}

function updateClock() {
    currentTime = new Date();
    const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    
    currentTimeEl.textContent = timeStr;
    currentDateEl.textContent = dateStr;
}

function getWeatherData() {
    if (!userLocation) return;
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Weather data not available');
            }
            return response.json();
        })
        .then(data => {
            currentWeather = data;
            updateWeatherUI();
            updateAllTaskScores();
            startWeatherAnimation();
        })
        .catch(error => {
            console.error('Error fetching weather:', error);
            weatherDescriptionEl.textContent = 'Weather data unavailable';
        });
}

function getLocationName() {
    if (!userLocation) return;
    
    const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${userLocation.lat}&lon=${userLocation.lon}&limit=1&appid=${OPENWEATHER_API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Location data not available');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                const location = data[0];
                locationEl.textContent = `${location.name}, ${location.country}`;
            }
        })
        .catch(error => {
            console.error('Error fetching location:', error);
        });
}

function updateWeatherUI() {
    if (!currentWeather) return;
    
    const temp = Math.round(currentWeather.main.temp);
    const description = currentWeather.weather[0].description;
    const iconCode = currentWeather.weather[0].icon;
    
    temperatureEl.textContent = `${temp}°C`;
    weatherDescriptionEl.textContent = description;
    
    // Set appropriate weather icon
    const iconMap = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '⛅',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌦️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
    };
    
    weatherIcon.textContent = iconMap[iconCode] || '🌤️';
}

function startWeatherAnimation() {
    if (!currentWeather) return;
    
    const ctx = weatherCanvas.getContext('2d');
    weatherCanvas.width = window.innerWidth;
    weatherCanvas.height = window.innerHeight;
    
    // Clear any existing animation
    if (weatherAnimation) {
        cancelAnimationFrame(weatherAnimation);
    }
    
    const weatherMain = currentWeather.weather[0].main;
    
    if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
        startRainAnimation(ctx);
    } else if (weatherMain.includes('snow')) {
        startSnowAnimation(ctx);
    }
}

function startRainAnimation(ctx) {
    const raindrops = [];
    const raindropCount = 100;
    
    for (let i = 0; i < raindropCount; i++) {
        raindrops.push({
            x: Math.random() * weatherCanvas.width,
            y: Math.random() * weatherCanvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 5 + 5,
            opacity: Math.random() * 0.5 + 0.3
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
        
        ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < raindrops.length; i++) {
            const raindrop = raindrops[i];
            
            ctx.beginPath();
            ctx.moveTo(raindrop.x, raindrop.y);
            ctx.lineTo(raindrop.x, raindrop.y + raindrop.length);
            ctx.stroke();
            
            raindrop.y += raindrop.speed;
            
            if (raindrop.y > weatherCanvas.height) {
                raindrop.y = -raindrop.length;
                raindrop.x = Math.random() * weatherCanvas.width;
            }
        }
        
        weatherAnimation = requestAnimationFrame(animate);
    }
    
    animate();
}

function startSnowAnimation(ctx) {
    const snowflakes = [];
    const snowflakeCount = 100;
    
    for (let i = 0; i < snowflakeCount; i++) {
        snowflakes.push({
            x: Math.random() * weatherCanvas.width,
            y: Math.random() * weatherCanvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1,
            wind: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.5 + 0.5
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < snowflakes.length; i++) {
            const snowflake = snowflakes[i];
            
            ctx.beginPath();
            ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
            ctx.fill();
            
            snowflake.y += snowflake.speed;
            snowflake.x += snowflake.wind;
            
            if (snowflake.y > weatherCanvas.height) {
                snowflake.y = -snowflake.radius;
                snowflake.x = Math.random() * weatherCanvas.width;
            }
            
            if (snowflake.x > weatherCanvas.width || snowflake.x < 0) {
                snowflake.x = Math.random() * weatherCanvas.width;
            }
        }
        
        weatherAnimation = requestAnimationFrame(animate);
    }
    
    animate();
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    }
}

function setThemeBasedOnTime() {
    const hour = new Date().getHours();
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        if (savedTheme === 'dark') {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    } else {
        // Auto-set theme based on time (6pm to 6am is dark mode)
        if (hour >= 18 || hour < 6) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    }
}

function addNewTask(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const typeSelect = document.getElementById('task-type');
    const locationInput = document.getElementById('task-location');
    const durationInput = document.getElementById('task-duration');
    
    const newTask = {
        id: Date.now(),
        title: titleInput.value,
        type: typeSelect.value,
        location: locationInput.value,
        duration: parseInt(durationInput.value),
        score: 50, // Default score
        added: new Date().toISOString(),
        completed: false
    };
    
    // Calculate initial score
    calculateTaskScore(newTask);
    
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    
    // Reset form
    titleInput.value = '';
    typeSelect.value = 'indoor';
    locationInput.value = '';
    durationInput.value = '30';
}

function calculateTaskScore(task) {
    if (!currentWeather) {
        task.score = 50;
        return;
    }
    
    let score = 50; // Base score
    
    // Adjust based on weather and task type
    const weatherMain = currentWeather.weather[0].main;
    const temp = currentWeather.main.temp;
    const isRaining = weatherMain.includes('rain') || weatherMain.includes('drizzle');
    const isSnowing = weatherMain.includes('snow');
    const isClear = weatherMain === 'Clear';
    const isCloudy = weatherMain.includes('cloud');
    const hour = currentTime.getHours();
    const isDaytime = hour > 6 && hour < 18;
    
    switch(task.type) {
        case 'outdoor':
            if (isRaining || isSnowing) score -= 30;
            if (isClear) score += 20;
            if (temp > 30 || temp < 5) score -= 15; // Too hot or too cold
            if (!isDaytime) score -= 10; // Not daytime
            break;
            
        case 'indoor':
            if (isRaining || isSnowing) score += 10; // Good day to stay indoors
            if (isClear && temp > 15 && temp < 27) score -= 5; // Nice weather, maybe go outside
            break;
            
        case 'creative':
            if (isRaining) score += 10; // Rain can be good for creativity
            if (isClear) score -= 5; // Might be distracted by nice weather
            if (hour >= 22 || hour <= 6) score += 5; // Often more creative at night
            break;
            
        case 'administrative':
            // Less affected by weather
            if (isRaining) score += 5; // No temptation to go outside
            if (hour >= 9 && hour <= 17) score += 5; // Best during working hours
            break;
            
        case 'errand':
            if (isRaining || isSnowing) score -= 20;
            if (isClear && temp > 15 && temp < 27) score += 10;
            if (hour >= 9 && hour <= 17) score += 5; // Best during business hours
            break;
            
        case 'workout':
            if (isRaining && task.location?.toLowerCase().includes('outdoor')) score -= 25;
            if (isClear) score += 10;
            if (temp > 25) score -= 5; // Too hot for intense workout
            // Best times for workout based on research
            if (hour >= 6 && hour <= 10) score += 10; // Morning
            if (hour >= 16 && hour <= 19) score += 5; // Late afternoon
            break;
            
        case 'learning':
            if (isRaining) score += 5; // Good time to study
            if (isClear) score -= 5; // Might be distracted by nice weather
            if (hour >= 19 || hour <= 10) score += 5; // Often better focus during these hours
            break;
            
        case 'social':
            if (isRaining) score -= 15;
            if (isClear) score += 15;
            if (temp > 20 && temp < 27) score += 10; // Perfect temperature for socializing
            // Evenings and weekends are better for social activities
            const isWeekend = [0, 6].includes(currentTime.getDay());
            if (isWeekend) score += 10;
            if (hour >= 17) score += 5;
            break;
    }
    
    // Adjust based on user energy level
    switch(userEnergy) {
        case 'low':
            if (task.type === 'administrative') score += 5;
            if (task.type === 'creative') score -= 15;
            if (task.type === 'workout') score -= 20;
            break;
            
        case 'medium':
            // Medium energy is the baseline, no adjustment
            break;
            
        case 'high':
            if (task.type === 'creative') score += 10;
            if (task.type === 'outdoor') score += 10;
            if (task.type === 'workout') score += 15;
            if (task.type === 'administrative') score -= 5;
            break;
    }
    
    // Adjust based on task duration and current time
    const timeUntilEvening = 18 - currentTime.getHours();
    if (task.duration > timeUntilEvening * 60 && timeUntilEvening > 0) {
        score -= 5; // Task might run into evening
    }
    
    // Ensure score is between 0-100
    task.score = Math.max(0, Math.min(100, score));
}

function updateAllTaskScores() {
    tasks.forEach(task => {
        if (!task.completed) {
            calculateTaskScore(task);
        }
    });
    saveTasks();
    renderTasks();
}

function renderTasks() {
    if (tasks.length === 0) {
        taskList.innerHTML = '<div class="loading">No tasks yet. Add one above!</div>';
        return;
    }
    const incompleteTasks = tasks.filter(task => !task.completed);
    if (incompleteTasks.length === 0) {
        taskList.innerHTML = '<div class="loading">All tasks completed! Add a new one.</div>';
        return;
    }
    let sortedTasks = [...incompleteTasks];
    const sortValue = sortSelect.value;
    if (sortValue === 'score') {
        sortedTasks.sort((a, b) => b.score - a.score);
    } else if (sortValue === 'added') {
        sortedTasks.sort((a, b) => new Date(b.added) - new Date(a.added));
    } else if (sortValue === 'type') {
        sortedTasks.sort((a, b) => a.type.localeCompare(b.type));
    }
    taskList.innerHTML = '';
    sortedTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item ${task.type} fade-in`;
        let priorityClass = 'priority-medium';
        if (task.score >= 70) priorityClass = 'priority-high';
        else if (task.score <= 30) priorityClass = 'priority-low';
        const addedDate = new Date(task.added);
        const formattedDate = addedDate.toLocaleDateString();
        // Show start button for workout, focus, relax, learning
        const showStartBtn = ['workout', 'focus', 'learning','relax'].includes(task.type);
        taskEl.innerHTML = `
            <div class="task-info">
                <div class="task-title">
                    <i class="fas ${getTaskIcon(task.type)}"></i>
                    ${task.title}
                </div>
                <div class="task-meta">
                    <span>${task.type}</span>
                    <span>${task.duration} min</span>
                    <span>Added: ${formattedDate}</span>
                    ${task.location ? `<span><i class="fas fa-map-marker-alt"></i> ${task.location}</span>` : ''}
                </div>
            </div>
            <div class="task-score ${priorityClass}">${Math.round(task.score)}</div>
            <div class="task-actions">
                ${showStartBtn ? `
                    <button class="task-btn btn-start" data-id="${task.id}">
                        <i class="fas fa-play"></i>
                    </button>
                ` : ''}
                <button class="task-btn btn-complete" data-id="${task.id}">
                    <i class="fas fa-check"></i>
                </button>
                <button class="task-btn btn-delete" data-id="${task.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        taskList.appendChild(taskEl);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(btn.dataset.id);
            completeTask(taskId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(btn.dataset.id);
            deleteTask(taskId);
        });
    });
    
    // Add event listeners to start buttons for workout tasks
    document.querySelectorAll('.btn-start').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(btn.dataset.id);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                openTaskModal(task);
            }
        });
    });
}

// Update getTaskIcon for new types if needed
function getTaskIcon(type) {
    const icons = {
        'outdoor': 'fa-tree',
        'indoor': 'fa-home',
        'creative': 'fa-paint-brush',
        'focus': 'fa-brain',
        'workout': 'fa-dumbbell',
        'learning': 'fa-graduation-cap',
        'relax': 'fa-bed',
        'social': 'fa-users'
    };
    return icons[type] || 'fa-tasks';
}

function completeTask(taskId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            return { ...task, completed: true, completedAt: new Date().toISOString() };
        }
        return task;
    });
    
    saveTasks();
    renderTasks();
    renderCompletedTasks();
    showCongratsAnimation && showCongratsAnimation();
}

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('tempus_tasks', JSON.stringify(tasks));
    // Store completed and not completed separately
    const completed = tasks.filter(t => t.completed);
    const notCompleted = tasks.filter(t => !t.completed);
    localStorage.setItem('tempus_tasks_completed', JSON.stringify(completed));
    localStorage.setItem('tempus_tasks_not_completed', JSON.stringify(notCompleted));
}

// Helper: Search YouTube for a track and get the video ID
async function getYouTubeVideoId(trackName) {
    console.log("Searching YouTube for:", trackName);
    const apiKey = 'AIzaSyDZexXoAIKtQoaocNsC9NGRltqOnL6HJxE';
    // Add "no copyright music" to the search query
    const query = `${trackName}no copyright music`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&key=${apiKey}&maxResults=5`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("YouTube API response:", data);
    if (data.items && data.items.length > 0) {
        // Return the first embeddable video
        for (const item of data.items) {
            if (item.id && item.id.videoId) {
                return item.id.videoId;
            }
        }
    }
    return null;
}

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        events: {
            'onReady': () => {console.log('YouTube Player Ready');},
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    // Auto-play next track when current ends
    if (event.data === YT.PlayerState.ENDED) {
        playNextTrack();
    }
}

// Play a track by index
async function playTrack(index) {
    if (!currentPlaylist) return;
    currentTrackIndex = index;
    const trackName = currentPlaylist.tracks[index];
    const videoId = await getYouTubeVideoId(trackName);
    if (videoId && ytPlayer) {
        ytPlayer.loadVideoById(videoId);
        ytPlayer.playVideo();
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playlistTitle.textContent = `${currentPlaylist.title} - ${trackName}`;
    }
}

// Override openTaskModal to set currentPlaylist but DO NOT auto-play
function openTaskModal(task) {
    currentTask = task;
    modalTaskTitle.textContent = task.title;

    // Set up timer
    timerDuration = task.duration * 60; // Convert to seconds
    timerRemaining = timerDuration;
    updateTimerDisplay();

    // Set up playlist based on task type
    switch (task.type) {
        case 'workout':
            currentPlaylist = playlists.workout;
            break;
        case 'creative':
            currentPlaylist = playlists.creative;
            break;
        case 'focus':
            currentPlaylist = playlists.focus;
            break;
        case 'learning':
            currentPlaylist = playlists.focus; // If you want a separate playlist, create playlists.learning
            break;
        case 'relax':
            currentPlaylist = playlists.relax;
            break;
        default:
            currentPlaylist = playlists.relax;
    }

    playlistCover.textContent = currentPlaylist.cover;
    playlistTitle.textContent = currentPlaylist.title;
    playlistDescription.textContent = currentPlaylist.description;

    currentTrackIndex = 0;
    // Do NOT auto-play here
    // playTrack(currentTrackIndex);

    // Show modal
    modal.style.display = 'flex';
}

// Only play/pause when play button is clicked
playPauseBtn.onclick = function () {
    if (!ytPlayer) return;
    // If not playing, and video is loaded, just play
    if (!isPlaying) {
        // If player is at the right track, just play
        if (ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PAUSED) {
            ytPlayer.playVideo();
            isPlaying = true;
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            // Otherwise, load and play the track
            playTrack(currentTrackIndex);
        }
    } else {
        ytPlayer.pauseVideo();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
};

// Pause music when modal is closed (task closed)
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    stopTimer();
    if (ytPlayer && isPlaying) {
        ytPlayer.pauseVideo();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
});

// Also pause music if modal is closed by clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        stopTimer();
        if (ytPlayer && isPlaying) {
            ytPlayer.pauseVideo();
            isPlaying = false;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
});

function updateTimerDisplay() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerPaused) {
        timerPaused = false;
        timerInterval = setInterval(() => {
            if (timerRemaining > 0) {
                timerRemaining--;
                updateTimerDisplay();
            } else {
                stopTimer();
                // Timer completed
                alert(`Time's up! You've completed your ${currentTask.title} task.`);
                completeTask(currentTask.id);
                modal.style.display = 'none';
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (!timerPaused) {
        timerPaused = true;
        clearInterval(timerInterval);
    }
}

function resetTimer() {
    pauseTimer();
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

function stopTimer() {
    pauseTimer();
    clearInterval(timerInterval);
}

function togglePlayPause() {
    if (!ytPlayer) return;
    isPlaying = !isPlaying;
    if (isPlaying) {
        ytPlayer.playVideo();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        ytPlayer.pauseVideo();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function playPreviousTrack() {
    if (!currentPlaylist) return;
    currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.tracks.length) % currentPlaylist.tracks.length;
    playTrack(currentTrackIndex);
}

function playNextTrack() {
    if (!currentPlaylist) return;
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.tracks.length;
    playTrack(currentTrackIndex);
}

// Update task scores periodically (every hour) to reflect changing conditions
setInterval(updateAllTaskScores, 60 * 60 * 1000);

// Simulate API calls for weather every 30 minutes
setInterval(getWeatherData, 30 * 60 * 1000);

// Update weather animation on window resize
window.addEventListener('resize', () => {
    if (currentWeather) {
        startWeatherAnimation();
    }
});

function renderCompletedTasks() {
    const completedTaskList = document.getElementById('completed-task-list');
    const completed = JSON.parse(localStorage.getItem('tempus_tasks_completed')) || [];
    if (completed.length === 0) {
        completedTaskList.innerHTML = '<div class="loading">No tasks completed yet.</div>';
        return;
    }
    completedTaskList.innerHTML = '';
    completed.forEach(task => {
        const completedDate = new Date(task.completedAt || task.added);
        const formattedDate = completedDate.toLocaleString();
        const taskEl = document.createElement('div');
        taskEl.className = 'completed-task-item';
        taskEl.innerHTML = `
            <div class="completed-task-title">
                <i class="fas fa-check"></i> ${task.title}
            </div>
            <div class="completed-task-meta">
                <span>Type: ${task.type}</span>
                <span>Completed: ${formattedDate}</span>
            </div>
        `;
        completedTaskList.appendChild(taskEl);
    });
}

// Call this after rendering tasks
renderCompletedTasks();
