// ชุมนุมศิษย์พยาบาลทหารอากาศ — Google Apps Script Backend
// วิธี deploy: Extensions → Apps Script → Deploy → New deployment → Web app
//   Execute as: Me | Who has access: Anyone

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ADMIN_EMAILS = ['nurse.rtafnc@gmail.com', 'oojkkungoo@gmail.com'];

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email);
}

function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*');
}

function ok(data) {
  return cors(ContentService.createTextOutput(JSON.stringify({ success: true, ...data })));
}

function err(msg) {
  return cors(ContentService.createTextOutput(JSON.stringify({ success: false, message: msg })));
}

// ───────────────────────────────────────────────
// GET router
// ───────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if (action === 'getNews')        return getNews();
    if (action === 'getStats')       return getStats();
    if (action === 'searchMembers')  return searchMembers(e.parameter);
    if (action === 'getMember')      return getMember(e.parameter.id);
    if (action === 'getLogbooks')    return getLogbooks(e.parameter);
    if (action === 'getPending')     return getPending(e.parameter.email);
    return err('Unknown action');
  } catch(ex) {
    return err(ex.message);
  }
}

// ───────────────────────────────────────────────
// POST router
// ───────────────────────────────────────────────
function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const action = body.action || '';
  try {
    if (action === 'register')       return registerMember(body);
    if (action === 'addNews')        return addNews(body);
    if (action === 'deleteNews')     return deleteNews(body);
    if (action === 'addLogbook')     return addLogbook(body);
    if (action === 'approveMember')  return approveMember(body);
    if (action === 'deleteMember')   return deleteMember(body);
    if (action === 'updateMember')   return updateMember(body);
    return err('Unknown action');
  } catch(ex) {
    return err(ex.message);
  }
}

// ───────────────────────────────────────────────
// NEWS
// ───────────────────────────────────────────────
function getNews() {
  const ws = getSheet('News');
  if (!ws) return ok({ news: [] });
  const rows = ws.getDataRange().getValues();
  const headers = rows[0];
  const news = rows.slice(1).filter(r => r[0]).map(r => {
    const o = {};
    headers.forEach((h, i) => o[h] = r[i]);
    return o;
  }).reverse();
  return ok({ news });
}

function addNews(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  let ws = getSheet('News');
  if (!ws) {
    ws = SpreadsheetApp.openById(SHEET_ID).insertSheet('News');
    ws.appendRow(['id', 'date', 'category', 'title', 'summary']);
  }
  const id = 'N' + Date.now();
  ws.appendRow([id, body.date || new Date().toISOString(), body.category || 'ทั่วไป', body.title, body.summary]);
  return ok({ id });
}

function deleteNews(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  const ws = getSheet('News');
  if (!ws) return err('Sheet not found');
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      ws.deleteRow(i + 1);
      return ok({});
    }
  }
  return err('Not found');
}

// ───────────────────────────────────────────────
// STATS
// ───────────────────────────────────────────────
function getStats() {
  const ws = getSheet('Members');
  if (!ws) return ok({ total: 0, active: 0, deceased: 0, generations: 0 });
  const rows = ws.getDataRange().getValues().slice(1).filter(r => r[0]);
  const active   = rows.filter(r => r[11] === 'มีชีวิต').length;
  const deceased = rows.filter(r => r[11] === 'เสียชีวิต').length;
  const gens     = new Set(rows.map(r => r[5]).filter(Boolean)).size;
  return ok({ total: rows.length, active, deceased, generations: gens });
}

// ───────────────────────────────────────────────
// MEMBERS
// ───────────────────────────────────────────────
// Sheet columns: ลำดับ|เลขที่|ยศ|ชื่อ|สกุล|รุ่น|ประเภท|สถานปฏิบัตงาน|สถาบัน|ที่อยู่|เบอร์โทร|สถานะ|image
function searchMembers(params) {
  const ws = getSheet('Members');
  if (!ws) return ok({ members: [], total: 0 });
  const q     = (params.query || '').toLowerCase();
  const gen   = params.gen   ? Number(params.gen)   : null;
  const type  = params.type  || '';
  const page  = Number(params.page  || 1);
  const limit = Number(params.limit || 20);

  const rows = ws.getDataRange().getValues().slice(1).filter(r => r[0]);
  let filtered = rows.filter(r => {
    if (gen  && r[5] !== gen)  return false;
    if (type && r[6] !== type) return false;
    if (q) {
      const haystack = [r[1], r[2], r[3], r[4]].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const slice = filtered.slice((page - 1) * limit, page * limit);
  const members = slice.map(r => ({
    member_id:   r[1],
    rank:        r[2],
    firstname:   r[3],
    lastname:    r[4],
    generation:  r[5],
    type:        r[6],
    workplace:   r[7],
    institution: r[8],
    address:     r[9],
    phone:       r[10],
    status:      r[11],
  }));
  return ok({ members, total });
}

function getMember(id) {
  const ws = getSheet('Members');
  if (!ws) return err('Not found');
  const rows = ws.getDataRange().getValues();
  const row = rows.find(r => String(r[1]) === String(id));
  if (!row) return err('Not found');
  return ok({ member: {
    member_id: row[1], rank: row[2], firstname: row[3], lastname: row[4],
    generation: row[5], type: row[6], workplace: row[7], institution: row[8],
    address: row[9], phone: row[10], status: row[11],
  }});
}

function deleteMember(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  const ws = getSheet(body.sheet || 'Members');
  if (!ws) return err('Sheet not found');
  const col = body.sheet === 'Pending' ? 0 : 1;
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col]) === String(body.id)) {
      ws.deleteRow(i + 1);
      return ok({});
    }
  }
  return err('Not found');
}

function updateMember(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  const ws = getSheet('Members');
  if (!ws) return err('Sheet not found');
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(body.member_id)) {
      if (body.status)  ws.getRange(i+1, 12).setValue(body.status);
      if (body.phone)   ws.getRange(i+1, 11).setValue(body.phone);
      if (body.address) ws.getRange(i+1, 10).setValue(body.address);
      return ok({});
    }
  }
  return err('Not found');
}

// ───────────────────────────────────────────────
// REGISTRATION (Pending sheet)
// ───────────────────────────────────────────────
function registerMember(body) {
  let ws = getSheet('Pending');
  if (!ws) {
    ws = SpreadsheetApp.openById(SHEET_ID).insertSheet('Pending');
    ws.appendRow(['row_id','submitted_at','rank','firstname','lastname','generation',
      'member_type','institution','birthdate','workplace','work_address','work_phone',
      'home_no','home_moo','home_soi','home_road','home_tambon','home_amphoe','home_province','home_postcode','home_phone',
      'marital_status','spouse_name','contact_address','contact_tambon','contact_amphoe','contact_province','contact_postcode','mobile_phone']);
  }
  const rowId = 'P' + Date.now();
  ws.appendRow([
    rowId, new Date().toISOString(),
    body.rank, body.firstname, body.lastname, body.generation,
    body.member_type, body.institution, body.birthdate,
    body.workplace, body.work_address, body.work_phone,
    body.home_no, body.home_moo, body.home_soi, body.home_road,
    body.home_tambon, body.home_amphoe, body.home_province, body.home_postcode, body.home_phone,
    body.marital_status, body.spouse_name,
    body.contact_address, body.contact_tambon, body.contact_amphoe, body.contact_province, body.contact_postcode,
    body.mobile_phone,
  ]);
  return ok({ row_id: rowId });
}

function getPending(email) {
  if (!isAdmin(email)) return err('Unauthorized');
  const ws = getSheet('Pending');
  if (!ws) return ok({ pending: [] });
  const rows = ws.getDataRange().getValues();
  const headers = rows[0];
  const pending = rows.slice(1).filter(r => r[0]).map(r => {
    const o = {};
    headers.forEach((h, i) => o[h] = r[i]);
    return o;
  });
  return ok({ pending });
}

function approveMember(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  const pending = getSheet('Pending');
  if (!pending) return err('Pending sheet not found');

  const data = pending.getDataRange().getValues();
  const headers = data[0];
  const rowIdx  = data.findIndex(r => String(r[0]) === String(body.id));
  if (rowIdx < 1) return err('Not found');
  const row = data[rowIdx];
  const rec = {};
  headers.forEach((h, i) => rec[h] = row[i]);

  // หา running number
  const members = getSheet('Members');
  const lastRow = members.getLastRow();
  const newSeq  = lastRow; // row 1 = header
  const genPad  = String(rec.generation).padStart(2, '0');
  const seqPad  = String(newSeq).padStart(2, '0');
  const memberId = `${genPad}-${seqPad}`;

  members.appendRow([
    newSeq, memberId, rec.rank, rec.firstname, rec.lastname,
    Number(rec.generation), rec.member_type, rec.workplace, rec.institution,
    [rec.home_no, 'ม.' + rec.home_moo, rec.home_soi, rec.home_road, rec.home_tambon, rec.home_amphoe, rec.home_province, rec.home_postcode].filter(Boolean).join(' '),
    rec.mobile_phone, 'มีชีวิต', '',
  ]);

  pending.deleteRow(rowIdx + 1);
  return ok({ member_id: memberId });
}

// ───────────────────────────────────────────────
// LOGBOOK
// ───────────────────────────────────────────────
function addLogbook(body) {
  if (!isAdmin(body.email)) return err('Unauthorized');
  const ws = getSheet('Logbooks');
  if (!ws) return err('Logbooks sheet not found');
  ws.appendRow([new Date().toISOString(), body.member_id, body.welfare, body.activity, body.approver, body.email]);
  return ok({});
}

function getLogbooks(params) {
  const ws = getSheet('Logbooks');
  if (!ws) return ok({ logbooks: [] });
  const rows = ws.getDataRange().getValues().slice(1).filter(r => r[0]);
  const id   = params.memberId || '';
  const filtered = id ? rows.filter(r => String(r[1]) === id) : rows;
  const logbooks = filtered.map(r => ({
    timestamp: r[0], member_id: r[1], welfare: r[2], activity: r[3], approver: r[4], recorder: r[5],
  })).reverse();
  return ok({ logbooks });
}
