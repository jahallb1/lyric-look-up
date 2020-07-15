/* global jso */
// function getAuthToken() {
//   const clientId = 'dd7f3da7892d4f0b993617370f503172'; // not actually a secret
//   const redirectUrl = 'https://gminteer.github.io/proj1-test-space/';
//   const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUrl}`;
//   location.assign(authUrl);
// }
const spotifyClient = new jso.JSO({
  providerID: 'spotify',
  client_id: 'dd7f3da7892d4f0b993617370f503172',
  redirect_uri: 'https://gminteer.github.io/proj1-test-space/',
  authorization: 'https://accounts.spotify.com/authorize',
  response_type: 'token',
  debug: true, // turn me off later
});

document.querySelector('#req-spotify-token').addEventListener('click', () => {
  spotifyClient.getToken().then((token) => {
    spotifyClient.callback();
    debugger;
  });
});
