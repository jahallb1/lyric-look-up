// adapted from https://github.com/aaronpk/pkce-vanilla-js/blob/master/index.html

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
 */
class PkceHandler {
  /**
   * @param {OAuthConfig} [providerConfig] OAuth configuration details - can be set after initialization.
   * @param {string} [providerName] The name of the OAuth provider, used to name the child object in PkceHandler's localStorage key - can be anything, needs to be set if multiple instances of PkceHandler will be used simultaneously. If not set state will be stored directly in localStorage[storageKey].
   * @param {string} [storageKey] The localStorage key to use to store PkceHandler's state, defaults to 'PkceHandler'
   */
  constructor(providerConfig = null, providerName = null, storageKey = 'PkceHandler') {
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
    }
  }
  /**
   * Generates a cryptographically sound random 64 character long string using the subset
   * of characters that are valid in OAuth2 PKCE Code Verifiers (a-z, A-z, 0-9, and "-._~")
   *
   * @param {integer} length how long the string should be (code verifiers should be 43-128 characters long)
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
   * @return {string} the Base64 URL encoded SHA-256 hash of the string
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

  async requestCode() {
    for (const key of Object.keys(this.providerConfig))
      if (key !== 'scope' && !this.providerConfig[key]) throw new TypeError('PkceHandler: missing OAuth configuration');
    const state = this._generateCryptoRandomString();
    const codeVerifier = this._generateCryptoRandomString();
    const challenge = await this._generateBase64UrlEncodedHash(codeVerifier);

    const c = this.providerConfig;
    let codeReqUrl =
      `${c.authorizationUrl}?response_type=code` +
      `&client_id=${c.clientId}` +
      `&redirect_uri=${c.redirectUrl}` +
      `&state=${state}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256`;
    if (c.scope) codeReqUrl += `&scope=${c.scope}`;
    const pkceProviderState = {state, codeVerifier, challenge, sentCodeReq: true};
    const storageObject = this.providerName ? {[this.providerName]: pkceProviderState} : pkceProviderState;
    localStorage.setItem(this.storageKey, JSON.stringify(storageObject));
    location.assign(codeReqUrl);
  }

  async requestToken(providerResponse) {
    const pkceProviderState = this.providerName
      ? JSON.parse(localStorage.getItem(this.storageKey))[this.providerName]
      : JSON.parse(localStorage.getItem(this.storageKey));
    if (!pkceProviderState || !pkceProviderState.sentCodeReq)
      throw new TypeError('PkceHandler: invalid provider state');
    if (providerResponse.state !== pkceProviderState.state) {
      throw new Error(
        'PkceHandler: state value from provider does not match local state. POSSIBLE CROSS-SITE REQUEST FORGERY!'
      );
    }
    const c = this.providerConfig;
    const body = new URLSearchParams();
    body.append('client_id', c.clientId);
    body.append('grant_type', 'authorization_code');
    body.append('code', providerResponse.code);
    body.append('redirect_uri', c.redirectUrl);
    body.append('code_verifier', pkceProviderState.codeVerifier);
    const req = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    };
    const response = await fetch(c.tokenUrl, req);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    debugger;
  }
}

export {PkceHandler};
