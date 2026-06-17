// Google Identity Services auth
let currentUser = null;

function initGoogleAuth() {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });
}

function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  currentUser = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
  const isAdmin = CONFIG.ADMIN_EMAILS.includes(currentUser.email);
  if (!isAdmin) {
    showToast('ไม่มีสิทธิ์เข้าถึง Admin Panel', 'error');
    currentUser = null;
    return;
  }
  onAuthSuccess(currentUser);
}

function showGoogleSignIn(containerId) {
  google.accounts.id.renderButton(
    document.getElementById(containerId),
    { theme: 'outline', size: 'large', locale: 'th', width: 280 }
  );
}

function signOut() {
  google.accounts.id.disableAutoSelect();
  currentUser = null;
  onAuthSignOut();
}

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function isLoggedIn() { return currentUser !== null; }
