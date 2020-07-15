import {spotifyClientId} from 'apikeys.js';

function getAuthToken() {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&response_type=token`;
}
