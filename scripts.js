
let domainUriString = "";
try {
    const domainUriModule = await import("./domainUri.js");
    domainUriString = domainUriModule.domainUri;
} catch (e) {
 domainUriString = "https://github.com/ASanzL/SpotifyGissaL-t";
}

console.log(domainUriString);

const clientId = "cb7496732c1a43189d1603de8f7c122a";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

const TIME_PER_SONG = 20;
const SONGS_PER_GAME = 10;

const preStartArea = document.getElementById('pre-start-game-area');
const duringGameArea = document.getElementById('during-game-area');
const progressBar = document.getElementById("progress-bar");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const playlists = await getPlaylists(accessToken);
    
    for (const p of playlists.items) {        
        const newButton = document.createElement("button");
        newButton.className = "playlist-button";
        newButton.textContent = p.name;
        newButton.addEventListener("click", (e) => {
        preStartArea.style.display = "none";
        duringGameArea.hidden = false;
        
        newSong(accessToken, TIME_PER_SONG, p.id);
    });
        preStartArea.appendChild(newButton);
    }

        const skipButton = document.createElement("button");
        skipButton.className = "playlist-button playlist-button-skip";
        skipButton.textContent = "Hoppa över";
        skipButton.addEventListener("click", (e) => {
        preStartArea.style.display = "none";
        duringGameArea.hidden = false;
        
        newSong(accessToken, TIME_PER_SONG);
    });
        preStartArea.appendChild(skipButton);
    
}

async function newSong(accessToken, timeUntilNextSong, playlistId) {
    if (playlistId) {
        playPlaylist(accessToken, playlistId);
    }
    const timer = setInterval(() => {
    timeUntilNextSong--;
    progressBar.style.width = `${timeUntilNextSong / TIME_PER_SONG * 100}%`;
    
    if (timeUntilNextSong < 0) {
        showSongInfo(accessToken);
        nextSong(accessToken);
        timeUntilNextSong = TIME_PER_SONG;
    }
    // document.getElementById("timer").textContent = timeUntilNextSong;
    }, 1000);
}

async function showSongInfo(accessToken) {
    const currentTrackId = await getCurrentTrack(accessToken);
    const currentTrack = await getTrackInfo(accessToken, currentTrackId);

    document.getElementById("song-name").textContent = currentTrack.name;
    document.getElementById("song-album-name").textContent = currentTrack.album.name;
    const year = new Date(currentTrack.album.release_date);
    
    document.getElementById("song-year").textContent = year.getFullYear();
    
    document.getElementById("artists-names").textContent = currentTrack.artists.map(a => a.name).join(", ");

    console.log(currentTrack.album.images);
    
    document.getElementById("song-pic").src = currentTrack.album.images[1].url;
}

export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", `${domainUriString}/index.html`);
    params.append("scope", "user-read-currently-playing user-modify-playback-state user-read-playback-state playlist-read-private");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", `${domainUriString}/index.html`);
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function getCurrentTrack(token) {
    const result = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    const resultJson = await result.json();

    return resultJson.item.id;
}

async function getTrackInfo(token, trackId) {
    const result = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function getPlaylists(token) {
    const result = await fetch(`https://api.spotify.com/v1/me/playlists`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function nextSong(token) {
    const result = await fetch(`https://api.spotify.com/v1/me/player/next`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
    });

    // return await result.json();
}

async function playPlaylist(token, playlistId) {
    console.log(`spotify:playlist:${playlistId}`);
    
    const result = await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`,
            "Content-Type": "application/json" },
        body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}`, position_ms: 0 })
    });

    // return await result.json();
}
