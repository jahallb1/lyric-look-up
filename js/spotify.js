/* global spotifyClient */
import {PkceHandler} from './lib/pkce-handler.js';
import {Duration} from './lib/luxon.js';

async function currentTrackStream() {
  const currentTrack = await getCurrentTrackInfo();
  if (Object.keys(currentTrack).includes('error')) {
    console.log(`No current song: "${currentTrack.error}"`);
    let nextPoll = null;
    if (currentTrack.error === 'ad') nextPoll = 1000 * 30;
    else nextPoll = 1000 * 60;
    console.debug(`Next poll happens in ${Duration.fromMillis(nextPoll).as('seconds')}s`);
  } else {
    console.log(`Currently playing: "${currentTrack.track}" by ${currentTrack.artist} (from ${currentTrack.album})`);
    console.debug(`Next poll happens in ${Duration.fromMillis(currentTrack.timeRemaining).as('seconds')}s`);
    setTimeout(spotifyClient.currentTrackStream, currentTrack.timeRemaining);
  }
}

// this has a 50-50 shot of working, I think there's a weird race condition happening depending on the order async events happen.
document.body.addEventListener('authorized', (event) => {
  console.log(`provider "${event.detail.provider}" authorized`);
  currentTrackStream();
});

// assigning to window to make it easier to test/debug, remember to change later.
window.spotifyClient = new PkceHandler(
  {
    clientId: 'dd7f3da7892d4f0b993617370f503172',
    redirectUrl: 'http://127.0.0.1:5500/index.html',
    // redirectUrl: 'https://gminteer.github.io/proj1-test-space/',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scope: 'user-read-playback-state',
  },
  'spotifyTest'
);

async function getCurrentTrackInfo() {
  const response = await spotifyClient.fetch('https://api.spotify.com/v1/me/player/currently-playing');
  if (response.ok) {
    if (response.status === 204) {
      return {error: 'not_playing'};
    } else {
      const data = await response.json();
      if (data.currently_playing_type === 'ad') {
        console.log(data);
        return {error: 'ad'};
      }
      // adding a 10ms offset to timeRemaining as a kludge
      const timeRemaining = data.progress_ms ? data.item.duration_ms - (data.progress_ms - 10) : data.item.duration_ms;
      return {artist: data.item.artists[0].name, track: data.item.name, album: data.item.album.name, timeRemaining};
    }
  }
}

document.querySelector('#access-spotify').addEventListener('click', spotifyClient.requestCode.bind(spotifyClient));

const search = window.location.href.split('?')[1];
if (search) {
  const pkceState = spotifyClient.providerName
    ? JSON.parse(localStorage.getItem(spotifyClient.storageKey))[spotifyClient.providerName]
    : JSON.parse(localStorage.getItem(spotifyClient.storageKey));
  if (pkceState.sentCodeReq) {
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
