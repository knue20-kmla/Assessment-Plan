/**
 * 교수학습평가계획서 제출 접수 (관리자 계정에서 실행되는 웹앱)
 *
 * 제출된 JSON + PDF 를 관리자 드라이브의  제출함/교과/이름/  폴더에 저장합니다.
 * 설정(스크립트 속성):
 *   SUBMIT_CODE : 교사에게 알려 주는 비밀 코드 (필수)
 *   FOLDER_ID   : 제출함으로 쓸 드라이브 폴더 ID (필수)
 *   SHEET_ID    : (선택) 제출 목록을 쌓을 구글 시트 ID
 */
var MAX_BASE64 = 30 * 1024 * 1024; // 본문 상한(문자 수)

function doGet() {
  return out_({ ok: true, service: 'assessment-plan-submit', time: new Date().toISOString() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    if (!e || !e.postData || !e.postData.contents) return out_({ ok: false, error: '내용이 없습니다.' });
    if (e.postData.contents.length > MAX_BASE64) return out_({ ok: false, error: '파일이 너무 큽니다.' });

    var body = JSON.parse(e.postData.contents);
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
  } catch (err) {
    return out_({ ok: false, error: '서버 오류: ' + err });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function clean_(s) {
  return String(s == null ? '' : s).replace(/[\\/:*?"<>|\r\n\t]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function child_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** (선택) 스크립트 편집기에서 한 번 실행해 속성을 한꺼번에 설정할 때 사용 */
function setup_() {
  PropertiesService.getScriptProperties().setProperties({
    SUBMIT_CODE: '여기에-비밀코드',
    FOLDER_ID: '여기에-폴더ID'
    // SHEET_ID: '여기에-시트ID'
  });
}
