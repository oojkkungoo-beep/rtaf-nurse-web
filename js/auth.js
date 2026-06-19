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
  const user = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
  fetch(`${CONFIG.API_URL}?action=checkAdmin&email=${encodeURIComponent(user.email)}`)
    .then(r => r.json())
    .then(data => {
      if (!data.isAdmin) {
        showToast('ไม่มีสิทธิ์เข้าถึง Admin Panel', 'error');
        return;
      }
      currentUser = user;
      onAuthSuccess(currentUser);
    })
    .catch(() => showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error'));
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
