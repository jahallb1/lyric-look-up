/* global spotifyClient */
import {PkceHandler} from './lib/pkce-handler.js';
import {DateTime, Duration} from './lib/luxon.js';

function trackChangeEvent(trackInfo) {
  setTimeout(document.body.dispatchEvent(new CustomEvent('trackChange', {bubbles: true, detail: trackInfo})), 10);
}

async function getCurrentTrackInfo() {
  const response = await spotifyClient.fetch('https://api.spotify.com/v1/me/player/currently-playing');
  if (response.ok) {
    if (response.status === 204) {
      return {error: 'not_playing'};
    } else {
      const data = await response.json();
      if (data.currently_playing_type === 'ad') return {error: 'ad'};
      // 150ms offset to timeRemaining as a kludge
      const timeRemaining = data.progress_ms ? data.item.duration_ms - data.progress_ms + 150 : data.item.duration_ms;
      const artists = [];
      for (const artist of data.item.artists) artists.push(artist.name);
      return {artists, track: data.item.name, album: data.item.album.name, timeRemaining};
    }
  }
}

async function currentTrackStream() {
  const currentTrack = await getCurrentTrackInfo();
  trackChangeEvent(currentTrack);
  if (Object.keys(currentTrack).includes('error')) {
    let nextPoll = null;
    if (currentTrack.error === 'ad') nextPoll = 1000 * 30;
    else nextPoll = 1000 * 60;
    console.debug(`Next poll happens in ${Duration.fromMillis(nextPoll).as('seconds')}s`);
    setTimeout(() => {
      console.debug(`Track stream poll at ${DateTime.local().toLocaleString(DateTime.DATETIME_SHORT)}`);
      currentTrackStream();
    }, nextPoll);
  } else {
    console.debug(`Next poll happens in ${Duration.fromMillis(currentTrack.timeRemaining).as('seconds')}s`);
    setTimeout(() => {
      console.debug(`Track stream poll at ${DateTime.local().toLocaleString(DateTime.DATETIME_SHORT)}`);
      currentTrackStream();
    }, currentTrack.timeRemaining);
  }
}

document.body.addEventListener('authorized', (event) => {
  console.debug(`provider "${event.detail.provider}" authorized`);
  currentTrackStream();
});

document.body.addEventListener('trackChange', (event) => {
  if (Object.keys(event.detail).includes('error')) {
    console.log(`No current song: "${event.detail.error}"`);
  } else {
    let artistsAsString = '';
    for (let i = 0; i < event.detail.artists.length; i++) {
      if (i < event.detail.artists.length - 1) artistsAsString += `${event.detail.artists[i]}, `;
      else artistsAsString += event.detail.artists[i];
    }
    console.log(`Currently playing: "${event.detail.track}" by ${artistsAsString} (from "${event.detail.album}")`);
  }
});

// assigning to window to make it easier to test/debug, remember to change later.
window.spotifyClient = new PkceHandler(
  {
    clientId: 'dd7f3da7892d4f0b993617370f503172',
    redirectUrl: 'https://mayorgak.github.io/project-1/',
    // redirectUrl: 'http://127.0.0.1:5500/index.html',
    // redirectUrl: 'https://gminteer.github.io/proj1-test-space/',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scope: 'user-read-playback-state',
  },
  'spotifyTest'
);
spotifyClient.getCurrentTrackInfo = getCurrentTrackInfo;
spotifyClient.currentTrackStream = currentTrackStream;

document.querySelector('#access-spotify').addEventListener('click', spotifyClient.requestCode.bind(spotifyClient));

const search = window.location.href.split('?')[1];
if (search) {
  const providerState = spotifyClient.providerName
    ? JSON.parse(localStorage.getItem(spotifyClient.storageKey))[spotifyClient.providerName]
    : JSON.parse(localStorage.getItem(spotifyClient.storageKey));
  if (providerState.sentCodeReq) {
    const searchParams = new URLSearchParams(search);
    if (searchParams.has('error')) {
      console.error(searchParams.get('error'));
    } else if (searchParams.has('code')) {
      const response = {};
      for (const [key, value] of searchParams) response[key] = value;
      spotifyClient.requestToken(response);
    }
  }
}
