/* 편의 기능 모음: 메뉴/점검/되돌리기·백업/학기 전환/예시/목차 진행/안내/접근성/붙여넣기 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtT=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())};
const DAY=864e5;

/* ================= 공통: 모달 만들기 ================= */
function makeModal(id,title,sub,width){const m=document.createElement('div');m.id=id;m.className='modal';m.hidden=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label',title);
 m.innerHTML='<div class="mbox" style="width:min('+(width||620)+'px,100%)"><div class="mh"><b>'+esc(title)+'</b><span>'+esc(sub||'')+'</span><button type="button" data-close>닫기</button></div><div class="xbody" style="padding:14px 20px 20px;overflow:auto"></div></div>';
 document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.hasAttribute('data-close'))m.hidden=true});return m}
const css=document.createElement('style');css.textContent=`
.skip{position:absolute;left:-999px;top:6px;z-index:100;background:#151c26;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none}
.skip:focus{left:8px}
button:focus-visible,a:focus-visible,select:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid #d9633f;outline-offset:2px}
.xpop button.sep2{border-top:1px solid var(--line);margin-top:4px;padding-top:11px;border-radius:0 0 8px 8px}
.xpop button.dng b{color:#9e2f38}
.zbtn{min-width:38px;padding:0 8px!important}
.zgrp{display:inline-flex;gap:3px;align-items:center}
.bkchip{cursor:pointer;color:#b3261e;font-weight:700}
.xbody .row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px 12px;border:1px solid var(--line);border-radius:8px;margin:7px 0;font-size:13.5px}
.xbody .row small{color:var(--muted);display:block}
.xbody button.b{font:inherit;font-size:13px;min-height:32px;padding:0 12px;border-radius:7px;border:1px solid rgba(97,67,48,.28);background:#fffefc;color:var(--ink);cursor:pointer}
.xbody button.b:hover{background:var(--soft)}
.xbody button.b.pri{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
.xbody .note{font-size:12.5px;color:#4a4540;background:#faf5ee;border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:8px 0;line-height:1.6}
.ck-err,.ck-warn{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:8px;margin:5px 0;font-size:13px;cursor:pointer;border:1px solid transparent}
.ck-err{background:#fdf0ef;border-color:#f3c9c5}.ck-warn{background:#fff7e6;border-color:#f1dfb5}
.ck-err:hover,.ck-warn:hover{filter:brightness(.97)}
.ck-tag{flex:none;font-size:11px;font-weight:800;border-radius:10px;padding:1px 8px;color:#fff}
.ck-err .ck-tag{background:#b3261e}.ck-warn .ck-tag{background:#a56a00}
.ck-sec{flex:none;color:var(--muted);font-size:12px;min-width:74px}
#toc a .pg{display:inline-block;width:1.1em;margin-right:4px;font-size:11px;opacity:.9}
#toc a .pg.full{color:#8fe3a8}#toc a .pg.part{color:#ffd37a}#toc a .pg.none{color:rgba(255,255,255,.55)}
.ob-step{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin:8px 0}
.ob-n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
.ob-step b{font-size:15px}.ob-step p{margin:3px 0 0;font-size:13px;color:#4a4540;line-height:1.55}
@media(max-width:900px){.topbar{position:static}.brand h1{font-size:18px}.tb-doc{order:3;width:100%}.tb-actions{width:100%}}
@media(max-width:560px){.topbar .ghost,.topbar .primary{padding:0 10px;min-height:36px;font-size:13px}.seg button{padding:0 10px}.brand img{width:38px;height:38px}}
@media print{.skip,.xbody{display:none}}`;
document.head.appendChild(css);
const skip=document.createElement('a');skip.className='skip';skip.href='#doc';skip.textContent='본문으로 건너뛰기';document.body.insertBefore(skip,document.body.firstChild);
skip.addEventListener('click',e=>{e.preventDefault();const f=$('doc').querySelector('input,[contenteditable]');if(f){f.focus();f.scrollIntoView({block:'center'})}});

/* ================= 상단 메뉴(드롭다운) ================= */
function closeMenus(except){document.querySelectorAll('.xmenu').forEach(x=>{if(x!==except){const p=x.querySelector('.xpop'),b=x.querySelector('[data-mbtn]');if(p)p.hidden=true;if(b)b.setAttribute('aria-expanded','false')}})}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-mbtn]');
 if(btn){e.stopPropagation();const x=btn.closest('.xmenu'),p=x.querySelector('.xpop');const open=p.hidden;closeMenus(x);p.hidden=!open;btn.setAttribute('aria-expanded',String(open));if(open){const f=p.querySelector('button');if(f&&e.detail===0)f.focus()}return}
 if(e.target.closest('.xpop button')){closeMenus()}else if(!e.target.closest('.xmenu'))closeMenus()},true);
document.addEventListener('keydown',e=>{const x=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.xmenu');
 if(e.key==='Escape'){const open=document.querySelector('.xmenu .xpop:not([hidden])');if(open){const b=open.parentElement.querySelector('[data-mbtn]');closeMenus();if(b)b.focus();e.stopPropagation()}return}
 if(!x)return;const p=x.querySelector('.xpop');if(!p||p.hidden)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const it=[...p.querySelectorAll('button')];let i=it.indexOf(document.activeElement);i=e.key==='ArrowDown'?(i+1)%it.length:(i-1+it.length)%it.length;it[i].focus()}});

/* ================= 점검 엔진 ================= */
const txt=v=>String(v==null?'':v).replace(/^[\s■▪□\-·•ㅇ]+/gm,'').replace(/^\s*(\(\d+\)|\d+[.)]|[가-힣]\.)\s*/gm,'').trim();
const filled=v=>txt(v).length>0;
const nn=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isNaN(n)?0:n};
const first=v=>String(v||'').split('\n')[0].trim();
function anyOn(prefix){return Object.keys(V).some(k=>k.startsWith(prefix)&&(V[k]===true||(k.endsWith('.t')&&filled(V[k]))))}
function runChecks(){const items=[],tot={},bad={};
 const req=(sec,ok,lv,msg,key)=>{tot[sec]=(tot[sec]||0)+1;if(!ok){bad[sec]=(bad[sec]||0)+1;items.push({lv,sec,msg,key})}};
 const g=k=>V[k];
 req('info',filled(g('info.subj')),'warn','교과가 비어 있습니다.','info.subj');
 req('info',filled(g('info.grade')),'warn','학년이 비어 있습니다.','info.grade');
 req('info',filled(g('info.name')),'warn','과목명이 비어 있습니다.','info.name');
 req('info',filled(g('info.credit')),'warn','학점이 비어 있습니다. (시수 누계 계산에 쓰입니다)','info.credit');
 /* Ⅰ 시기 */
 const cr=nn(g('info.credit')),target=cr*16;let cum=0,any=false;
 S.periods.forEach(id=>{if(filled(g(`p${id}.hours`))){any=true;cum+=nn(g(`p${id}.hours`))}});
 req('p',any,'warn','시수가 한 칸도 입력되지 않았습니다.',`p${S.periods[0]}.hours`);
 if(any&&cr)req('p',cum===target,'err',`시수 누계가 ${cum}시수인데 기준은 ${target}시수(${cr}학점)입니다.`,'info.credit');
 S.periods.forEach((id,i)=>{const lab='시기 '+(i+1)+(first(g(`p${id}.month`))?'('+first(g(`p${id}.month`))+')':'');
  req('p',filled(g(`p${id}.unit`)),'warn',lab+': 단원명이 비어 있습니다.',`p${id}.unit`);
  req('p',filled(g(`p${id}.crit`)),'warn',lab+': 성취기준 및 평가 요소가 비어 있습니다.',`p${id}.crit`);
  req('p',anyOn(`p${id}.s.`),'warn',lab+': 수업 방법을 선택하지 않았습니다.',`p${id}.s.강의식`);
  req('p',anyOn(`p${id}.e.`),'warn',lab+': 평가 방법을 선택하지 않았습니다.',`p${id}.e.서·논술`);
  req('p',filled(g(`p${id}.note`)),'warn',lab+': 수업·평가 연계의 주안점이 비어 있습니다.',`p${id}.note`)});
 /* Ⅱ 1. 목적 */
 req('goal',filled(g('goal')),'warn','평가의 목적, 방향이 비어 있습니다.','goal');
 /* 3. 반영 비율 */
 req('t3',filled(g('t3.reg')),'err','정기시험 반영비율이 비어 있습니다.','t3.reg');
 req('t3',['ms','mn','fs','fn'].some(k=>filled(g('t3.'+k))),'warn','정기시험 영역 만점(점수)이 한 칸도 입력되지 않았습니다.','t3.ms');
 const ptSum=S.pcols.reduce((a,c)=>a+nn(g('c'+c+'.pt')),0);
 req('t3',ptSum===100,'err',`수행평가 영역 만점 합계가 ${ptSum}점입니다(100점이어야 합니다).`,S.pcols[0]?'c'+S.pcols[0]+'.pt':'t3.reg');
 const w=document.querySelector('[data-c="t3.warn"]');const wt=w?w.textContent.trim():'';
 req('t3',!wt,'err',wt.replace(/^※\s*/,''),'t3.reg');
 if(filled(g('t3.ms'))||filled(g('t3.mn')))req('t3',filled(g('t3.tm')),'warn','중간고사 평가 시기가 비어 있습니다.','t3.tm');
 if(filled(g('t3.fs'))||filled(g('t3.fn')))req('t3',filled(g('t3.tf')),'warn','기말고사 평가 시기가 비어 있습니다.','t3.tf');
 S.pcols.forEach((c,i)=>{req('t3',filled(g(`c${c}.name`)),'warn',`수행평가 ${i+1}: 평가 요소(방법) 이름이 비어 있습니다.`,`c${c}.name`);
  req('t3',filled(g(`c${c}.time`)),'warn',`수행평가 ${i+1}: 평가 시기가 비어 있습니다.`,`c${c}.time`)});
 req('t3',filled(g('b.mid')),'warn','별표1: 중간고사 성취기준이 비어 있습니다.','b.mid');
 req('t3',filled(g('b.fin')),'warn','별표1: 기말고사 성취기준이 비어 있습니다.','b.fin');
 S.pcols.forEach((c,i)=>req('t3',filled(g('b.c'+c)),'warn',`별표1: 수행평가 ${i+1} 성취기준이 비어 있습니다.`,'b.c'+c));
 /* 5. 성취 수준 */
 ['A','B','C','D','E'].forEach(x=>req('s5',filled(g('s5.'+x)),'warn',`성취수준 ${x}의 진술이 비어 있습니다.`,'s5.'+x));
 req('s5',filled(g('s5.min')),'warn','최소능력 수행특성이 비어 있습니다.','s5.min');
 req('s5',Array.from({length:S.rep},(_,i)=>g('rp'+i+'.a')).some(filled),'warn','차시별 보충 지도 표(학습 내용)가 비어 있습니다.','rp0.a');
 /* 6. 수행평가 세부 */
 S.perfs.forEach((pid,i)=>{const ps=S.perfS[pid];if(!ps)return;const nm=first(g(`c${S.pcols[i]}.name`))||filled(g(`f${pid}.area`))&&g(`f${pid}.area`)||'';const lab='수행평가 표 '+(i+1)+(nm?'('+nm+')':'');
  req('perf',filled(g(`f${pid}.area`)),'warn',lab+': 평가 영역이 비어 있습니다.',`f${pid}.area`);
  req('perf',anyOn(`f${pid}.m.`),'warn',lab+': 평가 방법을 선택하지 않았습니다.',`f${pid}.m.서·논술`);
  req('perf',filled(g(`f${pid}.cur`)),'warn',lab+': 교육과정 성취기준이 비어 있습니다.',`f${pid}.cur`);
  ps.grades.forEach(gr=>req('perf',filled(g('g'+gr+'.t')),'warn',lab+': 평가 기준('+(g('g'+gr+'.l')||'')+')이 비어 있습니다.','g'+gr+'.t'));
  ps.groups.forEach((gid,gi)=>{req('perf',filled(g('e'+gid+'.name')),'warn',lab+': 평가 요소 '+(gi+1)+'의 이름이 비어 있습니다.','e'+gid+'.name');
   (ps.lines[gid]||[]).forEach((l,li)=>{const t=filled(g('l'+l+'.t')),s=filled(g('l'+l+'.s'));if(t!==s)req('perf',false,'warn',lab+': 평가 요소 '+(gi+1)+'의 '+(li+1)+'번째 줄에 '+(t?'배점':'채점 기준')+'이 없습니다.','l'+l+(t?'.s':'.t'))})});
  const pw=document.querySelector('[data-c="pw.'+pid+'"]');const pt=pw?pw.textContent.trim():'';const zero=/합계\(0점\)/.test(pt);req('perf',!pt,zero?'warn':'err',lab+': '+(zero?'배점이 입력되지 않았습니다.':pt.replace(/^※\s*/,'')),`f${pid}.area`)});
 return {items,tot,bad}}
window.runChecks=runChecks;

/* ================= 점검 패널 ================= */
const cm=makeModal('ckm','점검하기','제출 전에 빠진 곳과 숫자 오류를 확인합니다.',680);
const secName={info:'기본 정보',p:'Ⅰ 시기',goal:'Ⅱ-1 목적',t3:'Ⅱ-3 반영 비율',s5:'Ⅱ-5 성취수준',perf:'Ⅱ-6 수행평가'};
function jump(key){cm.hidden=true;const el=document.querySelector('[data-k="'+key.replace(/"/g,'\\"')+'"]');if(el){el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>el.focus&&el.focus({preventScroll:true}),350)}}
let afterCheck=null;
window.openChecks=function(proceed){afterCheck=typeof proceed==='function'?proceed:null;if(typeof save==='function')save();
 const r=runChecks(),errs=r.items.filter(i=>i.lv==='err'),warns=r.items.filter(i=>i.lv==='warn');
 const b=cm.querySelector('.xbody');
 let h=!r.items.length?'<div class="note" style="background:#e6f4ea;border-color:#bfe3c9;color:#1d6b3a"><b>점검 결과 이상이 없습니다.</b> 제출해도 좋습니다.</div>':'<div class="note">오류 <b style="color:#b3261e">'+errs.length+'</b>건, 확인 필요 <b style="color:#a56a00">'+warns.length+'</b>건 · 항목을 누르면 그 칸으로 이동합니다.</div>';
 const all=[];const row=i=>{all.push(i);return '<div class="ck-'+i.lv+'" role="button" tabindex="0" data-n="'+(all.length-1)+'"><span class="ck-tag">'+(i.lv==='err'?'오류':'확인')+'</span><span>'+esc(i.msg)+'</span></div>'};
 if(errs.length)h+='<h4 style="margin:10px 0 4px;font-size:13px;color:#b3261e">오류 ('+errs.length+')</h4>'+errs.map(row).join('');
 if(warns.length){h+='<h4 style="margin:12px 0 4px;font-size:13px;color:#a56a00">확인 필요 ('+warns.length+')</h4>';
  Object.keys(secName).forEach(sec=>{const ws=warns.filter(w=>w.sec===sec);if(!ws.length)return;
   h+='<details style="margin:6px 0" '+(ws.length<=5?'open':'')+'><summary style="cursor:pointer;font-size:13px;font-weight:700;padding:3px 0">'+esc(secName[sec])+' · '+ws.length+'건</summary>'+ws.map(row).join('')+'</details>'})}
 h+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'+(afterCheck?'<button type="button" class="b" id="ckgo">'+(r.items.length?'그래도 제출하기':'제출하기')+'</button>':'')+'<button type="button" class="b pri" data-close>'+(afterCheck&&r.items.length?'돌아가서 고치기':'닫기')+'</button></div>';
 b.innerHTML=h;
 b.querySelectorAll('[data-n]').forEach(el=>{const go=()=>jump(all[+el.dataset.n].key);el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
 const gb=$('ckgo');if(gb)gb.onclick=()=>{cm.hidden=true;const f=afterCheck;afterCheck=null;f&&f()};
 cm.hidden=false;return r};
const origOpenSubmit=window.openSubmit;
window.openSubmit=function(){const r=runChecks();if(r.items.length){openChecks(()=>origOpenSubmit&&origOpenSubmit())}else origOpenSubmit&&origOpenSubmit()};

/* ================= 목차 진행 표시 ================= */
const SECMAP={0:'info',1:'p',3:'goal',5:'t3',7:'s5',8:'perf'};
function updateProgress(){if(typeof tocEls==='undefined'||!tocEls.length)return;let r;try{r=runChecks()}catch(e){return}
 tocEls.forEach(([a],i)=>{const sec=SECMAP[i];const old=a.querySelector('.pg');if(old)old.remove();if(!sec)return;
  const t=r.tot[sec]||0,bd=r.bad[sec]||0;const cls=!t?'none':bd===0?'full':bd>=t?'none':'part';const sym=cls==='full'?'●':cls==='part'?'◐':'○';
  const s=document.createElement('span');s.className='pg '+cls;s.textContent=sym;s.setAttribute('role','img');s.setAttribute('aria-label',cls==='full'?'입력 완료':cls==='part'?'일부 입력':'비어 있음');a.insertBefore(s,a.firstChild)})}
const baseToc=window.buildToc;window.buildToc=function(){baseToc.apply(this,arguments);updateProgress()};
let pgT;document.addEventListener('input',()=>{clearTimeout(pgT);pgT=setTimeout(updateProgress,500)},true);
document.addEventListener('change',()=>{clearTimeout(pgT);pgT=setTimeout(updateProgress,300)},true);

/* ================= 되돌리기(스냅샷) · 백업 알림 ================= */
const SNAP_MAX=6,SNAP_GAP=10*60*1000,DB_LIMIT=3.6*1024*1024;
function pruneAll(){let size=JSON.stringify(DB).length;while(size>DB_LIMIT){let target=null;DB.list.forEach(r=>{if(r.snaps&&r.snaps.length&&(!target||r.snaps[0].at<target.snaps[0].at))target=r});if(!target)break;target.snaps.shift();size=JSON.stringify(DB).length}}
window.snapNow=function(label){if(!curRec)return;const d=JSON.stringify(S);const a=curRec.snaps||(curRec.snaps=[]);if(a.length&&a[a.length-1].d===d)return;
 a.push({at:Date.now(),label:label||'자동 저장 지점',d});while(a.length>SNAP_MAX)a.shift();pruneAll();persist()};
window.snapMaybe=function(){const a=curRec&&curRec.snaps||[];const last=a[a.length-1];if(!last||Date.now()-last.at>SNAP_GAP)snapNow('자동 저장 지점')};
const sm=makeModal('snm','이전 상태로 되돌리기','자동으로 남겨 둔 이전 상태입니다.',640);
function renderSnaps(){const a=(curRec.snaps||[]).slice().reverse();const b=sm.querySelector('.xbody');
 b.innerHTML='<div class="note">작업 중 약 10분마다, 그리고 초기화·제출·되돌리기 직전에 현재 상태를 자동으로 남깁니다(문서당 최근 '+SNAP_MAX+'개, 이 브라우저에만 보관). 되돌려도 지금 상태는 "되돌리기 전"으로 다시 남습니다.</div>'+
  (a.length?a.map((s,i)=>'<div class="row"><div><b>'+esc(fmtT(s.at))+'</b><small>'+esc(s.label)+' · '+Math.round(s.d.length/1024)+'KB</small></div><div><button type="button" class="b" data-act="new" data-i="'+i+'">새 문서로 열어 보기</button> <button type="button" class="b pri" data-act="restore" data-i="'+i+'">이 상태로 되돌리기</button></div></div>').join(''):'<div class="note">아직 남겨진 이전 상태가 없습니다. 입력하고 잠시 후 다시 확인해 주세요.</div>')+
  '<div style="margin-top:10px"><button type="button" class="b" id="snmk">지금 상태를 저장 지점으로 남기기</button></div>';
 b.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=()=>{const s=a[+btn.dataset.i];if(!s)return;
  if(btn.dataset.act==='restore'){if(!confirm(fmtT(s.at)+' 상태로 되돌립니다. 지금 상태는 "되돌리기 전"으로 남겨 둡니다. 계속할까요?'))return;
   snapNow('되돌리기 전');S=JSON.parse(s.d);curRec.data=S;V=S.vals;ensure();persist();afterSwitch();sm.hidden=true}
  else{const r={id:uidDoc(),name:(curRec.name+' (이전 상태 '+fmtT(s.at).slice(5)+')').slice(0,80),updated:Date.now(),data:JSON.parse(s.d)};DB.list.unshift(r);persist();sm.hidden=true;openDoc(r.id)}});
 $('snmk').onclick=()=>{snapNow('직접 남김');renderSnaps()}}
window.openSnaps=function(){if(typeof save==='function')save();renderSnaps();sm.hidden=false};
/* 초기화 직전 자동 보관 */
const origReset=window.resetCur;window.resetCur=function(){if(!confirm('현재 문서의 입력 내용을 모두 지우고 처음 상태로 되돌립니다. (직전 상태는 "이전 상태로 되돌리기"에 남겨 둡니다.) 계속할까요?'))return;
 snapNow('초기화 전');curRec.data=S=fresh();V=S.vals;ensure();persist();afterSwitch();if($('dm'))$('dm').hidden=true};
/* 백업 기록 + 알림 */
const origExportDoc=window.exportDoc,origExportAll=window.exportAll;
window.exportDoc=function(id){const r=DB.list.find(d=>d.id===id);if(r){r.backedAt=Date.now();persist()}return origExportDoc.apply(this,arguments)};
window.exportAll=function(){DB.list.forEach(r=>r.backedAt=Date.now());persist();return origExportAll.apply(this,arguments)};
const bk=document.createElement('span');bk.id='bkchip';bk.className='saved bkchip';bk.setAttribute('role','button');bk.tabIndex=0;bk.hidden=true;$('gchip').after(bk);
bk.onclick=()=>openDocs();bk.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')openDocs()};
function updateBackup(){if(!curRec){return}const last=Math.max(curRec.backedAt||0,curRec.driveSynced||0);const upd=curRec.updated||0;const age=Date.now()-(last||upd);
 const dirty=upd>last+60e3&&(last?true:(Date.now()-(curRec.created||upd)>DAY*0));
 if(!dirty||!upd||(last&&age<7*DAY)||(!last&&Date.now()-upd<5*60e3)){bk.hidden=true;return}
 bk.hidden=false;bk.textContent=last?'⚠ 백업한 지 '+Math.floor((Date.now()-last)/DAY)+'일 지남':'⚠ 백업 안 됨';bk.title='눌러서 문서 목록에서 JSON으로 내보내거나 드라이브에 저장하세요'}
setInterval(updateBackup,30000);document.addEventListener('input',()=>setTimeout(updateBackup,1000),true);
(function(){const sv=window.save;/* save 는 const 라서 교체할 수 없으므로 입력 이벤트로 주기 점검 */
 let lastSave=0;document.addEventListener('input',()=>{if(Date.now()-lastSave>20000){lastSave=Date.now();setTimeout(()=>{try{snapMaybe()}catch(e){}},1500)}},true)})();

/* ================= 학기 전환 복제 ================= */
const sc=makeModal('scm','다음 학기용으로 복제','지난 학기 문서를 복제하면서 학기와 월을 바꿉니다.',560);
let scId=null;
function shiftMonths(s,d){return String(s==null?'':s).replace(/(\d{1,2})월/g,(m,n)=>{n=+n;if(n<1||n>12)return m;let x=n+d;if(x>12)x-=12;if(x<1)x+=12;return x+'월'})}
window.openSemesterCopy=function(id){const r=id?DB.list.find(d=>d.id===id):curRec;if(!r)return;scId=r.id;if(r===curRec)save();
 const b=sc.querySelector('.xbody');
 b.innerHTML='<div class="note">원본 문서 <b>'+esc(r.name)+'</b>은(는) 그대로 두고, 아래 설정으로 새 문서를 만듭니다. 입력한 내용(단원, 성취기준, 평가 계획 등)은 모두 복사됩니다.</div>'+
 '<label class="row" style="cursor:pointer"><span><b>1학기 → 2학기</b><small>제목의 "1학기"→"2학기", 시기 월 +5 (3~7월 → 8~12월)</small></span><input type="radio" name="scdir" value="up" checked></label>'+
 '<label class="row" style="cursor:pointer"><span><b>2학기 → 다음 학년도 1학기</b><small>제목의 "2학기"→"1학기", 학년도 +1, 시기 월 −5 (8~12월 → 3~7월)</small></span><input type="radio" name="scdir" value="down"></label>'+
 '<label class="row" style="cursor:pointer"><span><b>평가 시기 칸도 월 이동</b><small>"4월", "7월" 같은 표기를 같은 만큼 바꿉니다</small></span><input type="checkbox" id="scTime" checked></label>'+
 '<label class="row" style="cursor:pointer"><span><b>시수 입력 지우기</b><small>시기별 시수/누계를 비웁니다(학기마다 다르므로 새로 입력)</small></span><input type="checkbox" id="scHours"></label>'+
 '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button type="button" class="b" data-close>취소</button><button type="button" class="b pri" id="scGo">복제하기</button></div>';
 $('scGo').onclick=()=>{const src=DB.list.find(d=>d.id===scId);if(!src)return;const dir=sc.querySelector('input[name=scdir]:checked').value;const up=dir==='up';
  const data=JSON.parse(JSON.stringify(src.data));const v=data.vals;const d=up?5:-5;
  if(typeof v.title==='string')v.title=up?v.title.replace('1학기','2학기'):v.title.replace('2학기','1학기').replace(/(\d{4})학년도/,(m,y)=>(+y+1)+'학년도');
  else v.title=up?'2026학년도 2학기 교수학습평가계획서':'2027학년도 1학기 교수학습평가계획서';
  (data.periods||[]).forEach(id=>{const k='p'+id+'.month';if(v[k]!=null)v[k]=shiftMonths(v[k],d);if($('scHours').checked){delete v['p'+id+'.hours']}});
  if($('scTime').checked){Object.keys(v).forEach(k=>{if(/^t3\.(tm|tf)$/.test(k)||/^c\d+\.time$/.test(k))v[k]=shiftMonths(v[k],d)})}
  let nm=src.name;nm=up?(/1학기/.test(nm)?nm.replace('1학기','2학기'):/-1\b|·\s*1\b/.test(nm)?nm.replace(/-1\b/,'-2'):nm+' (2학기)'):(/2학기/.test(nm)?nm.replace('2학기','1학기'):nm+' (다음 학년도 1학기)');
  if(nm===src.name)nm+=' (복제)';
  const rec={id:uidDoc(),name:nm.slice(0,80),updated:Date.now(),data};DB.list.unshift(rec);persist();sc.hidden=true;if($('dm'))$('dm').hidden=true;openDoc(rec.id)};
 sc.hidden=false};

/* ================= 예시 불러오기 ================= */
function sampleData(){
 const s=fresh();const v=s.vals;const L=a=>a.join('\n');
 v['info.subj']='사회과';v['info.grade']='1';v['info.name']='한국사1';v['info.credit']='3';
 const per=[
  {m:'3월\n1주~\n4주',h:12,u:L(['1. 고려의 통치 체제와 정치 변동','2. 고려의 국제관계와 대외교류','3. 조선 사회의 성립과 발전']),c:L(['고려의 통치체제를 이해하고 설명할 수 있다.','고려의 국제질서의 변화와 대외관계를 파악하고 설명할 수 있다.','공민왕의 개혁과 신진사대부의 성장을 이해하고 설명할 수 있다.','고려의 신분구조와 생활모습을 파악하고 설명할 수 있다.','고려의 다양한 종교와 사상을 이해하고 설명할 수 있다.','조선의 건국과 통치체제 정비를 이해하고 설명할 수 있다.'])},
  {m:'4월\n1주~\n4주',h:9,u:'4. 조선 후기의 새로운 흐름',c:L(['조선의 대외관계와 전쟁을 파악하고 설명할 수 있다.','조선 후기 정치와 세계관의 변화를 이해하고 설명할 수 있다.'])},
  {m:'5월\n1주~\n4주',h:12,u:L(['5. 조선후기 신분제와 사회구조','6. 국제질서의 변동과 개항']),c:L(['조선의 신분제와 향촌 지배체제를 이해하고 설명할 수 있다.','상품화폐 경제의 발달을 파악하고 설명할 수 있다.','신분제 변동과 조세제도의 개편을 이해하고 설명할 수 있다.','서양열강의 동아시아 침략을 이해하고 설명할 수 있다.','흥선대원군의 집권과 내정개혁을 파악하고 설명할 수 있다.','개화정책의 추진과 반발을 파악하고 설명할 수 있다.'])},
  {m:'6월\n1주~\n4주',h:12,u:L(['7. 근대국가 수립을 위한 노력','8. 사회 경제 변화와 문화 변동']),c:L(['동학농민 운동의 전개를 이해하고 설명할 수 있다.','갑오개혁의 추진을 설명할 수 있다.','대한제국의 수립과 독립협회의 활동을 파악하고 설명할 수 있다.','대한제국의 개혁정책을 이해하고 설명할 수 있다.','일본의 국권침탈을 파악하고 설명할 수 있다.','항일 의병 투쟁의 전개를 이해하고 설명할 수 있다.'])},
  {m:'7월\n1주',h:3,u:'9. 국권 침탈과 국권 수호 운동',c:L(['개항장 설치와 경제침략을 이해하고 설명할 수 있다.','경제 구국운동의 전개를 파악하고 설명할 수 있다.','근대교육과 근대의식의 확대를 이해하고 설명할 수 있다.','근대문물과 문화의 수용과 형성을 파악하고 설명할 수 있다.'])}];
 s.periods.forEach((id,i)=>{const p=per[i];v[`p${id}.month`]=p.m;v[`p${id}.hours`]=String(p.h);v[`p${id}.unit`]=p.u;v[`p${id}.crit`]=p.c;
  v[`p${id}.s.강의식`]=true;v[`p${id}.e.서·논술`]=true;v[`p${id}.e.교사 관찰 및 기록`]=true;
  if(i>0){v[`p${id}.s.etc`]=true;v[`p${id}.s.etc.t`]='주제 발표'}
  v[`p${id}.note`]=['수업 시간의 관찰·기록과 서술형 평가를 연계하여 개념 이해 정도를 확인한다.','수업 중 발표(주제 발표)와 서술형 평가를 연계해 근거를 들어 설명하는 능력을 확인한다.','학습한 개념을 사료와 연결하는 과정을 관찰하고 서술형 평가로 확인한다.','사건의 원인과 결과를 연결해 서술하는 능력을 평가한다.','근대 문화 변동을 종합해 설명하는 능력을 평가한다.'][i];});
 v['goal']=L(['가. 중학교 역사에 대한 이해를 바탕으로 한국의 역사에 대한 체계적이고 심화한 이해 능력을 평가한다.','나. 한국의 고려시대부터 3.1운동 직전까지의 전근대, 근대사를 파악하여 현재 한국 사회의 역사적 토대와 영향을 심층적으로 이해하고 있는지를 평가한다.','다. 역사적 사실에 대한 지식을 바탕으로 비판적 사고력과 합리적 판단력을 키워 나와 다른 삶의 방식을 존중하고 역사적 주체로서 현대 한국 사회의 발전에 참여하는 민주 시민으로서의 역량을 기르도록 한다.']);
 v['t3.reg']='60';v['t3.ms']='40';v['t3.mn']='60';v['t3.fs']='40';v['t3.fn']='60';v['t3.tm']='4월';v['t3.tf']='7월';
 const [c1,c2]=s.pcols;v[`c${c1}.name`]='독서\n글쓰기';v[`c${c2}.name`]='역사\n글쓰기';v[`c${c1}.time`]='5월';v[`c${c2}.time`]='7월';v[`c${c1}.pt`]='50';v[`c${c2}.pt`]='50';
 v['b.mid']=per.slice(0,3).map(p=>p.c).join('\n');v['b.fin']=per.slice(3).map(p=>p.c).join('\n');
 v['b.c'+c1]=L(['이순신 평전을 읽고, 주요 내용에 대한 교사의 질문에 대해 글쓰기를 할 수 있다.','이순신이라는 인물에 대한 역사적 평가에서 저자의 관점 외에 학생의 관점이 잘 드러나 있다.']);
 v['b.c'+c2]='1학기 범위인 전근대사 및 근대사 부분에서 가장 큰 영향을 발휘했다고 생각하는 역사인물(한명 또는 두명 또는 라이벌 등)을 선정하여, 역사인물의 업적을 서술하고, 인물을 선정한 이유에 대하여 합리적, 비판적, 입체적으로 탐구하고 설명할 수 있다.';
 v['s5.A']=L(['고려시대 왕권 강화와 중앙집권 과정을 제도의 변화를 중심으로 설명할 수 있다.','고려 대외 관계의 다원성을 외부적 요인과 내부적 요인으로 설명할 수 있다.','조선의 건국과 통치 체제 정비를 이해하고 설명할 수 있다.','조선의 대외관계와 전쟁을 파악하고 설명할 수 있다.','조선후기 동학농민운동과 갑오개혁에 대해 설명할 수 있다.']);
 v['s5.B']=L(['고려시대 왕권 강화와 중앙집권 과정을 제도의 변화를 중심으로 설명할 수 있다.','조선의 건국과 통치 체제 정비를 이해하고 설명할 수 있다.','조선의 대외관계와 전쟁을 파악하고 설명할 수 있다.']);
 v['s5.C']=L(['고려시대 왕권 강화와 중앙집권 과정을 제도의 변화를 중심으로 설명할 수 있다.','조선의 건국과 통치 체제 정비를 이해하고 설명할 수 있다.']);
 v['s5.D']=L(['고려 대외 관계의 다원성을 외부적 요인과 내부적 요인으로 설명할 수 있다.','조선의 건국과 통치 체제 정비를 이해하고 설명할 수 있다.']);
 v['s5.E']='고려시대 주요 왕의 업적의 특징을 설명할 수 있다.';v['s5.min']='고려시대, 조선시대 주요 사건에 대해 설명할 수 있다.';
 const rp=[['고려시대 주요 역사 사건, 개념 정리','대면강의'],['조선시대 주요 역사 사건, 개념 정리','대면강의'],['고려 전기 정치 제도','EBS온라인 컨텐츠'],['고려 무신집권기','EBS온라인 컨텐츠'],['고려 후기 몽골의 간섭과 공민왕의 개혁 정치','EBS온라인 컨텐츠'],['고려 시대 대외 관계(송, 거란, 여진, 몽골)','EBS온라인 컨텐츠'],['고려~조선시대 정치 계보도 그리기','과제'],['고려~조선시대 정치, 경제(수취) 도표 그리기','과제'],['개항 이후 근대화 운동','EBS온라인 컨텐츠']];
 rp.forEach((r,i)=>{v['rp'+i+'.a']=r[0];v['rp'+i+'.b']=r[1]});
 /* 6번: 두 표를 예시 구조로 다시 구성 */
 const build=(pid,area,checks,cur,grades,groups)=>{const ps=s.perfS[pid];ps.groups=[];ps.lines={};ps.grades=[];
  v[`f${pid}.area`]=area;checks.forEach(c=>v[`f${pid}.m.${c}`]=true);v[`f${pid}.cur`]=cur;
  grades.forEach(g=>{const id=++s.uid;ps.grades.push(id);v['g'+id+'.l']=g[0];v['g'+id+'.t']=g[1]});
  groups.forEach(gr=>{const gid=++s.uid;ps.groups.push(gid);ps.lines[gid]=[];v['e'+gid+'.name']=gr[0];gr[1].forEach(ln=>{const lid=++s.uid;ps.lines[gid].push(lid);v['l'+lid+'.t']=ln[0];v['l'+lid+'.s']=String(ln[1])})})};
 build(s.perfs[0],'독서 글쓰기',['서·논술','관찰·기록','학생 작품 평가'],'조선시대 이순신 평전을 읽고 중요 내용에 대해 쓸 수 있다.',
  [['상','이순신 평전에 기술되어 있는 이순신 삶의 전과정과 주요 업적에 대해 충분히 파악하고, 교사의 질문에 정확하게 서술할 수 있다.'],['중','이순신 평전에 기술된 이순신의 삶과 주요 업적에 대해 정확하게 서술할 수 있다.'],['하','이순신 평전에 기술된 이순신의 업적에 대해 개별적인 서술을 할 수 있다.']],
  [['서술의 정확성',[['이순신 평전에 기술되어 있는 내용 중 교사의 질문에 대해 100%~80% 내용을 서술한다.',30],['이순신 평전에 기술되어 있는 내용 중 교사의 질문에 대해 60%~79% 서술한다.',20],['이순신 평전에 기술되어 있는 내용 중 교사의 질문에 대해 0%~59% 서술한다.',12]]],['서술의 관점',[['이순신 평전을 읽고 저자의 관점과 자신의 관점을 합리적으로 서술한다.',20],['이순신 평전을 읽고 저자의 관점을 합리적으로 서술한다.',15],['이순신 평전을 읽고 자신의 관점만 서술한다.',8]]]]);
 build(s.perfs[1],'역사인물탐구',['서·논술','관찰·기록','학생 작품 평가'],'1학기 범위인 전근대사 및 근대사 부분에서 가장 큰 영향을 발휘했다고 생각하는 역사인물을 선정하여, 업적을 서술하고, 선정한 이유에 대하여 합리적, 비판적, 입체적으로 탐구하고 설명할 수 있다.',
  [['상','학생 스스로 역사적 중요성을 띈 인물을 자신만의 기준에 의하여 선정하고, 그의 업적을 잘 서술하고, 선정한 이유에 대하여 합리적, 비판적, 입체적으로 탐구하고 설명할 수 있다.'],['중','학생 스스로 역사적 중요성을 띈 인물을 자신만의 기준에 의하여 선정하고, 그의 업적을 잘 서술하고, 선정한 이유에 대하여 합리적으로 탐구하고 설명할 수 있다.'],['하','학생 스스로 역사적 중요성을 띈 인물을 자신만의 기준에 의하여 선정하고, 선정한 이유에 대하여 설명할 수 있다.']],
  [['탐구의 분량',[['탐구의 분량이 교사가 제시하는 기준을 100% 충족한다.',20],['탐구의 분량이 교사가 제시하는 기준에 70% 충족한다.',15],['탐구의 분량이 교사가 제시하는 기준에 50% 충족한다.',8]]],['인물의 선정기준',[['인물의 선정기준이 명확하고 합리적이고 참신한 기준이 충분히 제시되었다.',20],['인물의 선정기준이 명확하고 합리적인 기준이 다소 충분히 제시되었다.',15],['인물의 선정기준이 미흡하게 제시되었다.',8]]],['인물의 업적평가',[['인물의 업적이 3가지 이상 충분하게 잘 제시되고 평가되었다.',10],['인물의 업적이 2가지 이상 잘 제시되고 평가되었다.',8],['인물의 업적이 1가지 정도만 제시되고 평가되었다.',4]]]]);
 return s}
window.loadSample=function(){const rec={id:uidDoc(),name:'예시: 한국사1 (1학기)',updated:Date.now(),data:sampleData()};DB.list.unshift(rec);persist();openDoc(rec.id);setTimeout(()=>{try{toastX('예시 문서를 열었습니다. 내용을 고쳐서 연습해 보세요. (원할 때 문서 목록에서 삭제)')}catch(e){}},300)};
function toastX(msg){let t=document.getElementById('xtoast');if(!t){t=document.createElement('div');t.id='xtoast';t.className='xtoast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(window.__tx);window.__tx=setTimeout(()=>t.classList.remove('show'),4500)}

/* ================= 안내(3단계) · 도움말 ================= */
const om=makeModal('obm','처음이신가요? 3단계로 끝납니다','교수학습평가계획서 작성 · 점검 · 제출',600);
om.querySelector('.xbody').innerHTML='<div class="ob-step"><div class="ob-n">1</div><div><b>작성</b><p>위에서부터 기본 정보, 시기별 블록, 평가 비율을 채웁니다. 칸에서 <b>Enter</b>를 누르면 ■ 줄이나 번호가 자동으로 이어집니다. 왼쪽 <b>목차</b>의 ●/◐/○ 표시로 어디가 비었는지 볼 수 있고, 입력 내용은 자동 저장됩니다.</p></div></div>'+
 '<div class="ob-step"><div class="ob-n">2</div><div><b>점검</b><p><b>제출 ▾ → 점검하기</b>에서 빠진 곳과 숫자 오류(영역 만점 100점, 시수 누계, 논·서술형 30% 등)를 확인합니다. 항목을 누르면 그 칸으로 이동합니다.</p></div></div>'+
 '<div class="ob-step"><div class="ob-n">3</div><div><b>제출</b><p><b>제출 ▾ → 제출하기</b>에서 이름과 비밀 코드를 넣고 제출합니다. <b>제출 현황</b>에서 내가 낸 파일을 다시 볼 수 있고, <b>내보내기</b>로 PDF·워드·한글 파일도 받을 수 있습니다.</p></div></div>'+
 '<div class="note"><b>단축키</b> Ctrl+S 저장 · Esc 창 닫기 · Tab 이동 · 위쪽 <b>가+ / 가−</b>로 화면 크기 조절 · 화면이 이상하면 Ctrl+F5</div>'+
 '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap"><label style="font-size:13px"><input type="checkbox" id="obskip"> 다시 보지 않기</label><div style="display:flex;gap:8px"><button type="button" class="b" id="obsample">예시 문서 열어 보기</button><button type="button" class="b pri" data-close>시작하기</button></div></div>';
window.openHelp=function(){om.hidden=false};
$('obsample').onclick=()=>{om.hidden=true;loadSample()};
new MutationObserver(()=>{if(om.hidden&&$('obskip')&&$('obskip').checked)try{localStorage.setItem('plan2026-onboard','1')}catch(e){}}).observe(om,{attributes:true,attributeFilter:['hidden']});
try{if(!localStorage.getItem('plan2026-onboard')){setTimeout(()=>{om.hidden=false;try{localStorage.setItem('plan2026-onboard','seen')}catch(e){}},700)}}catch(e){}

/* ================= 접근성: 화면 크기, 모달 포커스 ================= */
window.__zp=1;try{window.__zp=Math.min(1.6,Math.max(.6,parseFloat(localStorage.getItem('plan2026-zoom'))||1))}catch(e){}
function setZoom(z){window.__zp=Math.min(1.6,Math.max(.6,Math.round(z*100)/100));try{localStorage.setItem('plan2026-zoom',String(window.__zp))}catch(e){}if(typeof fit==='function')fit();if(typeof schedBreaks==='function')schedBreaks();const zl=$('zlabel');if(zl)zl.textContent=Math.round(window.__zp*100)+'%'}
window.zoomIn=()=>setZoom(window.__zp+.1);window.zoomOut=()=>setZoom(window.__zp-.1);window.zoomReset=()=>setZoom(1);
setTimeout(()=>setZoom(window.__zp),0);
/* 모달: 열릴 때 첫 입력에 포커스, 닫히면 원래 위치로, Tab 가두기 */
const opener=new WeakMap();
function watchModal(m){if(m.__w)return;m.__w=1;if(!m.getAttribute('role')){m.setAttribute('role','dialog');m.setAttribute('aria-modal','true')}
 new MutationObserver(()=>{if(!m.hidden){opener.set(m,document.activeElement);setTimeout(()=>{const f=m.querySelector('input:not([type=hidden]):not([readonly]),select,textarea,button:not([data-close])')||m.querySelector('button');f&&f.focus({preventScroll:true})},60)}
  else{const o=opener.get(m);if(o&&o.focus&&document.contains(o))try{o.focus({preventScroll:true})}catch(e){}}}).observe(m,{attributes:true,attributeFilter:['hidden']});
 m.addEventListener('keydown',e=>{if(e.key!=='Tab'||m.hidden)return;const f=[...m.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}})}
document.querySelectorAll('.modal').forEach(watchModal);
new MutationObserver(ms=>ms.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1&&n.classList&&n.classList.contains('modal'))watchModal(n)}))).observe(document.body,{childList:true});
/* 상태 문구 읽어 주기 */
['saved','gchip'].forEach(id=>{const e=$(id);if(e){e.setAttribute('aria-live','polite')}});
const dn=$('docname');if(dn)dn.setAttribute('aria-label','문서 이름');
document.querySelectorAll('.seg').forEach(s=>s.setAttribute('role','group'));

/* ================= 붙여넣기: 여러 줄 → ■ 줄 / 번호 줄 ================= */
const GA2='가나다라마바사아자차카타파하';
document.addEventListener('paste',e=>{const el=e.target.closest&&e.target.closest('.ls');if(!el)return;
 let t=(e.clipboardData||window.clipboardData).getData('text/plain');if(t==null)return;
 e.preventDefault();e.stopImmediatePropagation();
 let lines=t.replace(/\r/g,'').split('\n').map(l=>l.replace(/\t+/g,' ').replace(/\s+$/g,'').replace(/^\s+/,'')).filter(l=>l.length);
 if(!lines.length)return;
 const numMode=el.dataset.num;const marked=el.classList.contains('m1')||el.classList.contains('m2');
 if(marked||numMode)lines=lines.map(l=>l.replace(/^[■▪□●○◦•·ㅇ※\-–—*]+\s*/,'')).filter(l=>l.length);
 if(numMode)lines=lines.map(l=>l.replace(/^(\(\d+\)|\d+[.)]|[가-힣]\.)\s*/,''));
 const cnt=()=>[...el.children].filter(c=>c.tagName==='DIV').length;
 const pre=()=>numMode==='ga'?(GA2[cnt()-1]||'')+'. ':numMode?cnt()+'. ':'';
 /* 현재 줄(캐럿이 있는 줄)과 캐럿이 줄 끝인지 확인 */
 const sel=getSelection();let n=sel&&sel.anchorNode,off=sel?sel.anchorOffset:0,atEnd=true;
 if(n===el){n=el.children[Math.max(0,Math.min(off,el.children.length)-1)]||el.lastElementChild}
 else{atEnd=off>=((n&&n.textContent)||'').length;while(n&&n.parentNode!==el)n=n.parentNode}
 const cur=n?n.textContent:'';const curEmpty=!txt(cur);
 /* 내용이 있는 줄의 끝에서 붙이면 새 줄에서 시작한다 */
 let startNew=!curEmpty&&atEnd;
 lines.forEach((l,i)=>{
  if(i>0||startNew){document.execCommand('insertParagraph');const p=pre();if(p)document.execCommand('insertText',false,p)}
  else if(numMode&&curEmpty&&!/^\s*(\d+\.|[가-힣]\.)/.test(cur)){const p=pre();if(p)document.execCommand('insertText',false,p)}
  document.execCommand('insertText',false,l)})},true);

/* Esc: 가장 위에 열린 창 닫기 */
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).pop();if(o)o.hidden=true}});

/* ================= 초기 반영 ================= */
setTimeout(()=>{updateProgress();updateBackup()},800);
})();
