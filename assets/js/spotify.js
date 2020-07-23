/* global spotifyClient */
import {PkceHandler} from './lib/pkce-handler.js';
import * as bulmaToast from 'https://cdn.jsdelivr.net/npm/bulma-toast@2.0.1/dist/bulma-toast.esm.js';
// custom events
function trackChangeEvent(trackInfo) {
  setTimeout(document.body.dispatchEvent(new CustomEvent('trackChange', {bubbles: true, detail: trackInfo})), 10);
}
function nowPlayingException(trackInfo) {
  setTimeout(
    document.body.dispatchEvent(new CustomEvent('nowPlayingException', {bubbles: true, detail: trackInfo})),
    10
  );
}
// bulmaToast wrapper
const toast = (message, type, position = 'top-center', duration = 6000) =>
  bulmaToast.toast({
    message,
    type,
    duration,
    position,
    dissmissible: true,
    animate: {in: 'fadeIn', out: 'fadeOut'},
  });

const spotifyBtn = document.querySelector('#access-spotify');
const nowPlayingDiv = document.querySelector('.now-playing');

// module globals
const NOW_PLAYING_EXCEPTIONS = Object.freeze({
  ad: 'Advertisement(s) are currently playing.',
  notPlaying: 'Nothing is currently playing on Spotify.',
  sameTrack: "The current track hasn't changed from the last request.",
});

let lastTrack;

// These two functions combined generate synthetic events whenever what's currently playing in Spotify changes
async function getCurrentTrackInfo() {
  let response;
  try {
    response = await spotifyClient.fetch(
      'https://api.spotify.com/v1/me/player/currently-playing'
    );
  } catch (error) {
    toast(`Error: "${error}" when attemping to ask Spotify what's currently playing.`, 'is-danger');
  }
  if (response.ok) {
    if (response.status === 204) {
      return {error: 'notPlaying'};
    } else {
      const data = await response.json();
      if (data.currently_playing_type === 'ad') return {error: 'ad'};
      // 150ms offset to timeRemaining as a kludge that appears to work (it isn't poking Spotify right at the end of the track anymore)
      const timeRemaining = data.progress_ms ? data.item.duration_ms - data.progress_ms + 150 : data.item.duration_ms;
      const artists = [];
      for (const artist of data.item.artists) artists.push(artist.name);
      const out = {
        artists,
        track: data.item.name,
        album: data.item.album.name,
        albumArt: data.item.album.images[0].url,
        timeRemaining,
      };
      if (!data.is_playing) out.error = 'notPlaying'; // playback is paused or stopped
      return out;
    }
  }
}
async function streamCurrentTrackInfo(doTimeoutPoll = false) {
  const currentTrack = await getCurrentTrackInfo();
  const sameTrack =
    lastTrack &&
    lastTrack.track === currentTrack.track &&
    lastTrack.album === currentTrack.album &&
    lastTrack.artists.toString() === currentTrack.artists.toString();

  if (sameTrack) currentTrack.error = 'sameTrack';
  else doTimeoutPoll = true;
  let nextPoll = null;
  if (Object.keys(currentTrack).includes('error')) {
    nowPlayingException(currentTrack);
    if (['ad', 'sameTrack'].includes(currentTrack.error)) nextPoll = 1000 * 30;
    else nextPoll = 1000 * 60;
  } else {
    trackChangeEvent(currentTrack);
    lastTrack = currentTrack;
    nextPoll = currentTrack.timeRemaining;
  }
  if (doTimeoutPoll && nextPoll) {
    setTimeout(() => {
      streamCurrentTrackInfo(true);
    }, nextPoll);
  }
}

// assigning to window to make it easier to test/debug, remember to change later.
window.spotifyClient = new PkceHandler(
  {
    clientId: 'dd7f3da7892d4f0b993617370f503172',
    redirectUrl: 'https://mayorgak.github.io/project-1/',
    redirectUrl: 'http://127.0.0.1:5500/index.html',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scope: 'user-read-playback-state',
  },
  'spotify'
);
spotifyClient.getCurrentTrackInfo = getCurrentTrackInfo;
spotifyClient.currentTrackStream = streamCurrentTrackInfo;

// Event handling
function spotifyAuthRequest() {
  try {
    spotifyClient.requestCode.bind(spotifyClient)();
  } catch (error) {
    // proper error handling
    toast(`Error: "${error}" when attemping to connect to Spotify.`, 'is-danger');
  }
}
spotifyBtn.addEventListener('click', spotifyAuthRequest);

document.body.addEventListener('authorized', (event) => {
  toast(
    'Spotify connected! Click the "Resync with Spotify" button to update if you change tracks manually in Spotify.',
    'is-success'
  );
  streamCurrentTrackInfo(true);
  // re-wire "connect to Spotify" button to be "re-sync with Spotify"
  spotifyBtn.removeEventListener('click', spotifyAuthRequest);
  spotifyBtn.addEventListener('click', () => streamCurrentTrackInfo(false));
  spotifyBtn.querySelector('.button-title').textContent = 'Resync with Spotify';
});

document.body.addEventListener('trackChange', (event) => {
  let artistsAsString = '';
  for (let i = 0; i < event.detail.artists.length; i++) {
    if (i < event.detail.artists.length - 1) artistsAsString += `${event.detail.artists[i]}, `;
    else artistsAsString += event.detail.artists[i];
  }
  nowPlayingDiv.querySelector('td.artist').textContent = artistsAsString;
  nowPlayingDiv.querySelector('td.track').textContent = event.detail.track;
  nowPlayingDiv.querySelector('td.album').textContent = event.detail.album;
  nowPlayingDiv.querySelector('img').src = event.detail.albumArt;
  if (nowPlayingDiv.classList.contains('is-hidden')) nowPlayingDiv.classList.remove('is-hidden');
});

document.body.addEventListener('nowPlayingException', (event) => {
  if (event.detail.error !== 'sameTrack') {
    toast(`${NOW_PLAYING_EXCEPTIONS[event.detail.error]} Please Stand By.`, 'is-warning');
    if (!nowPlayingDiv.classList.contains('is-hidden')) nowPlayingDiv.classList.add('is-hidden');
  }
});

// void main(void)
const search = window.location.href.split('?')[1];
if (search) {
  const dataStash = JSON.parse(localStorage.getItem(spotifyClient.storageKey));
  if (dataStash) {
    const providerState = spotifyClient.providerName ? dataStash[spotifyClient.providerName] : dataStash;
    if (providerState.sentCodeReq) {
      const searchParams = new URLSearchParams(search);
      if (searchParams.has('error')) {
        toast(`Error: "${searchParams.get('error')}" when attemping to connect to Spotify.`, 'is-danger');
      } else if (searchParams.has('code')) {
        const response = {};
        for (const [key, value] of searchParams) response[key] = value;
        try {
          spotifyClient.requestToken(response);
        } catch (error) {
          toast(`Error: "${error}" when attemping to connect to Spotify.`, 'is-danger');
        }
      }
    }
  }
}
