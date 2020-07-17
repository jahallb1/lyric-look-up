/* global spotifyClient */
import {PkceHandler} from './lib/pkce-handler.js';

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

spotifyClient.getCurrentTrackInfo = async () => {
  const response = await spotifyClient.fetch('https://api.spotify.com/v1/me/player/currently-playing');
  if (response.ok) {
    if (response.status === 204) {
      return {artist: '(not currently playing a song)', track: '', album: ''};
    } else {
      const data = await response.json();
      return {artist: data.item.artists[0].name, track: data.item.name, album: data.item.album.name};
    }
  }
};

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
