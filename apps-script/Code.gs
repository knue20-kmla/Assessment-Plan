/**
 * 교수학습평가계획서 제출 접수 / 조회 (관리자 계정에서 실행되는 웹앱)
 *
 * [제출]  JSON + PDF 를 관리자 드라이브의  제출함/교과/이름/  폴더에 저장
 * [조회]  교사 모드  : 제출 비밀 코드 + 이름  → 본인이 제출한 파일 목록/내용만
 *         관리자 모드: 관리자 코드             → 모든 제출의 정보/내용
 *
 * 스크립트 속성:
 *   SUBMIT_CODE : 교사에게 알려 주는 제출 비밀 코드 (필수)
 *   FOLDER_ID   : 제출함 폴더 ID (필수)
 *   ADMIN_CODE  : 관리자 코드 (관리자 조회를 쓰려면 필수, 제출 코드와 다르게)
 *   SHEET_ID    : (선택) 제출 목록을 쌓을 구글 시트 ID
 */
var MAX_BASE64 = 30 * 1024 * 1024; // 본문 상한(문자 수)

function doGet() {
  return out_({ ok: true, service: 'assessment-plan-submit', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return out_({ ok: false, error: '내용이 없습니다.' });
    if (e.postData.contents.length > MAX_BASE64) return out_({ ok: false, error: '파일이 너무 큽니다.' });
    var body = JSON.parse(e.postData.contents);
    var action = String(body.action || (body.json ? 'submit' : ''));
    if (action === 'submit') return submit_(body);
    if (action === 'list') return list_(body);
    if (action === 'file') return file_(body);
    return out_({ ok: false, error: '알 수 없는 요청입니다.' });
  } catch (err) {
    return out_({ ok: false, error: '서버 오류: ' + err });
  }
}

/* ---------------- 제출 ---------------- */
function submit_(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var props = PropertiesService.getScriptProperties();
    var code = props.getProperty('SUBMIT_CODE');
    if (!code || String(body.code || '') !== code) return out_({ ok: false, error: '비밀 코드가 올바르지 않습니다.' });

    var name = clean_(body.name), subject = clean_(body.subject) || '기타';
    var course = clean_(body.course) || clean_(body.docName) || '계획서';
    if (!name) return out_({ ok: false, error: '이름이 없습니다.' });
    if (!body.json) return out_({ ok: false, error: '문서 내용이 없습니다.' });
    try { JSON.parse(body.json); } catch (x) { return out_({ ok: false, error: '문서 내용이 올바르지 않습니다.' }); }

    var root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    var person = child_(child_(root, subject), name);
    var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmmss');
    var base = name + '_' + course + '_' + stamp;

    var jf = person.createFile(base + '.json', body.json, 'application/json');
    var pf = null;
    if (body.pdf) {
      var bytes = Utilities.base64Decode(body.pdf);
      pf = person.createFile(Utilities.newBlob(bytes, 'application/pdf', base + '.pdf'));
    }
    var sid = props.getProperty('SHEET_ID');
    if (sid) {
      SpreadsheetApp.openById(sid).getSheets()[0].appendRow([
        new Date(), subject, name, course, body.docName || '',
        pf ? pf.getUrl() : '', jf.getUrl()
      ]);
    }
    return out_({ ok: true, id: stamp, pdf: pf ? pf.getUrl() : '', json: jf.getUrl() });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------------- 인증 ---------------- */
// 반환: {mode:'teacher', name} | {mode:'admin'} | {error}
function auth_(body) {
  var props = PropertiesService.getScriptProperties();
  var mode = String(body.mode || '');
  if (mode === 'admin') {
    var ac = props.getProperty('ADMIN_CODE');
    if (!ac) return { error: '관리자 코드가 설정되지 않았습니다.' };
    if (String(body.code || '') !== ac) return { error: '관리자 코드가 올바르지 않습니다.' };
    return { mode: 'admin' };
  }
  if (mode === 'teacher') {
    var sc = props.getProperty('SUBMIT_CODE');
    if (!sc || String(body.code || '') !== sc) return { error: '비밀 코드가 올바르지 않습니다.' };
    var name = clean_(body.name);
    if (!name) return { error: '이름을 입력해 주세요.' };
    return { mode: 'teacher', name: name };
  }
  return { error: '조회 방식이 올바르지 않습니다.' };
}

/* ---------------- 목록 ---------------- */
function list_(body) {
  var a = auth_(body);
  if (a.error) return out_({ ok: false, error: a.error });
  var root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  var items = [];
  var subs = root.getFolders();
  while (subs.hasNext()) {
    var sub = subs.next();
    var persons = a.mode === 'teacher' ? sub.getFoldersByName(a.name) : sub.getFolders();
    while (persons.hasNext()) collect_(sub.getName(), persons.next(), items, a.mode === 'admin');
  }
  items.sort(function (x, y) { return x.at < y.at ? 1 : -1; });
  return out_({ ok: true, mode: a.mode, items: items });
}

function collect_(subject, person, items, admin) {
  var byStamp = {};
  var files = person.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var m = /^(.*)_(\d{8}-\d{6})\.(json|pdf)$/.exec(f.getName());
    if (!m) continue;
    var stamp = m[2], kind = m[3];
    var it = byStamp[stamp];
    if (!it) {
      var pn = person.getName();
      var course = m[1].indexOf(pn + '_') === 0 ? m[1].slice(pn.length + 1) : m[1];
      it = byStamp[stamp] = { subject: subject, name: pn, course: course, stamp: stamp, at: stampIso_(stamp), pdfId: '', jsonId: '' };
      items.push(it);
    }
    if (kind === 'pdf') { it.pdfId = f.getId(); if (admin) { it.pdfUrl = f.getUrl(); it.pdfSize = f.getSize(); } }
    else { it.jsonId = f.getId(); if (admin) { it.jsonUrl = f.getUrl(); it.jsonSize = f.getSize(); } }
  }
}

function stampIso_(s) {
  return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) + 'T' + s.slice(9, 11) + ':' + s.slice(11, 13) + ':' + s.slice(13, 15) + '+09:00';
}

/* ---------------- 파일 내용 ---------------- */
function file_(body) {
  var a = auth_(body);
  if (a.error) return out_({ ok: false, error: a.error });
  var rootId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  var f;
  try { f = DriveApp.getFileById(String(body.id || '')); } catch (x) { return out_({ ok: false, error: '파일을 찾을 수 없습니다.' }); }
  var nm = f.getName();
  if (!/\.(json|pdf)$/.test(nm)) return out_({ ok: false, error: '허용되지 않는 파일입니다.' });
  // 제출함/교과/이름/파일 구조인지, 교사 모드면 본인 폴더인지 확인
  var person, sub, top;
  try {
    person = f.getParents().next();
    sub = person.getParents().next();
    top = sub.getParents().next();
  } catch (x) { return out_({ ok: false, error: '허용되지 않는 파일입니다.' }); }
  if (top.getId() !== rootId) return out_({ ok: false, error: '허용되지 않는 파일입니다.' });
  if (a.mode === 'teacher' && person.getName() !== a.name) return out_({ ok: false, error: '본인이 제출한 파일만 볼 수 있습니다.' });
  if (/\.pdf$/.test(nm)) {
    return out_({ ok: true, kind: 'pdf', name: nm, content: Utilities.base64Encode(f.getBlob().getBytes()) });
  }
  return out_({ ok: true, kind: 'json', name: nm, content: f.getBlob().getDataAsString('UTF-8') });
}

/* ---------------- 공통 ---------------- */
function clean_(s) {
  return String(s == null ? '' : s).replace(/[\\\/:*?"<>|\r\n\t]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function child_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
