let ytPlayer;
let currentIndex = -1;
let currentTracks = [];
let isShuffle = false;
let isRepeat = false;

// Initialisation de l'API YouTube
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('ytHiddenPlayer', {
        height: '0', width: '0', videoId: '',
        playerVars: { 'controls': 0, 'disablekb': 1, 'modestbranding': 1, 'origin': window.location.origin },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady() {
    // Événement : Recherche active lors de l'appui sur la touche Entrée
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Entrée' || e.keyCode === 13) {
            executeYoutubeSearch(this.value);
        }
    });
    
    // Synchronisation des contrôles
    setInterval(updateProgressBar, 500);
    document.getElementById('progress').oninput = function() {
        if(ytPlayer && ytPlayer.getDuration) ytPlayer.seekTo((this.value / 100) * ytPlayer.getDuration(), true);
    };
    document.getElementById('volumeSlider').oninput = function() {
        if (ytPlayer && ytPlayer.setVolume) {
            ytPlayer.setVolume(this.value);
            document.getElementById('volumeIcon').className = this.value == 0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }
    };
}

// Fonction Passerelle : Recherche en temps réel sur l'infrastructure YouTube
async function executeYoutubeSearch(query) {
    if(!query.trim()) return;
    
    let grid = document.getElementById('musicGrid');
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Connexion à la passerelle YouTube...</p></div>';

    try {
        // Utilisation d'une passerelle d'extraction publique et open-source pour récupérer les flux YouTube sans clé API payante
        let response = await fetch(`https://kavin.rocks{encodeURIComponent(query)}&filter=music_songs`);
        let data = await response.json();
        
        currentTracks = data.items.slice(0, 12).map(item => ({
            title: item.title,
            artist: item.uploaderName || "Artiste inconnu",
            videoId: item.url.split("v=")[1],
            cover: item.thumbnail || "https://unsplash.com"
        }));

        displayTracks(currentTracks);
    } catch (error) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-wifi"></i><p>Erreur de passerelle. Réessayez ou lancez un serveur local.</p></div>';
    }
}

function displayTracks(tracks) {
    let grid = document.getElementById('musicGrid');
    grid.innerHTML = "";
    
    if(!tracks || tracks.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>Aucun résultat trouvé.</p></div>';
        return;
    }

    tracks.forEach((track, index) => {
        let card = document.createElement('div');
        card.className = `music-card ${currentIndex === index ? 'playing-now' : ''}`;
        card.innerHTML = `
            <div class="cover-wrapper">
                <img src="${track.cover}">
                <span class="source-tag"><i class="fa-brands fa-youtube"></i> Flux Live</span>
            </div>
            <h3>${track.title}</h3>
            <p>${track.artist}</p>
            <button class="listen-now-btn" onclick="selectTrack(${index})">
                <i class="fa-solid ${currentIndex === index && ytPlayer.getPlayerState() === 1 ? 'fa-pause' : 'fa-play'}"></i> 
                ${currentIndex === index && ytPlayer.getPlayerState() === 1 ? 'Pause' : 'Écouter'}
            </button>
        `;
        grid.appendChild(card);
    });
}

function selectTrack(index) {
    if (currentIndex === index) {
        togglePlay();
        return;
    }

    currentIndex = index;
    let track = currentTracks[currentIndex];
    
    document.getElementById('playerTitle').innerText = track.title;
    document.getElementById('playerArtist').innerText = track.artist;
    document.getElementById('playerCover').src = track.cover;
    
    let dlBtn = document.getElementById('downloadBtn');
    dlBtn.disabled = false;
    dlBtn.dataset.tubidyUrl = `https://tubidy.cool{encodeURIComponent(track.title)}`;

    ytPlayer.loadVideoById(track.videoId);
    updateInterfaceButtons(true);
    displayTracks(currentTracks);
}

function togglePlay() {
    if (currentIndex === -1) return;
    if (ytPlayer.getPlayerState() === 1) {
        ytPlayer.pauseVideo();
        updateInterfaceButtons(false);
    } else {
        ytPlayer.playVideo();
        updateInterfaceButtons(true);
    }
    displayTracks(currentTracks);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (isRepeat) { ytPlayer.seekTo(0); ytPlayer.playVideo(); } else { nextTrack(); }
    }
}

function updateInterfaceButtons(isPlaying) {
    document.getElementById('playBtn').innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function nextTrack() {
    if (currentTracks.length === 0) return;
    currentIndex = isShuffle ? Math.floor(Math.random() * currentTracks.length) : (currentIndex + 1) % currentTracks.length;
    selectTrack(currentIndex);
}

function prevTrack() {
    if (currentTracks.length === 0) return;
    currentIndex = currentIndex <= 0 ? currentTracks.length - 1 : currentIndex - 1;
    selectTrack(currentIndex);
}

function updateProgressBar() {
    if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getDuration) {
        let current = ytPlayer.getCurrentTime();
        let total = ytPlayer.getDuration();
        if (total > 0) {
            document.getElementById('progress').value = (current / total) * 100;
            document.getElementById('currentTime').innerText = formatTime(current);
            document.getElementById('duration').innerText = formatTime(total);
        }
    }
}

function toggleShuffle() { isShuffle = !isShuffle; document.getElementById('shuffleBtn').classList.toggle('active-mode', isShuffle); }
function toggleRepeat() { isRepeat = !isRepeat; document.getElementById('repeatBtn').classList.toggle('active-mode', isRepeat); }
function downloadViaTubidyBridge() { let url = document.getElementById('downloadBtn').dataset.tubidyUrl; if(url) window.open(url, '_blank'); }
function formatTime(sec) { let m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
