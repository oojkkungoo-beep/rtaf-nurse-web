// UI helpers ใช้ทุกหน้า
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function showLoading(containerId) {
  document.getElementById(containerId).innerHTML =
    '<div class="loading"><div class="spinner"></div><p style="margin-top:0.75rem">กำลังโหลด...</p></div>';
}

function renderPagination(containerId, total, current, onPage) {
  const totalPages = Math.ceil(total / CONFIG.ITEMS_PER_PAGE);
  if (totalPages <= 1) { document.getElementById(containerId).innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="(${onPage})(${i})">${i}</button>`;
  }
  document.getElementById(containerId).innerHTML = `<div class="pagination">${html}</div>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
