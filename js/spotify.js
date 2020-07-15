function getAuthToken() {
  const clientId = 'dd7f3da7892d4f0b993617370f503172'; // not actually a secret
  const redirectUrl = 'https://gminteer.github.io/proj1-test-space/';
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUrl}`;
  location.assign(authUrl);
}

export {getAuthToken};
