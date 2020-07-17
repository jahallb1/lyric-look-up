// adapted from the docs on https://oauth.net/, the spotify dev guide, and https://github.com/aaronpk/pkce-vanilla-js/blob/master/index.html

import {DateTime} from './luxon.js';
/**
 * @typedef OAuthConfig OAuth configuration details
 * @type {object}
 * @property {string} clientId - a client ID.
 * @property {string} redirectUrl - a registered redirect URL for the client ID.
 * @property {string} authorizationUrl - the authorization URL for the provider.
 * @property {string} tokenUrl - the token request URL for the provider.
 * @property {string} scope - a space separated list of scopes.
 *
 */

/**
 * Manages PKCE OAuth2 requests. The basic object usage flow:
 * - Initialize with providerConfig information
 * - Invoke instance.getAccessCode() when ready for the redirect to the provider
 * - Invoke instance.getAccessToken() after the provider has redirected back
 * - Use instance.fetch() instead of the built-in fetch() to automatically apply authorization headers
 */
class PkceHandler {
  /**
   * @param {OAuthConfig} [providerConfig] OAuth configuration details - can be set after initialization.
   * @param {string} [providerName] The name of the OAuth provider, used to name the child object in PkceHandler's localStorage key - can be anything, needs to be set if multiple instances of PkceHandler will be used simultaneously. If not set state will be stored directly in localStorage[storageKey].
   * @param {string} [storageKey] The localStorage key to use to store PkceHandler's state, defaults to 'PkceHandler'
   * @param {boolean} [autoRefresh] Whether or not PkceHandler should automatically try to refresh its access token, default is True.
   */
  constructor(providerConfig = null, providerName = null, storageKey = 'PkceHandler', autoRefresh = true) {
    if (!providerConfig) {
      /** type {OAuthConfig} */
      this.providerConfig = {
        clientId: '',
        redirectUrl: '',
        authorizationUrl: '',
        tokenUrl: '',
        scope: '',
      };
    } else {
      this.providerConfig = providerConfig;
      this.providerName = providerName;
      this.storageKey = storageKey;
      this.autoRefresh = autoRefresh;
    }
    // check to see if we already have a valid token in localStorage
    const dataStashRaw = localStorage.getItem(storageKey);
    if (!dataStashRaw) return;
    this._dataStash = JSON.parse(dataStashRaw);
    const providerState = providerName ? this._dataStash[providerName] : this._dataStash;
    if (Object.keys(providerState).includes('accessToken')) {
      providerState.expiration = DateTime.fromISO(providerState.expiration);
      const now = DateTime.local();
      if (now < providerState.expiration) {
        this.tokenData = providerState;
        if (autoRefresh) {
          this.autoRefreshTimeOut = setTimeout(
            this.refreshToken.bind(this),
            providerState.expiration.diff(now).as('milliseconds')
          );
        }
      }
    }
  }
  /**
   * Generates a cryptographically sound random 64 character long string using the subset
   * of characters that are valid in OAuth2 PKCE Code Verifiers (a-z, A-z, 0-9, and "-._~")
   *
   * @param {integer} [length] how long the string should be (code verifiers should be 43-128 characters long), default 64
   * @return {string} a randomly generated PKCE Code Verifier
   */
  _generateCryptoRandomString(length = 64) {
    const VERIFIER_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._~';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    let randomString = '';
    for (const num of array) randomString += VERIFIER_CHARS[num % VERIFIER_CHARS.length];
    return randomString;
  }
  /**
   * Calculates the Base64 URL encoded SHA-256 hash of an input string
   *
   * @param {string} data the string to hash
   * @return {string} the Base64 URL encoded SHA-256 hash
   */
  async _generateBase64UrlEncodedHash(data) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBytes = new Uint8Array(await window.crypto.subtle.digest('SHA-256', encoded));
    let hashString = '';
    for (const byte of hashBytes) hashString += String.fromCharCode(byte);
    // URL encoding Base64 is just replacing "+" with "-", "/" with "_", and stripping trailing "=" chars
    hashString = btoa(hashString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/m, '');
    return hashString;
  }
  /**
   * Stores the returned authorization token on the object and in localStorage
   *
   * @param {Object} data the JSON object from a requestToken/refreshToken request
   */
  _applyToken(data) {
    this.tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiration: DateTime.local().plus({seconds: data.expires_in - 30}), // refresh a bit early because the refresh token expires at the same time
      scope: data.scope,
    };
    if (this.autoRefresh) {
      this.autoRefreshTimeOut = setTimeout(
        this.refreshToken.bind(this),
        this.tokenData.expiration.diffNow().as('milliseconds')
      );
    }

    // update dataStash
    if (this.providerName) this._dataStash[this.providerName] = this.tokenData;
    else this._dataStash = this.tokenData;
    localStorage.setItem(this.storageKey, JSON.stringify(this._dataStash));
  }
  /**
   * Requests an authorization code from the provider. This will change the window location to the provider's authorization URL, which will WIPE OUT ANY STATE that hasn't been saved to localStorage!!!
   */
  async requestCode() {
    for (const key of Object.keys(this.providerConfig))
      if (key !== 'scope' && !this.providerConfig[key]) throw new TypeError('PkceHandler: missing OAuth configuration');
    const state = this._generateCryptoRandomString();
    const codeVerifier = this._generateCryptoRandomString();
    const challenge = await this._generateBase64UrlEncodedHash(codeVerifier);

    const cfg = this.providerConfig;
    let codeReqUrl =
      `${cfg.authorizationUrl}?response_type=code` +
      `&client_id=${cfg.clientId}` +
      `&redirect_uri=${cfg.redirectUrl}` +
      `&state=${state}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256`;
    if (cfg.scope) codeReqUrl += `&scope=${cfg.scope}`;
    // stash providerState in localStorage since it won't survive the redirect
    const providerState = {state, codeVerifier, sentCodeReq: true};
    let dataStash = localStorage.getItem(this.storageKey);
    if (this.providerName) {
      if (dataStash) {
        dataStash = JSON.parse(dataStash);
        dataStash[this.providerName] = providerState;
      } else {
        dataStash = {[this.providerName]: providerState};
      }
    } else {
      dataStash = providerState;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(dataStash));
    location.assign(codeReqUrl);
  }

  /**
   * Requests an authorization token from the provider
   *
   * @param {Object} providerResponse A javascript object version of the search parameters from the authorization code request redirect
   */
  async requestToken(providerResponse) {
    const providerState = this.providerName ? this._dataStash[this.providerName] : this._dataStash;
    if (!providerState || !providerState.sentCodeReq) throw new TypeError('PkceHandler: invalid provider state');
    if (providerResponse.state !== providerState.state) {
      throw new Error(
        'PkceHandler: state value from provider does not match local state. POSSIBLE CROSS-SITE REQUEST FORGERY!'
      );
    }
    const c = this.providerConfig;
    const body = new URLSearchParams(); // URLSearchParams object as post body = x-www-form-urlencoded, which is what the provider wants
    body.append('client_id', c.clientId);
    body.append('grant_type', 'authorization_code');
    body.append('code', providerResponse.code);
    body.append('redirect_uri', c.redirectUrl);
    body.append('code_verifier', providerState.codeVerifier);
    const req = {method: 'POST', body};
    const response = await fetch(c.tokenUrl, req);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    this._applyToken(data);
  }
  /**
   * Refreshes the authorization token from the provider
   */
  async refreshToken() {
    console.debug(`refreshed token at ${DateTime.local().toLocaleString()}`);
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', this.tokenData.refreshToken);
    body.append('client_id', this.providerConfig.clientId);
    const req = {method: 'POST', body};
    const response = await fetch(this.providerConfig.tokenUrl, req);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    this._applyToken(data);
  }
  /**
   * A wrapper around the built-in fetch() function that adds Authorization & Content-Type headers
   *
   * @param {string} url The URL to fetch
   * @param {Object} [request] A fetch options object (optional)
   * @return {Promise} Returns the promise from the built-in fetch()
   */
  fetch(url, request = {}) {
    if (!request.headers) request.headers = {};
    request.headers.Authorization = `${this.tokenData.tokenType} ${this.tokenData.accessToken}`;
    request.headers['Content-Type'] = 'application/json';
    return fetch(url, request);
  }
}

export {PkceHandler};
