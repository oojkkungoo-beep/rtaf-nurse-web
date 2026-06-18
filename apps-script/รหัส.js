const SHEET_ID = '1Z4bYmol5qtVGQNDWAEHrNHyZyGLlqHncFJWPPxqY7Qw';
const MEMBERS_SHEET = 'Members';
const NEWS_SHEET    = 'News';
const PENDING_SHEET = 'Pending';
const LOGBOOK_SHEET = 'Logbooks';
const ADMINS_SHEET  = 'Admins';

// Hardcoded superadmins (ลบออกไม่ได้)
const SUPER_ADMINS = ['oojkkungoo@gmail.com', 'nurse.rtafnc@gmail.com'];

// Column indices (0-based) — Members sheet
const COL = {
  ROW:        0,
  ID:         1,
  RANK:       2,
  FNAME:      3,
  LNAME:      4,
  GEN:        5,
  TYPE:       6,
  WORKPLACE:  7,
  INST:       8,
  ADDR:       9,
  PHONE:      10,
  STATUS:     11,
  IMAGE:      12,
  BIRTHDATE:  13,
  WORK_PHONE: 14,
  HOME_PHONE: 15,
  MARITAL:    16,
  SPOUSE:     17,
};

// Logbook columns (0-based) — new schema
// Timestamp(0) Member_ID(1) Rank(2) FullName(3) Gen(4) Welfare(5) Activity(6) Approver(7) Recorder(8)
const LCOL = { TS:0, MID:1, RANK:2, NAME:3, GEN:4, WELFARE:5, ACTIVITY:6, APPROVER:7, RECORDER:8 };

// ---- Entry Points ----

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || '';
  let result;
  try {
    switch (action) {
      case 'getStats':         result = getStats(); break;
      case 'getFilterOptions': result = getFilterOptions(); break;
      case 'getLogbookOptions':result = getLogbookOptions(); break;
      case 'getNews':          result = getNews(); break;
      case 'searchMembers':    result = searchMembers(params); break;
      case 'getMember':        result = getMember(params.id); break;
      case 'getLogbooks':      result = getLogbooks(params); break;
      case 'searchLogbooks':   result = searchLogbooks(params); break;
      case 'getPending':
        if (!isAdmin(params.email)) return jsonOut({ error: 'Unauthorized' });
        result = getPending(); break;
      case 'getAdmins':
        if (!isAdmin(params.email)) return jsonOut({ error: 'Unauthorized' });
        result = getAdmins(); break;
      default:
        result = { status: 'ok', message: 'ชศพอ. API v2.0' };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonOut(result);
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut({ error: 'Invalid JSON' }); }

  const action = data.action || '';
  let result;
  try {
    switch (action) {
      case 'register':      result = submitRegistration(data); break;
      case 'addNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = addNews(data); break;
      case 'updateNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = updateNews(data); break;
      case 'deleteNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = deleteNews(data.id); break;
      case 'updateMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = updateMember(data); break;
      case 'deleteMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = deleteMember(data.id); break;
      case 'approveMember':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = approveMember(data.id); break;
      case 'addLogbook':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = addLogbook(data); break;
      case 'pinNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = pinNews(data); break;
      case 'reorderNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = reorderNews(data); break;
      case 'seedNews':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = seedNews(); break;
      case 'getPending':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = getPending(); break;
      case 'getAdmins':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = getAdmins(); break;
      case 'addAdmin':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = addAdmin(data); break;
      case 'removeAdmin':
        if (!isAdmin(data.email)) return jsonOut({ error: 'Unauthorized' });
        result = removeAdmin(data); break;
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
  if (!email) return false;
  const em = String(email).trim().toLowerCase();
  if (SUPER_ADMINS.some(function(s) { return s.toLowerCase() === em; })) return true;
  const sheet = getSheet(ADMINS_SHEET);
  if (!sheet) return false;
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1).some(function(r) { return String(r[0]).trim().toLowerCase() === em; });
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
    birthdate:   row[COL.BIRTHDATE]  || '',
    work_phone:  row[COL.WORK_PHONE] || '',
    home_phone:  row[COL.HOME_PHONE] || '',
    marital:     row[COL.MARITAL]    || '',
    spouse:      row[COL.SPOUSE]     || '',
  };
}

function isMemberRow(row) {
  const fname = String(row[COL.FNAME] || '').trim();
  const lname = String(row[COL.LNAME] || '').trim();
  return fname.length > 0 && lname.length > 0 && fname !== 'ชื่อ';
}

function rowToLogbook(r) {
  // Detect old 6-column schema: r[5] empty means welfare was at r[2]
  var isOld = !r[5] && !r[6] && !r[7];
  if (isOld) {
    return {
      timestamp: r[0], member_id: r[1],
      rank: '', fullname: '', gen: '',
      welfare:  r[2] || '', activity: r[3] || '',
      approver: r[4] || '', recorder: r[5] || '',
    };
  }
  return {
    timestamp: r[LCOL.TS],
    member_id: r[LCOL.MID],
    rank:      r[LCOL.RANK]     || '',
    fullname:  r[LCOL.NAME]     || '',
    gen:       r[LCOL.GEN]      || '',
    welfare:   r[LCOL.WELFARE]  || '',
    activity:  r[LCOL.ACTIVITY] || '',
    approver:  r[LCOL.APPROVER] || '',
    recorder:  r[LCOL.RECORDER] || '',
  };
}

// ---- Public APIs ----

function getStats() {
  const sheet = getSheet(MEMBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).filter(isMemberRow);

  const total    = rows.length;
  const deceased = rows.filter(function(r) { return r[COL.STATUS] === 'เสียชีวิต'; }).length;
  const active   = total - deceased;

  const typeCount = {}, instCount = {}, genMap = {};

  rows.forEach(function(r) {
    const t    = String(r[COL.TYPE]   || 'ไม่ระบุ').trim();
    const inst = String(r[COL.INST]   || 'ไม่ระบุ').trim();
    const g    = String(r[COL.GEN]    || '').trim();
    const isMember = (t === 'สามัญ' || t === 'สมทบ');

    typeCount[t] = (typeCount[t] || 0) + 1;
    instCount[inst] = (instCount[inst] || 0) + 1;

    if (g) {
      if (!genMap[g]) genMap[g] = { gen: g, member: 0, non_member: 0 };
      if (isMember) genMap[g].member++;
      else genMap[g].non_member++;
    }
  });

  // Sort gen numerically then alphabetically
  var genList = Object.values(genMap).sort(function(a, b) {
    var na = parseFloat(a.gen), nb = parseFloat(b.gen);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1; if (!isNaN(nb)) return 1;
    return a.gen.localeCompare(b.gen, 'th');
  });

  var by_type = Object.keys(typeCount).map(function(t) { return { type: t, count: typeCount[t] }; });
  var by_inst = Object.keys(instCount)
    .map(function(k) { return { inst: k, count: instCount[k] }; })
    .sort(function(a, b) { return b.count - a.count; });

  var pendingCount = 0;
  var pendingSheet = getSheet(PENDING_SHEET);
  if (pendingSheet) {
    var pData = pendingSheet.getDataRange().getValues();
    pendingCount = Math.max(0, pData.length - 1);
  }

  return {
    total: total, active: active, deceased: deceased,
    generations: genList.length,
    by_type: by_type, by_inst: by_inst, by_gen: genList,
    pending_count: pendingCount
  };
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
  const types = Object.keys(typeSet).sort(function(a, b) { return a.localeCompare(b, 'th'); });
  return { generations: gens, types: types };
}

function getLogbookOptions() {
  const sheet = getSheet(LOGBOOK_SHEET);
  if (!sheet) return { welfares: [], gens: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { welfares: [], gens: [] };
  const welfareSet = {}, genSet = {};
  data.slice(1).filter(function(r) { return r[0]; }).forEach(function(r) {
    const w = String(r[LCOL.WELFARE] || '').trim();
    const g = String(r[LCOL.GEN]     || '').trim();
    if (w) welfareSet[w] = true;
    if (g) genSet[g] = true;
  });
  return {
    welfares: Object.keys(welfareSet).sort(function(a, b) { return a.localeCompare(b, 'th'); }),
    gens: Object.keys(genSet).sort(function(a, b) {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1; if (!isNaN(nb)) return 1;
      return a.localeCompare(b, 'th');
    }),
  };
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
  news.sort(function(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  return { news: news };
}

function searchMembers(params) {
  const query = String(params.query || '').toLowerCase().trim();
  const gen   = String(params.gen   || '').trim();
  const type  = String(params.type  || '').trim();
  const page  = parseInt(params.page,  10) || 1;
  const limit = parseInt(params.limit, 10) || 9999;

  const sheet = getSheet(MEMBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).filter(isMemberRow);

  const filtered = rows.filter(function(r) {
    if (query) {
      const s = [r[COL.FNAME], r[COL.LNAME], r[COL.ID], r[COL.RANK]].join(' ').toLowerCase();
      if (s.indexOf(query) < 0) return false;
    }
    if (gen  && String(r[COL.GEN]).trim()  !== gen)  return false;
    if (type && String(r[COL.TYPE]).trim() !== type) return false;
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
    return String(r[COL.ID]).trim()  === String(id).trim() ||
           String(r[COL.ROW]).trim() === String(id).trim();
  })[0];
  if (!row) return { error: 'ไม่พบสมาชิก' };
  return { member: rowToMember(row) };
}

function getLogbooks(params) {
  const sheet = getSheet(LOGBOOK_SHEET);
  if (!sheet) return { logbooks: [], total: 0 };

  const memberId = String(params.memberId || '').trim();
  const page  = parseInt(params.page,  10) || 1;
  const limit = parseInt(params.limit, 10) || 9999;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logbooks: [], total: 0 };

  let rows = data.slice(1).filter(function(r) { return r[0]; });
  if (memberId) rows = rows.filter(function(r) { return String(r[LCOL.MID]) === memberId; });

  const total = rows.length;
  const start = (page - 1) * limit;
  return { logbooks: rows.slice(start, start + limit).map(rowToLogbook), total: total };
}

function searchLogbooks(params) {
  const sheet = getSheet(LOGBOOK_SHEET);
  if (!sheet) return { logbooks: [], total: 0 };

  const query   = String(params.query   || '').toLowerCase().trim();
  const gen     = String(params.gen     || '').trim();
  const welfare = String(params.welfare || '').trim();
  const page    = parseInt(params.page,  10) || 1;
  const limit   = parseInt(params.limit, 10) || 9999;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logbooks: [], total: 0 };

  let rows = data.slice(1).filter(function(r) { return r[0]; });
  rows = rows.filter(function(r) {
    if (query) {
      const s = [r[LCOL.NAME], r[LCOL.MID]].join(' ').toLowerCase();
      if (s.indexOf(query) < 0) return false;
    }
    if (gen     && String(r[LCOL.GEN]    ).trim() !== gen)     return false;
    if (welfare && String(r[LCOL.WELFARE]).trim() !== welfare)  return false;
    return true;
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  return { logbooks: rows.slice(start, start + limit).map(rowToLogbook), total: total };
}

function getPending() {
  const sheet = getSheet(PENDING_SHEET);
  if (!sheet) return { pending: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { pending: [] };
  const pending = data.slice(1).filter(function(r) { return r[0]; }).map(function(r) {
    return { row_id: r[0], submitted_at: r[1], rank: r[2], firstname: r[3], lastname: r[4],
             generation: r[5], member_type: r[6], institution: r[7], address: r[8], mobile_phone: r[9],
             email: r[10], workplace: r[11] || '', birthdate: r[12] || '',
             work_phone: r[13] || '', home_phone: r[14] || '',
             marital: r[15] || '', spouse: r[16] || '' };
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
  sheet.getRange(idx + 1, 7).setValue(newVal);
  return { success: true, pinned: newVal };
}

function reorderNews(data) {
  const sheet = _getNewsSheet();
  const rows = sheet.getDataRange().getValues();
  const dataRows = rows.slice(1).filter(function(r) { return r[0]; });
  dataRows.sort(function(a, b) { return (parseInt(a[7],10)||0) - (parseInt(b[7],10)||0); });
  const pos = dataRows.findIndex(function(r) { return String(r[0]) === String(data.id); });
  if (pos < 0) return { error: 'ไม่พบข่าว' };
  const swapPos = data.direction === 'up' ? pos - 1 : pos + 1;
  if (swapPos < 0 || swapPos >= dataRows.length) return { success: true };
  const orderA = parseInt(dataRows[pos][7], 10) || pos;
  const orderB = parseInt(dataRows[swapPos][7], 10) || swapPos;
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
    ['2026-06-01','ประชาสัมพันธ์','ประชุมใหญ่สามัญประจำปี 2569','ขอเชิญสมาชิกทุกท่านร่วมประชุมใหญ่สามัญ',''],
    ['2026-05-20','กิจกรรม','กิจกรรมวันพยาบาลสากล 2569','ชมรมจัดกิจกรรมเนื่องในวันพยาบาลสากล 12 พฤษภาคม 2569',''],
    ['2026-05-10','สวัสดิการ','เปิดรับสมัครสมาชิกใหม่รุ่นที่ 78','เปิดรับสมัครสมาชิกสามัญและสมทบ',''],
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
    [COL.RANK,       data.rank],       [COL.FNAME,      data.fname],
    [COL.LNAME,      data.lname],      [COL.GEN,        data.gen],
    [COL.TYPE,       data.type],       [COL.WORKPLACE,  data.workplace],
    [COL.INST,       data.institution],[COL.ADDR,       data.address],
    [COL.PHONE,      data.phone],      [COL.STATUS,     data.status],
    [COL.BIRTHDATE,  data.birthdate],  [COL.WORK_PHONE, data.work_phone],
    [COL.HOME_PHONE, data.home_phone], [COL.MARITAL,    data.marital],
    [COL.SPOUSE,     data.spouse],
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
    ['id','timestamp','ยศ','ชื่อ','สกุล','รุ่น','ประเภท','สถาบัน','ที่อยู่ติดต่อ','เบอร์มือถือ',
     'อีเมล','สถานปฏิบัติงาน','วันเกิด','เบอร์ทำงาน','เบอร์บ้าน','สถานภาพสมรส','ชื่อคู่สมรส']);
  const id = 'pending_' + Date.now();

  var rank   = data.rank        || '';
  var fname  = data.firstname   || data.fname  || '';
  var lname  = data.lastname    || data.lname  || '';
  var gen    = data.generation  || data.gen    || '';
  var type   = data.member_type || data.type   || 'สามัญ';
  var inst   = data.institution || 'วพอ';
  var phone  = data.mobile_phone|| data.phone  || '';
  var email  = data.email       || '';
  var work   = data.workplace   || '';
  var bdate  = data.birthdate   || '';
  var wphone = data.work_phone  || '';
  var hphone = data.home_phone  || '';
  var marital= data.marital_status || '';
  var spouse = data.spouse_name || '';

  // ต่อที่อยู่ติดต่อจากหลาย field
  var addr = data.contact_address || '';
  if (!addr) {
    var ap = [
      data.contact_tambon, data.contact_amphoe, data.contact_province, data.contact_postcode
    ].filter(Boolean).join(' ');
    var hp = [
      data.home_no,
      data.home_moo  ? 'หมู่ ' + data.home_moo  : '',
      data.home_soi  ? 'ซ.'   + data.home_soi   : '',
      data.home_road ? 'ถ.'   + data.home_road  : '',
      data.home_tambon, data.home_amphoe, data.home_province, data.home_postcode
    ].filter(Boolean).join(' ');
    addr = (ap || hp).trim();
  }

  sheet.appendRow([id, new Date().toISOString(),
    rank, fname, lname, gen, type, inst, addr, phone, email,
    work, bdate, wphone, hphone, marital, spouse]);
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
  // Pending: id(0) ts(1) rank(2) fname(3) lname(4) gen(5) type(6) inst(7) addr(8) phone(9)
  //          email(10) workplace(11) birthdate(12) work_phone(13) home_phone(14) marital(15) spouse(16)
  // Members: ROW(0) ID(1) RANK(2) FNAME(3) LNAME(4) GEN(5) TYPE(6) WORKPLACE(7) INST(8) ADDR(9)
  //          PHONE(10) STATUS(11) IMAGE(12) BIRTHDATE(13) WORK_PHONE(14) HOME_PHONE(15) MARITAL(16) SPOUSE(17)
  membersSheet.appendRow([
    lastRow, 'new-' + Date.now(),
    p[2], p[3], p[4], p[5], p[6],
    p[11] || '',  // workplace
    p[7],         // institution
    p[8],         // address
    p[9],         // mobile_phone
    'มีชีวิต', '',
    p[12] || '',  // birthdate
    p[13] || '',  // work_phone
    p[14] || '',  // home_phone
    p[15] || '',  // marital
    p[16] || '',  // spouse
  ]);
  pendingSheet.deleteRow(idx + 1);
  return { success: true };
}

// ---- Logbook ----

function addLogbook(data) {
  const sheet = getOrCreateSheet(LOGBOOK_SHEET,
    ['Timestamp', 'Member_ID', 'Rank', 'FullName', 'Gen', 'Welfare', 'Activity', 'Approver', 'Recorder']);
  const ts = data.date ? data.date : new Date().toISOString().split('T')[0];
  sheet.appendRow([
    ts,
    data.memberId  || '',
    data.rank      || '',
    data.fullname  || '',
    data.gen       || '',
    data.welfare   || '',
    data.activity  || '',
    data.approver  || '',
    data.email     || '',  // recorder = admin email
  ]);
  return { success: true };
}

// ---- Admin Management ----

function getAdmins() {
  const sheet = getOrCreateSheet(ADMINS_SHEET, ['email', 'name', 'added_by', 'added_at']);
  const data = sheet.getDataRange().getValues();
  var admins = data.length > 1
    ? data.slice(1).filter(function(r) { return r[0]; }).map(function(r) {
        return { email: r[0], name: r[1] || '', added_by: r[2] || '', added_at: r[3] || '', removable: true };
      })
    : [];
  // Prepend superadmins
  var sheetEmails = admins.map(function(a) { return a.email.toLowerCase(); });
  SUPER_ADMINS.slice().reverse().forEach(function(e) {
    if (!sheetEmails.includes(e.toLowerCase())) {
      admins.unshift({ email: e, name: 'Superadmin', added_by: 'system', added_at: '', removable: false });
    }
  });
  return { admins: admins };
}

function addAdmin(data) {
  const newEmail = String(data.newEmail || '').trim();
  const newName  = String(data.newName  || '').trim();
  if (!newEmail) return { error: 'กรุณาระบุ email' };
  if (isAdmin(newEmail)) return { error: 'มี Admin นี้อยู่แล้ว' };
  const sheet = getOrCreateSheet(ADMINS_SHEET, ['email', 'name', 'added_by', 'added_at']);
  sheet.appendRow([newEmail, newName, data.email, new Date().toISOString()]);
  return { success: true };
}

function removeAdmin(data) {
  const target = String(data.targetEmail || '').trim().toLowerCase();
  if (SUPER_ADMINS.some(function(s) { return s.toLowerCase() === target; })) {
    return { error: 'ไม่สามารถลบ Superadmin ได้' };
  }
  const sheet = getSheet(ADMINS_SHEET);
  if (!sheet) return { error: 'ไม่พบ Admins sheet' };
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(function(r) { return String(r[0]).trim().toLowerCase() === target; });
  if (idx < 0) return { error: 'ไม่พบ Admin นี้' };
  sheet.deleteRow(idx + 1);
  return { success: true };
}
