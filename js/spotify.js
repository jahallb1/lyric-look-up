// function getAuthToken() {
//   const clientId = 'dd7f3da7892d4f0b993617370f503172'; // not actually a secret
//   const redirectUrl = 'https://gminteer.github.io/proj1-test-space/';
//   const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUrl}`;
//   location.assign(authUrl);
// }
import {PkceHandler} from './pkce-oauth.js';

// const spotifyClient = new jso.JSO({
//   providerID: 'spotify',
//   client_id: 'dd7f3da7892d4f0b993617370f503172',
//   redirect_uri: 'https://gminteer.github.io/proj1-test-space/',
//   authorization: 'https://accounts.spotify.com/authorize',
//   response_type: 'token',
//   debug: true, // turn me off later
// });

// document.querySelector('#req-spotify-token').addEventListener('click', () => {
//   spotifyClient.getToken().then((token) => {
//     spotifyClient.callback();
//     debugger;
//   });
// });

const spotifyClient = new PkceHandler(
  {
    clientId: 'dd7f3da7892d4f0b993617370f503172',
    redirectUrl: 'http://127.0.0.1:5500/index.html',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scope: '',
  },
  'spotifyTest'
);
function reqSpotifyToken() {
  spotifyClient.requestCode();
}
document.querySelector('#access-spotify').addEventListener('click', reqSpotifyToken);

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
