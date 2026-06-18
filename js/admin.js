// admin.js — admin/index.html logic

function adminEmail() {
  return JSON.parse(sessionStorage.getItem('adminUser') || '{}').email || '';
}

// Auth callbacks
function onAuthSuccess(user) {
  sessionStorage.setItem('adminUser', JSON.stringify({ email: user.email, name: user.name }));
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('user-chip').style.display = 'flex';
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-avatar').src = user.picture;
  loadDashboard();
  loadPending();
  loadAdminNews();
}
function onAuthSignOut() {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('user-chip').style.display = 'none';
}

window.addEventListener('load', () => {
  initGoogleAuth();
  showGoogleSignIn('google-signin-btn');
});

// Tab navigation
function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'members') adminSearchMembers(1);
  if (name === 'logbook') loadLogbooks();
}

// Dashboard
async function loadDashboard() {
  try {
    const data = await API.getStats();
    document.getElementById('stat-cards').innerHTML = [
      { label: 'สมาชิกทั้งหมด', val: data.total, color: '#1a2a5e' },
      { label: 'มีชีวิต', val: data.active, color: '#166534' },
      { label: 'เสียชีวิต', val: data.deceased, color: '#991b1b' },
      { label: 'จำนวนรุ่น', val: data.generations, color: '#92400e' },
    ].map(s => `
      <div style="background:white;border-radius:10px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.07);border-top:4px solid ${s.color}">
        <div style="font-size:2rem;font-weight:700;color:${s.color}">${(s.val||0).toLocaleString()}</div>
        <div style="font-size:0.85rem;color:var(--text-muted)">${s.label}</div>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('stat-cards').innerHTML = '<p style="color:var(--text-muted)">ยังไม่ได้เชื่อมต่อ API</p>';
  }
}

// Pending
async function loadPending() {
  try {
    const data = await API.getPendingRegistrations();
    const rows = data.pending || [];
    document.getElementById('pending-badge').textContent = rows.length ? `(${rows.length})` : '';
    const tbody = document.getElementById('pending-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่มีใบสมัครรอการอนุมัติ</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escHtml(formatDate(r.submitted_at))}</td>
        <td>${escHtml(r.rank)} ${escHtml(r.firstname)} ${escHtml(r.lastname)}</td>
        <td>รุ่นที่ ${escHtml(String(r.generation))}</td>
        <td>${escHtml(r.member_type)}</td>
        <td>${escHtml(r.mobile_phone)}</td>
        <td>
          <button class="btn btn-sm btn-gold" onclick="approveMember('${escHtml(r.row_id)}')">อนุมัติ</button>
          <button class="btn btn-sm btn-danger" onclick="rejectMember('${escHtml(r.row_id)}')">ปฏิเสธ</button>
        </td>
      </tr>
    `).join('');
  } catch(e) {}
}

async function approveMember(id) {
  if (!confirm('ยืนยันอนุมัติสมาชิกรายนี้?')) return;
  try {
    await API.approveMember(id);
    showToast('อนุมัติเรียบร้อยแล้ว', 'success');
    loadPending(); loadDashboard();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function rejectMember(id) {
  if (!confirm('ยืนยันปฏิเสธใบสมัครนี้?')) return;
  try {
    await API.deleteMember(id);
    showToast('ปฏิเสธใบสมัครแล้ว', 'success');
    loadPending();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// Members
let adminPage = 1;
let _adminMemberCache = [];

async function adminSearchMembers(page) {
  adminPage = page;
  const query = document.getElementById('admin-search').value.trim();
  const type  = document.getElementById('admin-s-type').value;
  const tbody = document.getElementById('admin-member-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div></td></tr>';
  try {
    const data = await API.searchMembers(query, '', type, page, 100);
    _adminMemberCache = data.members || [];
    document.getElementById('admin-result-count').textContent = `พบ ${(data.total||0).toLocaleString()} รายการ`;
    if (!_adminMemberCache.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่พบข้อมูล</td></tr>';
      return;
    }
    tbody.innerHTML = _adminMemberCache.map((m, i) => {
      const statCls = m.status === 'มีชีวิต' ? 'badge-green' : 'badge-red';
      return `<tr>
        <td style="text-align:center">${escHtml(String(m.row_num||i+1))}</td>
        <td style="text-align:center">${escHtml(String(m.gen||'-'))}</td>
        <td>${escHtml([m.rank,m.fname,m.lname].filter(Boolean).join(' '))}</td>
        <td>${escHtml(m.type||'-')}</td>
        <td>${escHtml(m.workplace||'-')}</td>
        <td>${escHtml(m.institution||'-')}</td>
        <td>${escHtml(m.phone||'-')}</td>
        <td><span class="badge ${statCls}">${escHtml(m.status||'-')}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm" style="background:#3b82f6;color:#fff;margin-right:4px" onclick="openMemberEdit(${i})">✏️ แก้ไข</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMember('${escHtml(String(m.id||''))}','${escHtml([m.rank,m.fname,m.lname].filter(Boolean).join(' '))}')">🗑️ ลบ</button>
        </td>
      </tr>`;
    }).join('');
    renderPagination('admin-pagination', data.total, page, 'adminSearchMembers');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="9" style="color:#dc2626;text-align:center;padding:1rem">ยังไม่ได้เชื่อมต่อ API</td></tr>';
  }
}

let _memberSearchTimer = null;
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('admin-search');
  if (inp) inp.addEventListener('input', () => {
    clearTimeout(_memberSearchTimer);
    _memberSearchTimer = setTimeout(() => adminSearchMembers(1), 400);
  });
});

function openMemberEdit(idx) {
  const m = _adminMemberCache[idx];
  if (!m) return;
  document.getElementById('em-id').value        = m.id || '';
  document.getElementById('em-rank').value      = m.rank || '';
  document.getElementById('em-fname').value     = m.fname || '';
  document.getElementById('em-lname').value     = m.lname || '';
  document.getElementById('em-gen').value       = m.gen || '';
  document.getElementById('em-type').value      = m.type || 'สามัญ';
  document.getElementById('em-status').value    = m.status || 'มีชีวิต';
  document.getElementById('em-workplace').value = m.workplace || '';
  document.getElementById('em-inst').value      = m.institution || '';
  document.getElementById('em-phone').value     = m.phone || '';
  document.getElementById('em-addr').value      = m.address || '';
  document.getElementById('edit-member-modal').classList.add('open');
}

async function saveMemberEdit() {
  const id = document.getElementById('em-id').value;
  if (!id) return;
  try {
    await API.updateMember({
      email: adminEmail(), id,
      rank:        document.getElementById('em-rank').value,
      fname:       document.getElementById('em-fname').value,
      lname:       document.getElementById('em-lname').value,
      gen:         document.getElementById('em-gen').value,
      type:        document.getElementById('em-type').value,
      status:      document.getElementById('em-status').value,
      workplace:   document.getElementById('em-workplace').value,
      institution: document.getElementById('em-inst').value,
      phone:       document.getElementById('em-phone').value,
      address:     document.getElementById('em-addr').value,
    });
    closeModal('edit-member-modal');
    showToast('บันทึกสำเร็จ', 'success');
    adminSearchMembers(adminPage);
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function deleteMember(id, name) {
  if (!confirm(`ยืนยันลบสมาชิก "${name}"?`)) return;
  try {
    await apiPost({ action: 'deleteMember', id, email: adminEmail() });
    showToast('ลบเรียบร้อยแล้ว', 'success');
    adminSearchMembers(adminPage);
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// Logbook
async function loadLogbooks() {
  const id = document.getElementById('logbook-member-id').value.trim();
  const tbody = document.getElementById('logbook-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>';
  try {
    const data = await API.getLogbooks(id);
    const rows = data.logbooks || [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่พบ Logbook</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escHtml(formatDate(r.timestamp))}</td>
        <td>${escHtml(r.member_id)}</td>
        <td>${escHtml(r.welfare)}</td>
        <td>${escHtml(r.activity)}</td>
        <td>${escHtml(r.approver)}</td>
        <td>${escHtml(r.recorder)}</td>
      </tr>
    `).join('');
  } catch(e) { tbody.innerHTML = '<tr><td colspan="6" style="color:#dc2626;text-align:center">ยังไม่ได้เชื่อมต่อ API</td></tr>'; }
}

function openLogbookModal() { document.getElementById('logbook-modal').classList.add('open'); }

async function submitLogbook(e) {
  e.preventDefault();
  const data = {};
  new FormData(e.target).forEach((v, k) => { data[k] = v; });
  try {
    await API.addLogbook(data);
    showToast('บันทึก Logbook เรียบร้อยแล้ว', 'success');
    closeModal('logbook-modal');
    e.target.reset();
    loadLogbooks();
  } catch(err) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// News
let _adminNewsCache = [];

async function loadAdminNews() {
  const tbody = document.getElementById('news-tbody');
  try {
    const data = await API.getNews();
    _adminNewsCache = data.news || [];
    if (!_adminNewsCache.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">ยังไม่มีข่าว</td></tr>';
      return;
    }
    tbody.innerHTML = _adminNewsCache.map((n, i) => `
      <tr id="news-row-${escHtml(n.id)}">
        <td style="white-space:nowrap">${escHtml(formatDate(n.date))}</td>
        <td style="text-align:center">${n.pinned ? '📌' : ''}</td>
        <td>${escHtml(n.category)}</td>
        <td>${escHtml(n.title)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(n.summary)}</td>
        <td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap;padding:6px 8px">
          <button class="btn btn-sm" style="background:${n.pinned?'#f59e0b':'#fef3c7'};color:${n.pinned?'#fff':'#92400e'};padding:3px 8px"
            onclick="togglePin('${escHtml(n.id)}',${!n.pinned})" title="${n.pinned?'เลิกปักหมุด':'ปักหมุด'}">📌</button>
          ${i > 0 ? `<button class="btn btn-sm" style="background:#e0e7ff;color:#3730a3;padding:3px 8px" onclick="moveNews('${escHtml(n.id)}','up')">↑</button>` : ''}
          ${i < _adminNewsCache.length-1 ? `<button class="btn btn-sm" style="background:#e0e7ff;color:#3730a3;padding:3px 8px" onclick="moveNews('${escHtml(n.id)}','down')">↓</button>` : ''}
          <button class="btn btn-sm" style="background:#d1fae5;color:#065f46;padding:3px 8px" onclick="openEditNews('${escHtml(n.id)}')">✏️</button>
          <button class="btn btn-sm btn-danger" style="padding:3px 8px" onclick="deleteNews('${escHtml(n.id)}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#dc2626;text-align:center">ยังไม่ได้เชื่อมต่อ API</td></tr>';
  }
}

function openNewsModal() {
  document.getElementById('news-modal-title').textContent = 'เพิ่มข่าวประชาสัมพันธ์';
  document.getElementById('news-form').reset();
  document.querySelector('#news-form [name="news_id"]').value = '';
  document.getElementById('news-modal').classList.add('open');
}

function openEditNews(id) {
  const n = _adminNewsCache.find(x => x.id === id);
  if (!n) return;
  document.getElementById('news-modal-title').textContent = 'แก้ไขข่าว';
  const f = document.getElementById('news-form');
  f.reset();
  f.querySelector('[name="news_id"]').value    = n.id;
  f.querySelector('[name="category"]').value   = n.category || 'ทั่วไป';
  f.querySelector('[name="date"]').value       = n.date || '';
  f.querySelector('[name="title"]').value      = n.title || '';
  f.querySelector('[name="summary"]').value    = n.summary || '';
  f.querySelector('[name="content"]').value    = n.content || '';
  document.getElementById('news-modal').classList.add('open');
}

async function submitNews(e) {
  e.preventDefault();
  const payload = {};
  new FormData(e.target).forEach((v, k) => { payload[k] = v; });
  payload.email = adminEmail();
  try {
    if (payload.news_id) {
      payload.id = payload.news_id;
      payload.action = 'updateNews';
      await apiPost(payload);
    } else {
      await API.addNews(payload);
    }
    showToast('บันทึกข่าวเรียบร้อยแล้ว', 'success');
    closeModal('news-modal');
    loadAdminNews();
  } catch(err) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function togglePin(id, pinned) {
  try {
    await apiPost({ action: 'pinNews', id, pinned, email: adminEmail() });
    showToast(pinned ? 'ปักหมุดแล้ว' : 'เลิกปักหมุดแล้ว', 'success');
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function moveNews(id, direction) {
  try {
    await apiPost({ action: 'reorderNews', id, direction, email: adminEmail() });
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function deleteNews(id) {
  if (!confirm('ยืนยันลบข่าวนี้?')) return;
  try {
    await apiPost({ action: 'deleteNews', id, email: adminEmail() });
    showToast('ลบข่าวเรียบร้อยแล้ว', 'success');
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
