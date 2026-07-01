// members.js — members.html logic
function renderRows(members) {
  const loading = document.getElementById('member-loading');
  const empty   = document.getElementById('member-empty');
  const scroll  = document.getElementById('member-scroll');
  const list    = document.getElementById('member-list');
  loading.style.display = 'none';
  if (!members || members.length === 0) {
    empty.style.display = ''; scroll.style.display = 'none'; return;
  }
  empty.style.display = 'none';
  list.innerHTML = members.map((m, i) => {
    const no      = escHtml(String(m.row_num || (i+1)));
    const name    = escHtml([m.rank, m.fname, m.lname].filter(Boolean).join(' '));
    const gen     = escHtml(String(m.gen || '-'));
    const type    = escHtml(m.type || '-');
    const statCls = m.status === 'มีชีวิต' ? 'badge-green' : 'badge-red';
    const stat    = `<span class="badge ${statCls}" style="font-size:.72rem">${escHtml(m.status || '-')}</span>`;
    const bg      = i % 2 === 0 ? '#fff' : '#f8f9fc';
    return `<div style="display:grid;grid-template-columns:48px 56px 1fr 80px 80px;gap:0;padding:.5rem 1rem;border-bottom:1px solid #f0f0f5;font-size:.88rem;align-items:center;background:${bg}">
      <span style="color:var(--text-muted);font-size:.8rem">${no}</span>
      <span style="color:var(--gold);font-weight:600;font-size:.82rem">${gen}</span>
      <span style="color:var(--navy);font-weight:600">${name}</span>
      <span style="text-align:center;color:#475569;font-size:.82rem">${type}</span>
      <span style="text-align:center">${stat}</span>
    </div>`;
  }).join('');
  scroll.style.display = '';
}

async function getCachedMembers() {
  const cached = sessionStorage.getItem('members_data');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Cache for 30 minutes
      if (parsed.timestamp && (Date.now() - parsed.timestamp < 30 * 60 * 1000)) {
        return parsed.members;
      }
    } catch(e) {
      sessionStorage.removeItem('members_data');
    }
  }
  
  const data = await API.searchMembers('', '', '', 1, 9999);
  const members = data.members || [];
  sessionStorage.setItem('members_data', JSON.stringify({
    members: members,
    timestamp: Date.now()
  }));
  return members;
}

async function doSearch() {
  const query = document.getElementById('s-name').value.trim();
  const gen   = document.getElementById('s-gen').value;
  const type  = document.getElementById('s-type').value;
  document.getElementById('member-loading').style.display = '';
  document.getElementById('member-scroll').style.display = 'none';
  document.getElementById('member-empty').style.display  = 'none';
  try {
    const allMembers = await getCachedMembers();
    
    // กรองข้อมูลบนฝั่งเบราว์เซอร์ทันที (รวดเร็วมาก)
    const filtered = allMembers.filter(m => {
      if (query) {
        const queryLower = query.toLowerCase();
        const s = [m.rank, m.fname, m.lname, m.id].filter(Boolean).join(' ').toLowerCase();
        if (s.indexOf(queryLower) < 0) return false;
      }
      if (gen && String(m.gen).trim() !== gen) return false;
      if (type && String(m.type).trim() !== type) return false;
      return true;
    });

    document.getElementById('result-count').textContent = `พบ ${filtered.length.toLocaleString()} รายการ`;
    renderRows(filtered);
  } catch(e) {
    document.getElementById('member-loading').style.display = 'none';
    document.getElementById('member-empty').style.display  = '';
    document.getElementById('member-empty').textContent    = '⚠️ ยังไม่ได้เชื่อมต่อ API';
  }
}

async function loadFilterOptions() {
  try {
    const data = await API.getFilterOptions();
    const genSel  = document.getElementById('s-gen');
    const typeSel = document.getElementById('s-type');
    (data.generations || []).forEach(g => {
      genSel.innerHTML += `<option value="${escHtml(g)}">${escHtml(g)}</option>`;
    });
    typeSel.innerHTML = '<option value="">ทุกประเภท</option>';
    (data.types || []).forEach(t => {
      typeSel.innerHTML += `<option value="${escHtml(t)}">${escHtml(t)}</option>`;
    });
  } catch(e) {}
}

let _searchTimer = null;
document.getElementById('s-name').addEventListener('input', () => {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(doSearch, 400);
});
document.getElementById('s-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearTimeout(_searchTimer); doSearch(); }
});

loadFilterOptions();
doSearch();
