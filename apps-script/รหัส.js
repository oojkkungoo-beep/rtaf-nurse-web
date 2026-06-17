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
      case 'getFilterOptions':
        result = getFilterOptions();
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
      case 'pinNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = pinNews(data);
        break;
      case 'reorderNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = reorderNews(data);
        break;
      case 'seedNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = seedNews();
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

function getFilterOptions() {
  const sheet = getSheet(MEMBERS_SHEET);
  const rows = sheet.getDataRange().getValues().slice(1).filter(isMemberRow);
  const genSet = {}, typeSet = {};
  rows.forEach(function(r) {
    const g = String(r[COL.GEN]).trim();
    const t = String(r[COL.TYPE]).trim();
    if (g) genSet[g] = true;
    if (t) typeSet[t] = true;
  });
  const gens = Object.keys(genSet).sort(function(a, b) {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.localeCompare(b, 'th');
  });
  const types = Object.keys(typeSet).sort(function(a,b){ return a.localeCompare(b,'th'); });
  return { generations: gens, types: types };
}

// News columns: id(0) date(1) category(2) title(3) summary(4) content(5) pinned(6) sort_order(7)
var NEWS_HDR = ['id', 'date', 'category', 'title', 'summary', 'content', 'pinned', 'sort_order'];

function getNews() {
  const sheet = getOrCreateSheet(NEWS_SHEET, NEWS_HDR);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { news: [] };

  const news = data.slice(1)
    .filter(function(r) { return r[0]; })
    .map(function(r, i) {
      return {
        id: r[0], date: r[1], category: r[2], title: r[3],
        summary: r[4], content: r[5],
        pinned: r[6] === true || r[6] === 'TRUE' || r[6] === 1,
        sort_order: parseInt(r[7], 10) || i,
      };
    });

  // ปักหมุดขึ้นก่อน, เรียงตาม sort_order, แล้วที่เหลือตาม sort_order
  news.sort(function(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

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

function _getNewsSheet() { return getOrCreateSheet(NEWS_SHEET, NEWS_HDR); }

function _newsMaxOrder(rows) {
  return rows.slice(1).reduce(function(m, r) { return Math.max(m, parseInt(r[7], 10) || 0); }, 0);
}

function addNews(data) {
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const id = 'news_' + Date.now();
  const date = data.date || new Date().toISOString().split('T')[0];
  const order = _newsMaxOrder(rows) + 1;
  sheet.appendRow([id, date, data.category || 'ทั่วไป', data.title || '', data.summary || '', data.content || '', false, order]);
  return { success: true, id: id };
}

function updateNews(data) {
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(data.id); });
  if (idx < 0) return { error: 'ไม่พบข่าว' };
  sheet.getRange(idx + 1, 2, 1, 5).setValues([[data.date, data.category, data.title, data.summary, data.content || '']]);
  return { success: true };
}

function deleteNews(id) {
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(id); });
  if (idx < 0) return { error: 'ไม่พบข่าว' };
  sheet.deleteRow(idx + 1);
  return { success: true };
}

function pinNews(data) {
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]) === String(data.id); });
  if (idx < 0) return { error: 'ไม่พบข่าว' };
  const newVal = data.pinned === true || data.pinned === 'true';
  sheet.getRange(idx + 1, 7).setValue(newVal); // col G = pinned
  return { success: true, pinned: newVal };
}

function reorderNews(data) {
  // data.id, data.direction = 'up' | 'down'
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const dataRows = rows.slice(1).filter(function(r) { return r[0]; });

  // sort by current sort_order
  dataRows.sort(function(a, b) { return (parseInt(a[7],10)||0) - (parseInt(b[7],10)||0); });

  const pos = dataRows.findIndex(function(r) { return String(r[0]) === String(data.id); });
  if (pos < 0) return { error: 'ไม่พบข่าว' };

  const swapPos = data.direction === 'up' ? pos - 1 : pos + 1;
  if (swapPos < 0 || swapPos >= dataRows.length) return { success: true }; // already at edge

  // swap sort_order values
  const orderA = parseInt(dataRows[pos][7], 10) || pos;
  const orderB = parseInt(dataRows[swapPos][7], 10) || swapPos;

  // find sheet rows for each
  function findSheetRow(id) {
    return rows.findIndex(function(r) { return String(r[0]) === String(id); });
  }
  const rA = findSheetRow(dataRows[pos][0]);
  const rB = findSheetRow(dataRows[swapPos][0]);
  sheet.getRange(rA + 1, 8).setValue(orderB);
  sheet.getRange(rB + 1, 8).setValue(orderA);
  return { success: true };
}

function seedNews() {
  const sheet = _getNewsSheet();
  if (sheet.getLastRow() > 1) return { skipped: true, message: 'มีข่าวอยู่แล้ว' };
  var items = [
    ['2026-06-01','ประชาสัมพันธ์','ประชุมใหญ่สามัญประจำปี 2569','ขอเชิญสมาชิกทุกท่านร่วมประชุมใหญ่สามัญ ในวันเสาร์ที่ 20 กรกฎาคม 2569 ณ ห้องประชุมชมรม เวลา 09.00 น.',''],
    ['2026-05-20','กิจกรรม','กิจกรรมวันพยาบาลสากล 2569','ชมรมจัดกิจกรรมเนื่องในวันพยาบาลสากล 12 พฤษภาคม 2569 มีการบรรยายวิชาการและมอบรางวัลพยาบาลดีเด่น',''],
    ['2026-05-10','สวัสดิการ','เปิดรับสมัครสมาชิกใหม่รุ่นที่ 78','เปิดรับสมัครสมาชิกสามัญและสมทบ ตั้งแต่บัดนี้จนถึง 30 มิถุนายน 2569 สอบถามเพิ่มเติมได้ที่ nurse.rtafnc@gmail.com',''],
    ['2026-04-25','ประชาสัมพันธ์','แจ้งเปลี่ยนแปลงที่อยู่ที่ทำการชมรม','ที่ทำการชมรมย้ายไปยังอาคารใหม่ ชั้น 3 อาคารสวัสดิการกองทัพอากาศ มีผลตั้งแต่วันที่ 1 พฤษภาคม 2569',''],
    ['2026-04-10','วิชาการ','สัมมนาวิชาการ "พยาบาลกับเทคโนโลยี AI"','ขอเชิญร่วมสัมมนาในหัวข้อ "บทบาทพยาบาลในยุค AI" วันศุกร์ที่ 30 พฤษภาคม 2569 ณ ห้องประชุมกองพยาบาล',''],
    ['2026-03-15','สวัสดิการ','ทุนการศึกษาบุตรสมาชิกประจำปี 2569','เปิดรับสมัครทุนการศึกษาสำหรับบุตรสมาชิก จำนวน 20 ทุน ทุนละ 5,000 บาท ยื่นใบสมัครภายในวันที่ 31 พฤษภาคม 2569',''],
    ['2026-02-28','กิจกรรม','โครงการจิตอาสาพยาบาลชุมชน ปี 2569','ชมรมจัดโครงการออกหน่วยเคลื่อนที่ให้บริการสุขภาพแก่ชุมชนรอบค่ายทหารอากาศ กำหนดการ 4 ครั้ง ตลอดปี',''],
  ];
  items.forEach(function(it, i) {
    sheet.appendRow(['news_seed_'+(i+1), it[0], it[1], it[2], it[3], it[4], false, i+1]);
  });
  return { success: true, inserted: items.length };
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
