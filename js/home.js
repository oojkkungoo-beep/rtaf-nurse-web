// home.js — index.html logic
let _newsCache = [];

function newsRowHtml(n, idx) {
  return `<div onclick="openDetail(${idx})" style="padding:0.85rem 1.1rem;border-bottom:1px solid #f0f4f8;cursor:pointer;transition:background .15s" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background=''">
    <div style="font-size:0.75rem;color:var(--gold);font-weight:600;margin-bottom:.25rem">
      ${escHtml(formatDate(n.date))} &nbsp;|&nbsp; ${escHtml(n.category||'ทั่วไป')}
      ${n.pinned?'<span class="news-pinned-badge">📌 ปักหมุด</span>':''}
    </div>
    <div style="font-weight:600;color:var(--navy);font-size:.95rem;margin-bottom:.2rem">${escHtml(n.title)}</div>
    <div style="color:var(--text-muted);font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(n.summary)}</div>
  </div>`;
}

function renderNews(news) {
  const loading = document.getElementById('news-loading');
  const empty   = document.getElementById('news-empty');
  const wrap    = document.getElementById('news-scroll-wrap');
  const listEl  = document.getElementById('news-list');
  loading.style.display = 'none';
  if (!news || news.length === 0) { empty.style.display = ''; wrap.style.display = 'none'; return; }
  empty.style.display = 'none';
  listEl.innerHTML = news.map((n, i) => newsRowHtml(n, i)).join('');
  wrap.style.display = '';
}

async function loadStats() {
  try {
    const data = await API.getStats();
    document.getElementById('stat-total').textContent = (data.total || 0).toLocaleString();
    document.getElementById('stat-active').textContent = (data.active || 0).toLocaleString();
    document.getElementById('stat-gen').textContent = (data.generations || 0).toLocaleString();
  } catch(e) {}
}

async function loadNews() {
  try {
    const data = await API.getNews();
    _newsCache = data.news || [];
    renderNews(_newsCache);
  } catch(e) {
    document.getElementById('news-loading').style.display = 'none';
    document.getElementById('news-list').innerHTML = '<p style="color:var(--text-muted);padding:1rem">⚠️ ยังไม่ได้เชื่อมต่อ API</p>';
    document.getElementById('news-scroll-wrap').style.display = '';
  }
}

function openDetail(idx) {
  const n = _newsCache[idx];
  if (!n) return;
  document.getElementById('nd-meta').textContent = `${formatDate(n.date)}  |  ${n.category||'ทั่วไป'}`;
  document.getElementById('nd-title').textContent = n.title || '';
  document.getElementById('nd-summary').textContent = n.summary || '';
  const contentEl = document.getElementById('nd-content');
  contentEl.textContent = n.content || '';
  contentEl.style.display = n.content ? '' : 'none';
  document.getElementById('news-detail-bg').style.display = 'flex';
}

function closeDetail() {
  document.getElementById('news-detail-bg').style.display = 'none';
}

document.getElementById('news-detail-bg').addEventListener('click', function(e) {
  if (e.target === this) closeDetail();
});

loadStats();
loadNews();
