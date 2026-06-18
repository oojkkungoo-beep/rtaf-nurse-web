// admin.js — admin/index.html logic

function adminEmail() {
  return JSON.parse(sessionStorage.getItem('adminUser') || '{}').email || '';
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function onAuthSuccess(user) {
  sessionStorage.setItem('adminUser', JSON.stringify({ email: user.email, name: user.name }));
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('user-chip').style.display = 'flex';
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-avatar').src = user.picture;
  loadDashboard();
  loadPending();
  loadAdminNews();
  loadAdminFilterOptions();
}

function onAuthSignOut() {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('user-chip').style.display = 'none';
}

window.addEventListener('load', () => {
  initGoogleAuth();
  showGoogleSignIn('google-signin-btn');
});

// ── Tab navigation ────────────────────────────────────────────────────────────
function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'members')   adminSearchMembers(1);
  if (name === 'logbook')   { loadLogbookOptions(); searchLogbooks(); }
  if (name === 'adminmgmt') loadAdmins();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const d = await API.getStats();

    // Stat cards
    document.getElementById('stat-cards').innerHTML = [
      { label:'ข้อมูลทั้งหมด',    val: d.total,       color:'#1a2a5e' },
      { label:'มีชีวิต',          val: d.active,      color:'#166534' },
      { label:'เสียชีวิต',        val: d.deceased,    color:'#991b1b' },
      { label:'จำนวนรุ่น',        val: d.generations, color:'#92400e' },
    ].map(s => `
      <div class="stat-card" style="border-top-color:${s.color}">
        <div class="val" style="color:${s.color}">${(s.val || 0).toLocaleString()}</div>
        <div class="lbl">${s.label}</div>
      </div>`).join('');

    // Type breakdown
    const typeBar = document.getElementById('type-bar');
    if (typeBar && d.by_type) {
      typeBar.innerHTML = d.by_type
        .sort((a, b) => b.count - a.count)
        .map(t => `<span class="type-pill">${escHtml(t.type)}: <strong>${t.count.toLocaleString()}</strong> คน</span>`)
        .join('');
    }

    // Detail tables
    const detailEl = document.getElementById('dashboard-detail');
    if (!detailEl) return;

    const instRows = (d.by_inst || []).map((r, i) => `
      <tr style="background:${i%2?'#f8f9fc':'#fff'}">
        <td style="padding:.4rem .7rem;font-size:.85rem">${escHtml(r.inst)}</td>
        <td style="padding:.4rem .7rem;text-align:center;font-size:.85rem;font-weight:600">${r.count.toLocaleString()}</td>
      </tr>`).join('');

    const genRows = (d.by_gen || []).map((r, i) => {
      const total = r.member + r.non_member;
      const nonCls = r.non_member > 0 ? 'color:#dc2626' : 'color:#6b7280';
      return `<tr style="background:${i%2?'#f8f9fc':'#fff'}">
        <td style="padding:.35rem .7rem;text-align:center;font-size:.82rem;font-weight:700;color:var(--gold)">${escHtml(String(r.gen))}</td>
        <td style="padding:.35rem .7rem;text-align:center;font-size:.82rem;color:#166534;font-weight:600">${r.member.toLocaleString()}</td>
        <td style="padding:.35rem .7rem;text-align:center;font-size:.82rem;${nonCls};font-weight:600">${r.non_member.toLocaleString()}</td>
        <td style="padding:.35rem .7rem;text-align:center;font-size:.82rem;font-weight:700">${total.toLocaleString()}</td>
      </tr>`;
    }).join('');

    detailEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <!-- Institution -->
        <div style="background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden">
          <div style="padding:.65rem 1rem;background:var(--navy);color:#fff;font-weight:700;font-size:.88rem">สถาบัน ชศพอ.</div>
          <div style="max-height:220px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f0f4ff">
                <th style="padding:.4rem .7rem;text-align:left;font-size:.78rem;color:var(--navy)">สถาบัน</th>
                <th style="padding:.4rem .7rem;text-align:center;font-size:.78rem;color:var(--navy)">จำนวน</th>
              </tr></thead>
              <tbody>${instRows || '<tr><td colspan="2" style="text-align:center;padding:1rem;color:var(--text-muted)">ไม่มีข้อมูล</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <!-- Status summary -->
        <div style="background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden">
          <div style="padding:.65rem 1rem;background:var(--navy);color:#fff;font-weight:700;font-size:.88rem">สถานะสมาชิก ชศพอ.</div>
          <div style="padding:1rem">
            ${(d.by_type || []).sort((a,b)=>b.count-a.count).map(t => {
              const bar = Math.round((t.count / (d.total || 1)) * 100);
              const col = t.type === 'สามัญ' ? '#1a2a5e' : t.type === 'สมทบ' ? '#0ea5e9' : '#9ca3af';
              return `<div style="margin-bottom:.75rem">
                <div style="display:flex;justify-content:space-between;font-size:.83rem;margin-bottom:.2rem">
                  <span style="font-weight:600">${escHtml(t.type)}</span>
                  <span style="color:var(--text-muted)">${t.count.toLocaleString()} คน</span>
                </div>
                <div style="height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden">
                  <div style="width:${bar}%;height:100%;background:${col};border-radius:99px"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <!-- Generation table -->
      <div style="background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden">
        <div style="padding:.65rem 1rem;background:var(--navy);color:#fff;font-weight:700;font-size:.88rem">รายงานตามรุ่น</div>
        <div style="max-height:380px;overflow-y:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead style="position:sticky;top:0;z-index:1">
              <tr style="background:#f0f4ff">
                <th style="padding:.4rem .7rem;text-align:center;font-size:.78rem;color:var(--navy)">รุ่น</th>
                <th style="padding:.4rem .7rem;text-align:center;font-size:.78rem;color:#166534">เป็นสมาชิก</th>
                <th style="padding:.4rem .7rem;text-align:center;font-size:.78rem;color:#dc2626">ไม่เป็นสมาชิก</th>
                <th style="padding:.4rem .7rem;text-align:center;font-size:.78rem;color:var(--navy)">รวม</th>
              </tr>
            </thead>
            <tbody>${genRows || '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text-muted)">ไม่มีข้อมูล</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch(e) {
    document.getElementById('stat-cards').innerHTML = '<p style="color:var(--text-muted)">ยังไม่ได้เชื่อมต่อ API</p>';
  }
}

// ── Pending ────────────────────────────────────────────────────────────────────
async function loadPending() {
  try {
    const data = await API.getPendingRegistrations();
    const rows = data.pending || [];
    const badge = document.getElementById('pending-badge');
    if (badge) badge.textContent = rows.length ? `(${rows.length} รายการ)` : '(ไม่มี)';
    const tbody = document.getElementById('pending-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่มีใบสมัครรอการอนุมัติ</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escHtml(formatDate(r.submitted_at))}</td>
        <td>${escHtml(r.rank)} ${escHtml(r.firstname)} ${escHtml(r.lastname)}</td>
        <td>${escHtml(String(r.generation))}</td>
        <td>${escHtml(r.member_type)}</td>
        <td>${escHtml(r.mobile_phone)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-gold" onclick="approveMember('${escHtml(r.row_id)}')">อนุมัติ</button>
          <button class="btn btn-sm btn-danger" onclick="rejectMember('${escHtml(r.row_id)}')">ปฏิเสธ</button>
        </td>
      </tr>`).join('');
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

// ── Members ────────────────────────────────────────────────────────────────────
let _adminMemberCache = [];

async function loadAdminFilterOptions() {
  try {
    const data = await API.getFilterOptions();
    const genSel  = document.getElementById('admin-s-gen');
    const typeSel = document.getElementById('admin-s-type');
    if (genSel && data.generations) {
      data.generations.forEach(g => {
        const o = document.createElement('option');
        o.value = o.textContent = g;
        genSel.appendChild(o);
      });
    }
    if (typeSel && data.types) {
      data.types.forEach(t => {
        const o = document.createElement('option');
        o.value = o.textContent = t;
        typeSel.appendChild(o);
      });
    }
  } catch(e) {}
}

async function adminSearchMembers() {
  const query = document.getElementById('admin-search').value.trim();
  const gen   = document.getElementById('admin-s-gen').value;
  const type  = document.getElementById('admin-s-type').value;
  const tbody = document.getElementById('admin-member-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div></td></tr>';
  try {
    const data = await API.searchMembers(query, gen, type, 1, 9999);
    _adminMemberCache = data.members || [];
    document.getElementById('admin-result-count').textContent = `พบ ${(data.total || 0).toLocaleString()} รายการ`;
    if (!_adminMemberCache.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่พบข้อมูล</td></tr>';
      return;
    }
    tbody.innerHTML = _adminMemberCache.map((m, i) => {
      const statCls = m.status === 'มีชีวิต' ? 'badge-green' : 'badge-red';
      return `<tr class="admin-member-row" onclick="openMemberDetail(${i})">
        <td style="text-align:center">${escHtml(String(m.row_num || i+1))}</td>
        <td style="text-align:center">${escHtml(String(m.gen || '-'))}</td>
        <td>${escHtml([m.rank, m.fname, m.lname].filter(Boolean).join(' '))}</td>
        <td>${escHtml(m.type || '-')}</td>
        <td>${escHtml(m.workplace || '-')}</td>
        <td>${escHtml(m.institution || '-')}</td>
        <td>${escHtml(m.phone || '-')}</td>
        <td><span class="badge ${statCls}">${escHtml(m.status || '-')}</span></td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button class="btn btn-sm" style="background:#3b82f6;color:#fff;padding:3px 8px;margin-right:4px"
            onclick="openMemberEdit(${i})">✏️</button>
          <button class="btn btn-sm btn-danger" style="padding:3px 8px"
            onclick="deleteMember('${escHtml(String(m.id || ''))}','${escHtml([m.rank,m.fname,m.lname].filter(Boolean).join(' '))}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');
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
  const lbInp = document.getElementById('lb-search');
  if (lbInp) lbInp.addEventListener('input', () => {
    clearTimeout(_lbSearchTimer);
    _lbSearchTimer = setTimeout(() => searchLogbooks(), 400);
  });
});

// ── Member Detail Modal ───────────────────────────────────────────────────────
let _detailMember = null;

function openMemberDetail(idx) {
  const m = _adminMemberCache[idx];
  if (!m) return;
  _detailMember = m;

  document.getElementById('detail-title').textContent =
    [m.rank, m.fname, m.lname].filter(Boolean).join(' ');

  const statCls = m.status === 'มีชีวิต' ? 'badge-green' : 'badge-red';
  const di = (label, val, full=false) =>
    `<div${full?' class="full"':''}><div class="detail-label">${label}</div><div class="detail-val">${val}</div></div>`;
  document.getElementById('detail-info').innerHTML =
    di('เลขที่สมาชิก', escHtml(String(m.id||'-'))) +
    di('ลำดับ', escHtml(String(m.row_num||'-'))) +
    di('รุ่น', `<span style="color:var(--gold)">${escHtml(String(m.gen||'-'))}</span>`) +
    di('ประเภท', escHtml(m.type||'-')) +
    di('ยศ ชื่อ นามสกุล', `<span style="font-size:1.05rem">${escHtml([m.rank,m.fname,m.lname].filter(Boolean).join(' '))}</span>`, true) +
    di('สถานะ', `<span class="badge ${statCls}">${escHtml(m.status||'-')}</span>`) +
    di('วันเกิด', escHtml(m.birthdate||'-')) +
    di('เบอร์มือถือ', escHtml(m.phone||'-')) +
    di('เบอร์ทำงาน', escHtml(m.work_phone||'-')) +
    di('เบอร์บ้าน', escHtml(m.home_phone||'-')) +
    di('สถานภาพสมรส', escHtml(m.marital||'-')) +
    di('ชื่อคู่สมรส', escHtml(m.spouse||'-')) +
    di('สถานปฏิบัติงาน', escHtml(m.workplace||'-'), true) +
    di('สถาบัน', escHtml(m.institution||'-')) +
    di('ที่อยู่', `<span style="font-weight:400">${escHtml(m.address||'-')}</span>`, true);

  document.getElementById('detail-logbook').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById('member-detail-modal').classList.add('open');
  loadDetailLogbooks(m.id);
}

async function loadDetailLogbooks(memberId) {
  const el = document.getElementById('detail-logbook');
  try {
    const data = await API.getLogbooks(memberId);
    const logs = data.logbooks || [];
    if (!logs.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:.87rem;padding:.5rem 0">ยังไม่มี Logbook</p>';
      return;
    }
    el.innerHTML = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="display:grid;grid-template-columns:80px 1fr 100px 90px;gap:.5rem;padding:.45rem .75rem;background:var(--navy);color:#fff;font-size:.75rem;font-weight:700">
          <span>วันที่</span><span>กิจกรรม / รายละเอียด</span><span>สวัสดิการ</span><span>ผู้อนุมัติ</span>
        </div>
        ${logs.map((l, i) => `
          <div style="display:grid;grid-template-columns:80px 1fr 100px 90px;gap:.5rem;padding:.45rem .75rem;font-size:.83rem;border-bottom:1px solid #f0f0f5;background:${i%2?'#f8f9fc':'#fff'}">
            <span style="color:var(--text-muted)">${escHtml(String(l.timestamp||'').split('T')[0])}</span>
            <span>${escHtml(l.activity || '-')}</span>
            <span>${escHtml(l.welfare || '-')}</span>
            <span>${escHtml(l.approver || '-')}</span>
          </div>`).join('')}
      </div>`;
  } catch(e) {
    el.innerHTML = '<p style="color:#dc2626;font-size:.87rem">โหลด Logbook ไม่สำเร็จ</p>';
  }
}

function openEditFromDetail() {
  if (!_detailMember) return;
  const idx = _adminMemberCache.findIndex(m => m.id === _detailMember.id);
  if (idx >= 0) openMemberEdit(idx);
}

function deleteFromDetail() {
  if (!_detailMember) return;
  const m = _detailMember;
  deleteMember(String(m.id || ''), [m.rank, m.fname, m.lname].filter(Boolean).join(' '));
}

function openLogbookForMember() {
  if (!_detailMember) return;
  const m = _detailMember;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('lm-date').value     = today;
  document.getElementById('lm-member-id').value = String(m.id || '');
  document.getElementById('lm-rank').value     = m.rank || '';
  document.getElementById('lm-gen').value      = String(m.gen || '');
  document.getElementById('lm-fullname').value = [m.rank, m.fname, m.lname].filter(Boolean).join(' ');
  document.getElementById('lm-welfare').value  = '';
  document.getElementById('lm-approver').value = '';
  document.getElementById('lm-activity').value = '';
  document.getElementById('logbook-member-modal').classList.add('open');
}

async function submitMemberLogbook() {
  const memberId  = document.getElementById('lm-member-id').value;
  const date      = document.getElementById('lm-date').value;
  const welfare   = document.getElementById('lm-welfare').value;
  const activity  = document.getElementById('lm-activity').value.trim();
  const approver  = document.getElementById('lm-approver').value.trim();
  const rank      = document.getElementById('lm-rank').value;
  const fullname  = document.getElementById('lm-fullname').value;
  const gen       = document.getElementById('lm-gen').value;
  if (!welfare || !activity || !approver) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
  try {
    await apiPost({ action:'addLogbook', email:adminEmail(), memberId, date, rank, fullname, gen, welfare, activity, approver });
    showToast('บันทึก Logbook เรียบร้อยแล้ว', 'success');
    closeModal('logbook-member-modal');
    if (_detailMember) loadDetailLogbooks(_detailMember.id);
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// ── Member Edit / Delete ──────────────────────────────────────────────────────
function openMemberEdit(idx) {
  const m = _adminMemberCache[idx];
  if (!m) return;
  document.getElementById('em-id').value         = m.id || '';
  document.getElementById('em-rank').value       = m.rank || '';
  document.getElementById('em-fname').value      = m.fname || '';
  document.getElementById('em-lname').value      = m.lname || '';
  document.getElementById('em-gen').value        = m.gen || '';
  document.getElementById('em-type').value       = m.type || 'สามัญ';
  document.getElementById('em-status').value     = m.status || 'มีชีวิต';
  document.getElementById('em-workplace').value  = m.workplace || '';
  document.getElementById('em-inst').value       = m.institution || '';
  document.getElementById('em-phone').value      = m.phone || '';
  document.getElementById('em-birthdate').value  = m.birthdate || '';
  document.getElementById('em-work-phone').value = m.work_phone || '';
  document.getElementById('em-home-phone').value = m.home_phone || '';
  document.getElementById('em-marital').value    = m.marital || '';
  document.getElementById('em-spouse').value     = m.spouse || '';
  document.getElementById('em-addr').value       = m.address || '';
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
      birthdate:   document.getElementById('em-birthdate').value,
      work_phone:  document.getElementById('em-work-phone').value,
      home_phone:  document.getElementById('em-home-phone').value,
      marital:     document.getElementById('em-marital').value,
      spouse:      document.getElementById('em-spouse').value,
      address:     document.getElementById('em-addr').value,
    });
    closeModal('edit-member-modal');
    showToast('บันทึกสำเร็จ', 'success');
    adminSearchMembers();
    if (_detailMember && _detailMember.id === id) closeModal('member-detail-modal');
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function deleteMember(id, name) {
  if (!confirm(`ยืนยันลบสมาชิก "${name}"?`)) return;
  try {
    await apiPost({ action:'deleteMember', id, email:adminEmail() });
    showToast('ลบเรียบร้อยแล้ว', 'success');
    closeModal('member-detail-modal');
    adminSearchMembers();
    loadDashboard();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// ── Logbook (all) ─────────────────────────────────────────────────────────────
let _lbSearchTimer = null;

async function loadLogbookOptions() {
  try {
    const data = await API.getLogbookOptions();
    const genSel     = document.getElementById('lb-s-gen');
    const welfareSel = document.getElementById('lb-s-welfare');
    // clear old dynamic options
    while (genSel.options.length > 1)     genSel.remove(1);
    while (welfareSel.options.length > 1) welfareSel.remove(1);
    (data.gens || []).forEach(g => {
      const o = document.createElement('option'); o.value = o.textContent = g; genSel.appendChild(o);
    });
    (data.welfares || []).forEach(w => {
      const o = document.createElement('option'); o.value = o.textContent = w; welfareSel.appendChild(o);
    });
  } catch(e) {}
}

async function searchLogbooks() {
  const query   = (document.getElementById('lb-search')?.value || '').trim();
  const gen     = document.getElementById('lb-s-gen')?.value || '';
  const welfare = document.getElementById('lb-s-welfare')?.value || '';
  const tbody   = document.getElementById('logbook-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>';
  try {
    const data = await API.searchLogbooks(query, gen, welfare);
    const logs = data.logbooks || [];
    document.getElementById('lb-result-count').textContent = `พบ ${(data.total || 0).toLocaleString()} รายการ`;
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่พบข้อมูล</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map((l, i) => `
      <tr style="background:${i%2?'#f8f9fc':'#fff'}">
        <td>${escHtml(String(l.timestamp||'').split('T')[0])}</td>
        <td>${escHtml(l.fullname || l.member_id || '-')}</td>
        <td style="text-align:center">${escHtml(String(l.gen || '-'))}</td>
        <td>${escHtml(l.welfare || '-')}</td>
        <td>${escHtml(l.activity || '-')}</td>
        <td>${escHtml(l.approver || '-')}</td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#dc2626;text-align:center;padding:1rem">ยังไม่ได้เชื่อมต่อ API</td></tr>';
  }
}

function openStandaloneLogbookModal() {
  document.getElementById('logbook-form').reset();
  const today = new Date().toISOString().split('T')[0];
  document.querySelector('#logbook-form [name="date"]').value = today;
  document.getElementById('logbook-standalone-modal').classList.add('open');
}

async function submitStandaloneLogbook(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {};
  fd.forEach((v, k) => { data[k] = v; });
  data.email = adminEmail();
  data.action = 'addLogbook';
  try {
    await apiPost(data);
    showToast('บันทึก Logbook เรียบร้อยแล้ว', 'success');
    closeModal('logbook-standalone-modal');
    e.target.reset();
    searchLogbooks();
  } catch(err) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// ── News ──────────────────────────────────────────────────────────────────────
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
            onclick="togglePin('${escHtml(n.id)}',${!n.pinned})">📌</button>
          ${i > 0 ? `<button class="btn btn-sm" style="background:#e0e7ff;color:#3730a3;padding:3px 8px" onclick="moveNews('${escHtml(n.id)}','up')">↑</button>` : ''}
          ${i < _adminNewsCache.length-1 ? `<button class="btn btn-sm" style="background:#e0e7ff;color:#3730a3;padding:3px 8px" onclick="moveNews('${escHtml(n.id)}','down')">↓</button>` : ''}
          <button class="btn btn-sm" style="background:#d1fae5;color:#065f46;padding:3px 8px" onclick="openEditNews('${escHtml(n.id)}')">✏️</button>
          <button class="btn btn-sm btn-danger" style="padding:3px 8px" onclick="deleteNews('${escHtml(n.id)}')">🗑️</button>
        </td>
      </tr>`).join('');
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
  f.querySelector('[name="news_id"]').value  = n.id;
  f.querySelector('[name="category"]').value = n.category || 'ทั่วไป';
  f.querySelector('[name="date"]').value     = n.date || '';
  f.querySelector('[name="title"]').value    = n.title || '';
  f.querySelector('[name="summary"]').value  = n.summary || '';
  f.querySelector('[name="content"]').value  = n.content || '';
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
    await apiPost({ action:'pinNews', id, pinned, email:adminEmail() });
    showToast(pinned ? 'ปักหมุดแล้ว' : 'เลิกปักหมุดแล้ว', 'success');
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function moveNews(id, direction) {
  try {
    await apiPost({ action:'reorderNews', id, direction, email:adminEmail() });
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function deleteNews(id) {
  if (!confirm('ยืนยันลบข่าวนี้?')) return;
  try {
    await apiPost({ action:'deleteNews', id, email:adminEmail() });
    showToast('ลบข่าวเรียบร้อยแล้ว', 'success');
    loadAdminNews();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// ── Admin Management ──────────────────────────────────────────────────────────
async function loadAdmins() {
  const el = document.getElementById('admin-list');
  try {
    const data = await API.getAdmins();
    const admins = data.admins || [];
    if (!admins.length) {
      el.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">ไม่พบข้อมูล Admin</div>';
      return;
    }
    el.innerHTML = admins.map(a => `
      <div class="admin-list-row">
        <div style="flex:1">
          <div style="font-weight:600">${escHtml(a.email)}</div>
          <div style="font-size:.8rem;color:var(--text-muted)">${escHtml(a.name || '')}${a.added_by ? ` — เพิ่มโดย ${escHtml(a.added_by)}` : ''}</div>
        </div>
        ${a.removable ? `<button class="btn btn-sm btn-danger" onclick="removeAdmin('${escHtml(a.email)}')">ลบ</button>` : '<span class="badge badge-green" style="font-size:.72rem">Superadmin</span>'}
      </div>`).join('');
  } catch(e) {
    el.innerHTML = '<div style="padding:1rem;color:#dc2626">โหลดไม่สำเร็จ</div>';
  }
}

async function addAdmin() {
  const email = document.getElementById('new-admin-email').value.trim();
  const name  = document.getElementById('new-admin-name').value.trim();
  if (!email) { showToast('กรุณาระบุ Gmail', 'error'); return; }
  try {
    const res = await API.addAdmin(email, name);
    if (res.error) { showToast(res.error, 'error'); return; }
    showToast('เพิ่ม Admin เรียบร้อยแล้ว', 'success');
    document.getElementById('new-admin-email').value = '';
    document.getElementById('new-admin-name').value  = '';
    loadAdmins();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

async function removeAdmin(email) {
  if (!confirm(`ยืนยันลบ Admin "${email}"?`)) return;
  try {
    const res = await API.removeAdmin(email);
    if (res.error) { showToast(res.error, 'error'); return; }
    showToast('ลบ Admin เรียบร้อยแล้ว', 'success');
    loadAdmins();
  } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
