const SHEET_ID = '1Z4bYmol5qtVGQNDWAEHrNHyZyGLlqHncFJWPPxqY7Qw';
const MEMBERS_SHEET = 'Members';
const NEWS_SHEET = 'News';
const PENDING_SHEET = 'Pending';
const LOGBOOK_SHEET = 'Logbooks';

const ADMIN_EMAILS = ['oojkkungoo@gmail.com', 'nurse.rtafnc@gmail.com'];

// Column indices (0-based) ตาม Sheet จริง
const COL = {
  ROW:       0,  // ลำดับ
  ID:        1,  // เลขที่
  RANK:      2,  // ยศ
  FNAME:     3,  // ชื่อ
  LNAME:     4,  // สกุล
  GEN:       5,  // รุ่น
  TYPE:      6,  // ประเภท
  WORKPLACE: 7,  // สถานปฏิบัติงาน
  INST:      8,  // สถาบัน
  ADDR:      9,  // ที่อยู่
  PHONE:     10, // เบอร์โทร
  STATUS:    11, // สถานะ
  IMAGE:     12, // image
};

// ---- Entry Points ----

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || '';
  let result;
  try {
    switch (action) {
      case 'getStats':
        result = getStats();
        break;
      case 'getNews':
        result = getNews();
        break;
      case 'searchMembers':
        result = searchMembers(e.parameter);
        break;
      case 'getMember':
        result = getMember(e.parameter.id);
        break;
      case 'getLogbooks':
        result = getLogbooks(e.parameter);
        break;
      case 'getPending':
        if (!isAdmin(e.parameter.email)) return jsonOut({ error: 'Unauthorized' });
        result = getPending();
        break;
      default:
        result = { status: 'ok', message: 'ชศพอ. API v1.0' };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonOut(result);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ error: 'Invalid JSON' });
  }

  const action = data.action || '';
  let result;
  try {
    switch (action) {
      case 'register':
        result = submitRegistration(data);
        break;
      case 'addNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = addNews(data);
        break;
      case 'updateNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = updateNews(data);
        break;
      case 'deleteNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = deleteNews(data.id);
        break;
      case 'updateMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = updateMember(data);
        break;
      case 'deleteMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = deleteMember(data.id);
        break;
      case 'approveMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = approveMember(data.id);
        break;
      case 'addLogbook':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = addLogbook(data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonOut(result);
}

// ---- Helpers ----

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function getOrCreateSheet(name, headerRow) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headerRow) sheet.appendRow(headerRow);
  }
  return sheet;
}

function isAdmin(email) {
  return ADMIN_EMAILS.indexOf(email) >= 0;
}

function rowToMember(row) {
  return {
    row_num:     row[COL.ROW],
    id:          row[COL.ID],
    rank:        row[COL.RANK],
    fname:       row[COL.FNAME],
    lname:       row[COL.LNAME],
    gen:         row[COL.GEN],
    type:        row[COL.TYPE],
    workplace:   row[COL.WORKPLACE],
    institution: row[COL.INST],
    address:     row[COL.ADDR],
    phone:       row[COL.PHONE],
    status:      row[COL.STATUS],
    image:       row[COL.IMAGE],
  };
}

function isMemberRow(row) {
  // กรองแถว header, summary, และแถวว่าง
  const fname = String(row[COL.FNAME] || '').trim();
  const lname = String(row[COL.LNAME] || '').trim();
  return fname.length > 0 && lname.length > 0 && fname !== 'ชื่อ';
}

// ---- Public APIs ----

function getStats() {
  const sheet = getSheet(MEMBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).filter(isMemberRow);

  const total = rows.length;
  const active = rows.filter(function(r) { return r[COL.TYPE] === 'สามัญ'; }).length;
  const genSet = {};
  rows.forEach(function(r) {
    const g = String(r[COL.GEN]).trim();
    if (g) genSet[g] = true;
  });
  const generations = Object.keys(genSet).length;

  return { total: total, active: active, generations: generations };
}

function getNews() {
  const sheet = getOrCreateSheet(NEWS_SHEET, ['id', 'date', 'category', 'title', 'summary', 'content']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { news: [] };

  const news = data.slice(1)
    .filter(function(r) { return r[0]; })
    .map(function(r) {
      return { id: r[0], date: r[1], category: r[2], title: r[3], summary: r[4], content: r[5] };
    })
    .reverse();

  return { news: news };
}

function searchMembers(params) {
  const query  = String(params.query || '').toLowerCase().trim();
  const gen    = String(params.gen || '').trim();
  const type   = String(params.type || '').trim();
  const page   = parseInt(params.page, 10) || 1;
  const limit  = parseInt(params.limit, 10) || 20;

  const sheet = getSheet(MEMBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).filter(isMemberRow);

  const filtered = rows.filter(function(r) {
    if (query) {
      const s = [r[COL.FNAME], r[COL.LNAME], r[COL.ID], r[COL.RANK]].join(' ').toLowerCase();
      if (s.indexOf(query) < 0) return false;
    }
    if (gen && String(r[COL.GEN]).trim() !== gen) return false;
    if (type && r[COL.TYPE] !== type) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const members = filtered.slice(start, start + limit).map(rowToMember);

  return { members: members, total: total, page: page, limit: limit, pages: Math.ceil(total / limit) };
}

function getMember(id) {
  const sheet = getSheet(MEMBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const row = data.slice(1).filter(isMemberRow).filter(function(r) {
    return String(r[COL.ID]).trim() === String(id).trim() ||
           String(r[COL.ROW]).trim() === String(id).trim();
  })[0];
  if (!row) return { error: 'ไม่พบสมาชิก' };
  return { member: rowToMember(row) };
}

function getLogbooks(params) {
  const sheet = getSheet(LOGBOOK_SHEET);
  if (!sheet) return { logbooks: [] };

  const memberId = String(params.memberId || '').trim();
  const page  = parseInt(params.page, 10)  || 1;
  const limit = parseInt(params.limit, 10) || 20;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logbooks: [], total: 0 };

  let rows = data.slice(1).filter(function(r) { return r[0]; });
  if (memberId) rows = rows.filter(function(r) { return String(r[1]) === memberId; });

  const total = rows.length;
  const start = (page - 1) * limit;
  const logbooks = rows.slice(start, start + limit).map(function(r) {
    return { timestamp: r[0], memberId: r[1], welfare: r[2], activity: r[3], approver: r[4], recorder: r[5] };
  });

  return { logbooks: logbooks, total: total };
}

function getPending() {
  const sheet = getSheet(PENDING_SHEET);
  if (!sheet) return { pending: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { pending: [] };

  const pending = data.slice(1).map(function(r) {
    return { id: r[0], timestamp: r[1], rank: r[2], fname: r[3], lname: r[4],
             gen: r[5], type: r[6], institution: r[7], address: r[8], phone: r[9], email: r[10] };
  });

  return { pending: pending };
}

// ---- Admin: News ----

function addNews(data) {
  const sheet = getOrCreateSheet(NEWS_SHEET, ['id', 'date', 'category', 'title', 'summary', 'content']);
  const id = 'news_' + Date.now();
  const date = data.date || new Date().toISOString().split('T')[0];
  sheet.appendRow([id, date, data.category || 'ทั่วไป', data.title || '', data.summary || '', data.content || '']);
  return { success: true, id: id };
}

function updateNews(data) {
  const sheet = getSheet(NEWS_SHEET);
  if (!sheet) return { error: 'ไม่พบ sheet ข่าว' };
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(data.id); });
  if (idx < 0) return { error: 'ไม่พบข่าว' };
  sheet.getRange(idx + 1, 2, 1, 5).setValues([[data.date, data.category, data.title, data.summary, data.content || '']]);
  return { success: true };
}

function deleteNews(id) {
  const sheet = getSheet(NEWS_SHEET);
  if (!sheet) return { error: 'ไม่พบ sheet ข่าว' };
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(id); });
  if (idx < 0) return { error: 'ไม่พบข่าว' };
  sheet.deleteRow(idx + 1);
  return { success: true };
}

// ---- Admin: Members ----

function updateMember(data) {
  const sheet = getSheet(MEMBERS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[COL.ID]).trim() === String(data.id).trim(); });
  if (idx < 0) return { error: 'ไม่พบสมาชิก' };

  const rowNum = idx + 1;
  const fields = [
    [COL.RANK, data.rank], [COL.FNAME, data.fname], [COL.LNAME, data.lname],
    [COL.GEN, data.gen], [COL.TYPE, data.type], [COL.WORKPLACE, data.workplace],
    [COL.INST, data.institution], [COL.ADDR, data.address],
    [COL.PHONE, data.phone], [COL.STATUS, data.status],
  ];
  fields.forEach(function(f) {
    if (f[1] !== undefined) sheet.getRange(rowNum, f[0] + 1).setValue(f[1]);
  });
  return { success: true };
}

function deleteMember(id) {
  const sheet = getSheet(MEMBERS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[COL.ID]).trim() === String(id).trim(); });
  if (idx < 0) return { error: 'ไม่พบสมาชิก' };
  sheet.deleteRow(idx + 1);
  return { success: true };
}

// ---- Registration ----

function submitRegistration(data) {
  const sheet = getOrCreateSheet(PENDING_SHEET,
    ['id', 'timestamp', 'ยศ', 'ชื่อ', 'สกุล', 'รุ่น', 'ประเภท', 'สถาบัน', 'ที่อยู่', 'เบอร์โทร', 'อีเมล']);
  const id = 'pending_' + Date.now();
  sheet.appendRow([
    id, new Date().toISOString(),
    data.rank || '', data.fname || '', data.lname || '',
    data.gen || '', data.type || 'สามัญ', data.institution || 'วพอ',
    data.address || '', data.phone || '', data.email || '',
  ]);
  return { success: true, id: id };
}

function approveMember(pendingId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const pendingSheet = ss.getSheetByName(PENDING_SHEET);
  if (!pendingSheet) return { error: 'ไม่พบ Pending' };

  const rows = pendingSheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(pendingId); });
  if (idx < 0) return { error: 'ไม่พบคำขอ' };

  const p = rows[idx];
  const membersSheet = getSheet(MEMBERS_SHEET);
  const lastRow = membersSheet.getLastRow();

  membersSheet.appendRow([
    lastRow, 'new-' + Date.now(),
    p[2], p[3], p[4], p[5], p[6], '', p[7], p[8], p[9], 'มีชีวิต', '',
  ]);
  pendingSheet.deleteRow(idx + 1);
  return { success: true };
}

// ---- Logbook ----

function addLogbook(data) {
  const sheet = getOrCreateSheet(LOGBOOK_SHEET,
    ['Timestamp', 'Member_ID', 'Welfare', 'Activity', 'Approver', 'Recorder']);
  sheet.appendRow([
    new Date().toISOString(),
    data.memberId || '', data.welfare || '',
    data.activity || '', data.approver || '', data.recorder || '',
  ]);
  return { success: true };
}
