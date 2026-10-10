/* Home uses the same tab session and Cognito callback as the tools. */
(function () {
  'use strict';
  const auth = window.StarkvilleAuth;
  const byId = id => document.getElementById(id);
  function showAccessState() {
    const session = auth.getSession();
    byId('login-gate').hidden = Boolean(session);
    byId('workspace').hidden = !session;
    byId('workspace-nav').hidden = !session;
    byId('workspace-signout').hidden = !session;
    byId('home-identity').textContent = session ? session.claims.email || 'Signed in' : '';
  }
  byId('workspace-login').addEventListener('click', async () => {
    try { await auth.startLogin('index.html'); }
    catch (error) {
      byId('workspace-login-error').hidden = false;
      byId('workspace-login-error').textContent = error.message || 'Unable to start sign-in.';
    }
  });
  byId('workspace-signout').addEventListener('click', () => auth.signOut());
  window.addEventListener('pageshow', showAccessState);
  showAccessState();
})();
