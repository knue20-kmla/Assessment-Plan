/* 제출하기: 관리자의 Apps Script 웹앱으로 JSON + PDF 를 보낸다 (저장 기능과 별개) */
(function(){
'use strict';
const DEFAULT_URL='';           // 관리자가 배포한 Apps Script 웹앱 주소(…/exec)를 여기에 넣는다
const LS_URL='plan2026-submit-url',LS_WHO='plan2026-submit-who';
const MAX_BYTES=12*1024*1024;   // 전송 상한(JSON+PDF, base64 전)
const url=()=>(localStorage.getItem(LS_URL)||DEFAULT_URL).trim();
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

const css=document.createElement('style');css.textContent=`
#sm .sbody{padding:16px 20px 20px;overflow:auto}
#sm .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
#sm label.f{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--muted)}
#sm label.f input{font:inherit;font-size:14px;font-weight:400;color:var(--ink);border:1px solid rgba(97,67,48,.28);border-radius:8px;padding:8px 10px;background:#fffefc}
#sm label.f input:focus{outline:0;border-color:var(--focus);box-shadow:0 0 0 3px rgba(217,99,63,.15)}
#sm label.f input[readonly]{background:#f6f1ea;color:var(--muted)}
#sm .snote{margin:14px 0 10px;padding:10px 12px;border-radius:8px;background:#faf5ee;border:1px solid var(--line);font-size:12.5px;line-height:1.6;color:#4a4540}
#sm .sagree{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0 10px}
#sm .sagree input{margin-top:3px}
#sm .sstat{min-height:20px;font-size:13px;margin:4px 0 8px}
#sm .sstat.err{color:#b3261e}#sm .sstat.ok{color:#1d6b3a;font-weight:700}
#sm .srow{display:flex;gap:8px;align-items:center}
#sm .shist{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;font-size:12.5px;color:var(--muted)}
#sm .shist div{padding:2px 0}
#sm .sadmin{display:inline-block;margin-top:10px;font-size:11.5px;color:var(--muted);text-decoration:underline;cursor:pointer}
@media(max-width:520px){#sm .sgrid{grid-template-columns:1fr}}
@media print{#sm{display:none!important}}`;
document.head.appendChild(css);

const m=document.createElement('div');m.id='sm';m.className='modal';m.hidden=true;
m.innerHTML=`<div class="mbox" style="width:min(540px,100%)"><div class="mh"><b>제출하기</b><span>이 문서를 관리자에게 제출합니다.</span><button id="sclose">닫기</button></div>
<div class="sbody">
<div class="sgrid">
<label class="f">이름 *<input id="sname" autocomplete="name" placeholder="예: 홍길동"></label>
<label class="f">교과<input id="ssubj" placeholder="예: 사회과"></label>
<label class="f">과목명(문서)<input id="scourse" placeholder="예: 한국사1"></label>
<label class="f">비밀 코드 *<input id="scode" type="password" autocomplete="off" placeholder="관리자가 알려 준 코드"></label>
</div>
<div class="snote">· 제출하면 이 문서의 <b>내용(JSON)</b>과 <b>PDF</b>가 관리자에게 전달되어 관리자의 구글 드라이브 제출함에 저장됩니다.<br>· 제출해도 내가 저장해 둔 문서는 그대로입니다. 고친 뒤 다시 제출하면 새 파일로 추가됩니다.<br>· 제출한 내용은 관리자만 볼 수 있으며, 이 앱은 내용을 다른 곳에 보관하지 않습니다.</div>
<label class="sagree"><input type="checkbox" id="sagree"><span>위 내용을 확인했으며, 이 문서를 관리자에게 제출하는 것에 동의합니다.</span></label>
<div class="sstat" id="sstat"></div>
<div class="srow"><button class="pri" id="ssend">제출하기</button></div>
<div class="shist" id="shist"></div>
<a class="sadmin" id="sadmin">제출 주소 설정(관리자)</a>
</div></div>`;
document.body.appendChild(m);

function who(){try{return JSON.parse(localStorage.getItem(LS_WHO)||'{}')}catch(e){return {}}}
function stat(t,cls){const s=$('sstat');s.textContent=t||'';s.className='sstat '+(cls||'')}
function hist(){const h=$('shist');const list=(curRec&&curRec.submits)||[];
 h.innerHTML=list.length?'<b>이 문서의 제출 내역</b>'+list.slice(-5).reverse().map(x=>'<div>'+esc(new Date(x.at).toLocaleString('ko-KR'))+' · '+esc(x.id||'')+'</div>').join(''):'아직 제출한 적이 없습니다.'}
window.openSubmit=function(){if(typeof save==='function')save();
 const w=who();
 $('sname').value=w.name||'';$('ssubj').value=(V['info.subj']||w.subj||'');$('scourse').value=(V['info.name']||'');$('scode').value=w.code||'';
 $('sagree').checked=false;stat(url()?'':'제출 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.',url()?'':'err');
 hist();m.hidden=false};
window.closeSubmit=function(){m.hidden=true};
$('sclose').onclick=closeSubmit;
m.addEventListener('click',e=>{if(e.target===m)closeSubmit()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)closeSubmit()});
$('sadmin').onclick=function(){const v=prompt('관리자: 제출을 받을 Apps Script 웹앱 주소(https://script.google.com/macros/s/…/exec)를 입력하세요.\n비우면 설정을 지웁니다.',url());if(v===null)return;
 if(v.trim()&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v.trim())){alert('올바른 웹앱 주소가 아닙니다. …/exec 로 끝나는 주소여야 합니다.');return}
 localStorage.setItem(LS_URL,v.trim());stat(v.trim()?'제출 주소를 저장했습니다.':'제출 주소 설정을 지웠습니다.',v.trim()?'ok':'')};

function blobToB64(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(new Error('PDF를 읽지 못했습니다.'));r.readAsDataURL(b)})}
let busy=false;
$('ssend').onclick=async function(){
 if(busy)return;const u=url();if(!u){stat('제출 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.','err');return}
 const name=$('sname').value.trim(),subj=$('ssubj').value.trim(),course=$('scourse').value.trim(),code=$('scode').value.trim();
 if(!name){stat('이름을 입력해 주세요.','err');return}
 if(!code){stat('비밀 코드를 입력해 주세요.','err');return}
 if(!$('sagree').checked){stat('동의 항목에 체크해 주세요.','err');return}
 busy=true;$('ssend').disabled=true;
 try{
  localStorage.setItem(LS_WHO,JSON.stringify({name,subj,code}));
  if(typeof save==='function')save();
  stat('PDF를 만드는 중입니다…');
  const pdf=await window.__exp.buildPdf();
  const json=JSON.stringify({format:'assessment-plan',version:1,name:curRec.name,data:S});
  if(pdf.size+json.length>MAX_BYTES)throw new Error('파일이 너무 커서 제출할 수 없습니다. 관리자에게 문의하세요.');
  stat('전송 중입니다…');
  const body=JSON.stringify({code,name,subject:subj,course,docName:curRec.name,json,pdf:await blobToB64(pdf),clientTime:new Date().toISOString()});
  let r;try{r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body})}
  catch(e){throw new Error('서버에 연결하지 못했습니다. 인터넷 연결과 제출 주소를 확인해 주세요.')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!j)throw new Error('제출 결과를 확인하지 못했습니다. 관리자에게 도착했는지 확인해 주세요. (응답 '+r.status+')');
  if(!j.ok)throw new Error(j.error||'제출에 실패했습니다.');
  curRec.submits=(curRec.submits||[]).concat([{at:Date.now(),id:j.id||''}]);if(typeof persist==='function')persist();
  stat('제출했습니다. ('+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+')','ok');hist();
 }catch(e){stat(String(e.message||e),'err')}
 finally{busy=false;$('ssend').disabled=false}};
})();
