/* 제출 현황: 교사 모드(비밀 코드+이름 → 본인 제출분) / 관리자 모드(관리자 코드 → 전체) */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtAt=iso=>{const d=new Date(iso);if(isNaN(d))return iso;const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())};
const kb=n=>n?(n>=1048576?(n/1048576).toFixed(1)+'MB':Math.max(1,Math.round(n/1024))+'KB'):'';
let tab='teacher',items=[],auth=null,busy=false;

const css=document.createElement('style');css.textContent=`
#vm .vbody{padding:14px 20px 20px;overflow:auto}
#vm .vtabs{display:flex;gap:4px;background:var(--soft);padding:4px;border-radius:10px;margin-bottom:12px;width:max-content}
#vm .vtabs button{min-height:34px;border:0;border-radius:7px;padding:0 16px;background:transparent;color:var(--muted);font:inherit;font-weight:600;cursor:pointer}
#vm .vtabs button.on{background:#fff;color:var(--ink);box-shadow:0 4px 14px rgba(71,48,32,.14)}
#vm .vform{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
#vm label.f{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--muted)}
#vm label.f input,#vm label.f select{font:inherit;font-size:14px;font-weight:400;color:var(--ink);border:1px solid rgba(97,67,48,.28);border-radius:8px;padding:8px 10px;background:#fffefc;min-width:150px}
#vm .vnote{margin:10px 0;font-size:12.5px;color:#4a4540;background:#faf5ee;border:1px solid var(--line);border-radius:8px;padding:8px 12px;line-height:1.6}
#vm .vstat{min-height:20px;font-size:13px;margin:6px 0}
#vm .vstat.err{color:#b3261e}#vm .vstat.ok{color:#1d6b3a;font-weight:700}
#vm .vsum{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0;font-size:13px;color:var(--muted)}#vm .vsum b{color:var(--ink);font-size:16px}
#vm table.vt{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
#vm table.vt th{background:var(--soft);text-align:left;padding:7px 8px;font-size:12px;border-bottom:1px solid var(--line);position:sticky;top:0}
#vm table.vt td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
#vm .vtag{font-size:11px;font-weight:800;color:#1d6b3a;background:#e6f4ea;border-radius:10px;padding:1px 7px;margin-left:4px}
#vm .vtag.old{color:var(--muted);background:#f1ece6}
#vm td.act{white-space:nowrap}
#vm td.act button{margin-right:4px}
#vm .vscroll{max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:8px}
@media print{#vm{display:none!important}}`;
document.head.appendChild(css);

const m=document.createElement('div');m.id='vm';m.className='modal';m.hidden=true;
m.innerHTML=`<div class="mbox" style="width:min(860px,100%)"><div class="mh"><b>제출 현황</b><span>제출한 문서를 조회합니다.</span><button id="vclose">닫기</button></div>
<div class="vbody">
<div class="vtabs"><button id="vtT" class="on">내 제출 보기</button><button id="vtA">관리자</button></div>
<div class="vform" id="vformT"><label class="f">이름 *<input id="vname" placeholder="제출할 때 쓴 이름"></label><label class="f">비밀 코드 *<input id="vcode" type="password" autocomplete="off"></label><button class="pri" id="vgoT">조회</button></div>
<div class="vform" id="vformA" hidden><label class="f">관리자 코드 *<input id="vacode" type="password" autocomplete="off"></label><button class="pri" id="vgoA">조회</button></div>
<div class="vnote" id="vnote"></div>
<div class="vstat" id="vstat"></div>
<div id="vfilters" class="vform" hidden>
 <label class="f">교과<select id="vfsub"><option value="">전체</option></select></label>
 <label class="f">이름/과목 검색<input id="vfq" placeholder="검색어"></label>
 <label class="f" style="flex-direction:row;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="vflatest" style="min-width:0"> 최신 제출만</label>
</div>
<div class="vsum" id="vsum"></div>
<div class="vscroll" id="vlistw" hidden><table class="vt" id="vlist"></table></div>
</div></div>`;
document.body.appendChild(m);

function stat(t,c){const s=$('vstat');s.textContent=t||'';s.className='vstat '+(c||'')}
function who(){try{return JSON.parse(localStorage.getItem('plan2026-submit-who')||'{}')}catch(e){return {}}}
function setTab(t){tab=t;items=[];auth=null;
 $('vtT').classList.toggle('on',t==='teacher');$('vtA').classList.toggle('on',t==='admin');
 $('vformT').hidden=t!=='teacher';$('vformA').hidden=t!=='admin';
 $('vnote').innerHTML=t==='teacher'?'제출할 때 쓴 <b>이름</b>과 <b>비밀 코드</b>를 넣으면 <b>내가 제출한 파일</b>만 보입니다. 이름은 제출할 때와 똑같이 입력해야 합니다.':'<b>관리자 코드</b>로 모든 교사의 제출 목록과 정보를 봅니다. 관리자 코드는 제출 비밀 코드와 다릅니다.';
 $('vfilters').hidden=true;$('vlistw').hidden=true;$('vsum').innerHTML='';stat('');$('vlist').innerHTML=''}
window.openSubmissions=function(){const w=who();$('vname').value=w.name||'';$('vcode').value=w.code||'';$('vacode').value='';
 setTab(tab);if(!window.__submitUrl||!window.__submitUrl()){stat('제출 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.','err')}m.hidden=false};
$('vclose').onclick=()=>{m.hidden=true;$('vacode').value=''};
m.addEventListener('click',e=>{if(e.target===m)m.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)m.hidden=true});
$('vtT').onclick=()=>setTab('teacher');$('vtA').onclick=()=>setTab('admin');

async function call(payload){const u=window.__submitUrl&&window.__submitUrl();if(!u)throw new Error('제출 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.');
 let r;try{r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)})}catch(e){throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.')}
 let j=null;try{j=await r.json()}catch(e){}
 if(!j)throw new Error('응답을 확인하지 못했습니다. (응답 '+r.status+')');if(!j.ok)throw new Error(j.error||'요청에 실패했습니다.');return j}

async function load(){if(busy)return;let payload;
 if(tab==='teacher'){const name=$('vname').value.trim(),code=$('vcode').value.trim();if(!name){stat('이름을 입력해 주세요.','err');return}if(!code){stat('비밀 코드를 입력해 주세요.','err');return}
  payload={action:'list',mode:'teacher',code,name};auth={mode:'teacher',code,name}}
 else{const code=$('vacode').value.trim();if(!code){stat('관리자 코드를 입력해 주세요.','err');return}payload={action:'list',mode:'admin',code};auth={mode:'admin',code}}
 busy=true;stat('조회 중입니다…');
 try{const j=await call(payload);items=j.items||[];
  if(tab==='teacher'){const w=who();localStorage.setItem('plan2026-submit-who',JSON.stringify(Object.assign({},w,{name:auth.name,code:auth.code})))}
  stat(items.length?'':(tab==='teacher'?'제출한 파일이 없습니다. 이름이 제출할 때와 같은지 확인해 주세요.':'아직 제출된 문서가 없습니다.'),items.length?'':'');
  fillFilters();render()}
 catch(e){items=[];render();stat(String(e.message||e),'err')}finally{busy=false}}
$('vgoT').onclick=load;$('vgoA').onclick=load;
[$('vname'),$('vcode'),$('vacode')].forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')load()}));

function fillFilters(){const adm=tab==='admin';$('vfilters').hidden=!adm||!items.length;if(!adm)return;
 const subs=[...new Set(items.map(i=>i.subject))].sort();const sel=$('vfsub');const cur=sel.value;
 sel.innerHTML='<option value="">전체</option>'+subs.map(s=>'<option>'+esc(s)+'</option>').join('');sel.value=subs.includes(cur)?cur:''}
['vfsub','vfq','vflatest'].forEach(id=>{$(id).addEventListener('input',render);$(id).addEventListener('change',render)});

function keyOf(i){return i.subject+'|'+i.name+'|'+i.course}
function render(){const adm=tab==='admin';const tb=$('vlist');
 if(!items.length){$('vlistw').hidden=true;$('vsum').innerHTML='';return}
 const latest={};items.forEach(i=>{const k=keyOf(i);if(!latest[k]||i.at>latest[k].at)latest[k]=i});
 let rows=items.slice();
 if(adm){const s=$('vfsub').value,q=$('vfq').value.trim();
  if(s)rows=rows.filter(i=>i.subject===s);if(q)rows=rows.filter(i=>(i.name+' '+i.course).includes(q));
  if($('vflatest').checked)rows=rows.filter(i=>latest[keyOf(i)]===i)}
 else rows=rows.slice();
 const people=new Set(rows.map(i=>i.subject+'|'+i.name));
 $('vsum').innerHTML=adm?'<span>제출 <b>'+rows.length+'</b>건</span><span>제출자 <b>'+people.size+'</b>명</span><span>전체 <b>'+items.length+'</b>건</span>':'<span>내 제출 <b>'+rows.length+'</b>건</span>';
 const head=adm?'<tr><th>교과</th><th>이름</th><th>과목</th><th>제출 시각</th><th>크기</th><th></th></tr>':'<tr><th>제출 시각</th><th>교과</th><th>과목</th><th></th></tr>';
 tb.innerHTML=head+rows.map(i=>{const idx=items.indexOf(i);const tag=latest[keyOf(i)]===i?'<span class="vtag">최신</span>':'<span class="vtag old">이전</span>';
  const acts='<td class="act"><button class="ctl" data-a="pdf" data-i="'+idx+'">PDF 보기</button><button class="ctl" data-a="open" data-i="'+idx+'">앱으로 열기</button>'+(adm&&i.pdfUrl?'<a class="ctl" style="text-decoration:none;display:inline-block" target="_blank" rel="noopener" href="'+esc(i.pdfUrl)+'">드라이브</a>':'')+'</td>';
  return adm?'<tr><td>'+esc(i.subject)+'</td><td>'+esc(i.name)+'</td><td>'+esc(i.course)+tag+'</td><td>'+esc(fmtAt(i.at))+'</td><td>'+esc(kb(i.pdfSize)+(i.jsonSize?' / '+kb(i.jsonSize):''))+'</td>'+acts+'</tr>'
   :'<tr><td>'+esc(fmtAt(i.at))+tag+'</td><td>'+esc(i.subject)+'</td><td>'+esc(i.course)+'</td>'+acts+'</tr>'}).join('');
 $('vlistw').hidden=false}

function b64ToBlob(b64,type){const bin=atob(b64),u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);return new Blob([u],{type})}
$('vlist').addEventListener('click',async e=>{const b=e.target.closest('button[data-a]');if(!b||busy)return;const it=items[+b.dataset.i];if(!it||!auth)return;
 const act=b.dataset.a;let w=null;if(act==='pdf'){w=window.open('about:blank','_blank')}
 busy=true;const old=b.textContent;b.textContent='불러오는 중…';b.disabled=true;
 try{
  if(act==='pdf'){if(!it.pdfId)throw new Error('PDF 파일이 없습니다.');
   const j=await call(Object.assign({action:'file',id:it.pdfId},auth.mode==='teacher'?{mode:'teacher',code:auth.code,name:auth.name}:{mode:'admin',code:auth.code}));
   const url=URL.createObjectURL(b64ToBlob(j.content,'application/pdf'));if(w&&!w.closed)w.location.href=url;else window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),120000)}
  else{if(!it.jsonId)throw new Error('문서 파일이 없습니다.');
   const j=await call(Object.assign({action:'file',id:it.jsonId},auth.mode==='teacher'?{mode:'teacher',code:auth.code,name:auth.name}:{mode:'admin',code:auth.code}));
   let o;try{o=JSON.parse(j.content)}catch(x){throw new Error('문서 내용을 읽지 못했습니다.')}
   if(!o||!o.data||!o.data.vals)throw new Error('올바른 문서 파일이 아닙니다.');
   const nm=(it.name+'_'+it.course+' (제출본 '+fmtAt(it.at).slice(5,10)+')').slice(0,80);
   const rec={id:uidDoc(),name:nm,updated:Date.now(),data:o.data};DB.list.unshift(rec);persist();m.hidden=true;$('vacode').value='';openDoc(rec.id)}
 }catch(err){if(w&&!w.closed)w.close();stat(String(err.message||err),'err')}
 finally{busy=false;b.textContent=old;b.disabled=false}});
})();
