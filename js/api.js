// API calls ไปยัง Google Apps Script
async function apiGet(params = {}) {
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

async function apiPost(data = {}) {
  // ไม่ใส่ Content-Type เพื่อหลีกเลี่ยง CORS preflight กับ Apps Script
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

// อ่าน email จาก sessionStorage (ใช้ใน Admin API calls)
function getSessionEmail() {
  try { return JSON.parse(sessionStorage.getItem('adminUser') || '{}').email || ''; }
  catch(e) { return ''; }
}

// Public APIs
const API = {
  getNews: () => apiGet({ action: 'getNews' }),
  getStats: () => apiGet({ action: 'getStats' }),
  getFilterOptions: () => apiGet({ action: 'getFilterOptions' }),

  searchMembers: (query = '', gen = '', type = '', page = 1, limit = 9999) =>
    apiGet({ action: 'searchMembers', query, gen, type, page, limit }),

  getMemberById: (id) => apiGet({ action: 'getMember', id }),

  submitRegistration: (data) => apiPost({ action: 'register', ...data }),

  // Admin APIs — ใช้ POST เพื่อให้ส่ง email ได้น่าเชื่อถือ
  addNews:    (data) => apiPost({ action: 'addNews',    email: getSessionEmail(), ...data }),
  updateNews: (data) => apiPost({ action: 'updateNews', email: getSessionEmail(), ...data }),
  deleteNews: (id)   => apiPost({ action: 'deleteNews', email: getSessionEmail(), id }),

  updateMember: (data) => apiPost({ action: 'updateMember', email: getSessionEmail(), ...data }),
  deleteMember: (id)   => apiPost({ action: 'deleteMember', email: getSessionEmail(), id }),
  approveMember:(id)   => apiPost({ action: 'approveMember', email: getSessionEmail(), id }),
  rejectPending:(id)   => apiPost({ action: 'rejectPending', email: getSessionEmail(), id }),

  addLogbook:    (data)    => apiPost({ action: 'addLogbook',    email: getSessionEmail(), ...data }),
  updateLogbook: (data)    => apiPost({ action: 'updateLogbook', email: getSessionEmail(), ...data }),
  deleteLogbook: (row_num) => apiPost({ action: 'deleteLogbook', email: getSessionEmail(), row_num }),
  getLogbooks: (memberId = '', page = 1, limit = 9999) =>
    apiGet({ action: 'getLogbooks', memberId, page, limit }),
  searchLogbooks: (query = '', gen = '', welfare = '', page = 1, limit = 9999) =>
    apiGet({ action: 'searchLogbooks', query, gen, welfare, page, limit }),
  getLogbookOptions: () => apiGet({ action: 'getLogbookOptions' }),

  getPendingRegistrations: () =>
    apiPost({ action: 'getPending', email: getSessionEmail() }),

  // Admin Management — ใช้ POST เพราะต้องการ auth
  getAdmins:   ()                  => apiPost({ action: 'getAdmins',   email: getSessionEmail() }),
  addAdmin:    (newEmail, newName) => apiPost({ action: 'addAdmin',    email: getSessionEmail(), newEmail, newName }),
  removeAdmin: (targetEmail)       => apiPost({ action: 'removeAdmin', email: getSessionEmail(), targetEmail }),
};
