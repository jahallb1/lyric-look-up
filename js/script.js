import {getAuthToken} from './spotify.js';

document.querySelector('#req-spotify-token').addEventListener('click', getAuthToken);
