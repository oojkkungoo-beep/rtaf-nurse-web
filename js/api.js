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

// Public APIs
const API = {
  getNews: () => apiGet({ action: 'getNews' }),

  getStats: () => apiGet({ action: 'getStats' }),

  searchMembers: (query = '', gen = '', type = '', page = 1) =>
    apiGet({ action: 'searchMembers', query, gen, type, page, limit: CONFIG.ITEMS_PER_PAGE }),

  getMemberById: (id) => apiGet({ action: 'getMember', id }),

  submitRegistration: (data) => apiPost({ action: 'register', ...data }),

  // Admin APIs
  addNews: (data) => apiPost({ action: 'addNews', email: currentUser?.email, ...data }),
  updateNews: (data) => apiPost({ action: 'updateNews', email: currentUser?.email, ...data }),
  deleteNews: (id) => apiPost({ action: 'deleteNews', email: currentUser?.email, id }),

  updateMember: (data) => apiPost({ action: 'updateMember', email: currentUser?.email, ...data }),
  deleteMember: (id) => apiPost({ action: 'deleteMember', email: currentUser?.email, id }),
  approveMember: (id) => apiPost({ action: 'approveMember', email: currentUser?.email, id }),

  addLogbook: (data) => apiPost({ action: 'addLogbook', email: currentUser?.email, ...data }),
  getLogbooks: (memberId = '', page = 1) =>
    apiGet({ action: 'getLogbooks', memberId, page, limit: CONFIG.ITEMS_PER_PAGE }),
  getPendingRegistrations: () =>
    apiGet({ action: 'getPending', email: currentUser?.email }),
};
