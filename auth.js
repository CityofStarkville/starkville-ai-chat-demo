/* City of Starkville shared sign-in (Cognito OAuth2 authorization code + PKCE).
   Client IDs and Cognito URLs are public identifiers, not secrets.
   Access decisions are enforced by API Gateway and Lambda, not this file. */
(function () {
  'use strict';
  const ROOT = 'https://cityofstarkville.github.io/starkville-ai-chat-demo/';
  const CALLBACK = ROOT + 'tasks.html'; // Existing Cognito callback URL
  const CONFIG = Object.freeze({
    cognitoDomain: 'https://us-east-1rzvwoxx8f.auth.us-east-1.amazoncognito.com',
    clientId: '5ucf200p7t7rbtpuihaqvqrfsf',
    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RzVWOxX8F'
  });
  const SESSION_KEY = 'starkville_workspace_session_v1';
  const FLOW_KEY = 'starkville_workspace_pkce_v1';
  const groupsAllowed = ['StarkvilleTaskStaff', 'StarkvilleTaskAdmins'];
  function b64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function randomString() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }
  function decodeJwt(token) {
    if (typeof token !== 'string' || token.split('.').length !== 3) throw new Error('Invalid session token.');
    const p = token.split('.')[1];
    return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-p.length%4)%4)));
  }
  function groups(claims) {
    const g = claims['cognito:groups'] || [];
    return Array.isArray(g) ? g : String(g).replace(/^\[|\]$/g,'').split(',').map(s=>s.trim());
  }
  function validTokens(tokens) {
    try {
      const id = decodeJwt(tokens.id_token), access = decodeJwt(tokens.access_token);
      const now = Date.now() / 1000;
      if (id.iss !== CONFIG.issuer || access.iss !== CONFIG.issuer || id.aud !== CONFIG.clientId || access.client_id !== CONFIG.clientId) return null;
      if (id.token_use !== 'id' || access.token_use !== 'access') return null;
      if (id.exp <= now + 30 || access.exp <= now + 30) return null;
      if (!groups(id).some(g=>groupsAllowed.includes(g))) return null;
      return {accessToken:tokens.access_token, claims:id, isAdmin:groups(id).includes('StarkvilleTaskAdmins')};
    } catch { return null; }
  }
  function getSession() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { saved = null; }
    const session = saved && validTokens(saved);
    if (!session) sessionStorage.removeItem(SESSION_KEY);
    return session;
  }
  async function startLogin(returnTo = './') {
    // Only navigate to our own workspace pages; prevent arbitrary redirects.
    const target = new URL(returnTo, ROOT);
    if (target.origin !== new URL(ROOT).origin || ![ROOT, ROOT + 'index.html', ROOT + 'chat.html', ROOT + 'parking.html', CALLBACK].includes(target.href)) throw new Error('Invalid return destination.');
    const verifier = randomString(), state = randomString();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({verifier,state,target:target.href,created:Date.now()}));
    const params = new URLSearchParams({response_type:'code',client_id:CONFIG.clientId,redirect_uri:CALLBACK,scope:'openid email',state,code_challenge_method:'S256',code_challenge:b64url(new Uint8Array(digest))});
    location.assign(CONFIG.cognitoDomain + '/oauth2/authorize?' + params);
  }
  async function finishCallback() {
    const url = new URL(location.href);
    const code = url.searchParams.get('code'), state = url.searchParams.get('state'), error = url.searchParams.get('error');
    if (!code && !error) return null;
    // Remove authorization code from address bar immediately.
    history.replaceState({}, '', CALLBACK);
    let flow;
    try { flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || 'null'); } catch { flow = null; }
    sessionStorage.removeItem(FLOW_KEY);
    if (error) throw new Error('Sign-in was cancelled or denied.');
    if (!flow || !state || state !== flow.state || Date.now()-flow.created > 600000) throw new Error('Sign-in request expired. Please try again.');
    const body = new URLSearchParams({grant_type:'authorization_code',client_id:CONFIG.clientId,code,redirect_uri:CALLBACK,code_verifier:flow.verifier});
    const response = await fetch(CONFIG.cognitoDomain + '/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
    if (!response.ok) throw new Error('Could not finish sign-in. Please try again.');
    const tokens = await response.json();
    if (!validTokens(tokens)) throw new Error('This account is not authorized for the City workspace.');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({access_token:tokens.access_token,id_token:tokens.id_token}));
    return flow.target;
  }
  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(FLOW_KEY);
    // Add ROOT to the Cognito app client's Allowed sign-out URLs.
    const params = new URLSearchParams({client_id:CONFIG.clientId,logout_uri:ROOT});
    location.assign(CONFIG.cognitoDomain + '/logout?' + params);
  }
  window.StarkvilleAuth = Object.freeze({getSession,startLogin,finishCallback,signOut,ROOT,CALLBACK});
})();
