/* 내보내기: PDF / MS 워드(.docx) / 한글(.hwpx) / Google 문서
   화면(#doc)을 인쇄 상태(body.pm)로 읽어 문단·표 모델로 만든 뒤 각 형식으로 변환합니다. */
(function(){
'use strict';
const LIBS={jszip:'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
 h2c:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 pdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
 hwpx:'hwpx-header.js'};
const loaded={};
function loadScript(k){if(loaded[k])return loaded[k];loaded[k]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=LIBS[k];s.onload=res;s.onerror=()=>{loaded[k]=null;rej(new Error('필요한 파일을 불러오지 못했습니다(인터넷 연결 확인): '+LIBS[k]))};document.head.appendChild(s)});return loaded[k]}
const TEXT_W_PX=170/25.4*96; // 인쇄 본문 폭(170mm)
let busy=false,toastT=null;
function toast(msg,keep){let t=document.getElementById('xtoast');if(!t){t=document.createElement('div');t.id='xtoast';t.className='xtoast';document.body.appendChild(t)}
 t.textContent=msg;t.classList.add('show');clearTimeout(toastT);if(!keep)toastT=setTimeout(()=>t.classList.remove('show'),3800)}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const safeName=()=>(curRec&&curRec.name||'교수학습평가계획서').replace(/[\\/:*?"<>|]/g,'_');
const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const hdrText=()=>String(V.hdr!==undefined?V.hdr:HDR0);

/* ========== 1. 화면 → 모델 ========== */
function hex(c){const m=String(c).match(/[\d.]+/g);if(!m||m.length<3)return '000000';return m.slice(0,3).map(v=>Math.round(+v).toString(16).padStart(2,'0')).join('').toUpperCase()}
function runOf(t,el){const cs=getComputedStyle(el);let u=false,a=el;
 for(let i=0;i<8&&a&&a!==document.body;i++){const c=getComputedStyle(a);if((c.textDecorationLine||'').includes('underline')){u=true;break}if(!/^inline/.test(c.display))break;a=a.parentElement}
 return {t,sz:(parseFloat(cs.fontSize)||13)*0.75,b:parseInt(cs.fontWeight)>=600,i:cs.fontStyle==='italic',u,c:hex(cs.color)}}
function newPara(el){const cs=getComputedStyle(el);const fs=parseFloat(cs.fontSize)||13;let lh=parseFloat(cs.lineHeight);const ratio=isNaN(lh)?1.3:lh/fs;const ti=parseFloat(cs.textIndent)||0;
 return {type:'p',runs:[],align:({center:'center',right:'right',end:'right',justify:'justify'})[cs.textAlign]||'left',
  left:(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.marginLeft)||0),hang:ti<0?-ti:0,first:ti>0?ti:0,before:0,after:0,line:Math.min(2.4,Math.max(1,ratio))}}
function trimP(p){const r=p.runs;while(r.length&&!r[0].t.replace(/\s/g,'')&&r[0].t!=='\t')r.shift();while(r.length&&!r[r.length-1].t.replace(/\s/g,'')&&r[r.length-1].t!=='\t')r.pop();
 if(r.length){r[0].t=r[0].t.replace(/^\s+/,'');r[r.length-1].t=r[r.length-1].t.replace(/\s+$/,'')}}
const SKIP='button,.noprint,.pgl,script,style,.hdr';
const isHidden=(n,cs)=>cs.display==='none'||cs.visibility==='hidden'||n.matches(SKIP);
function addInline(node,p){
 if(node.nodeType===3){const t=node.nodeValue.replace(/[\s ]+/g,' ');if(t)p.runs.push(runOf(t,node.parentElement));return}
 if(node.nodeType!==1)return;const cs=getComputedStyle(node);if(isHidden(node,cs))return;
 if(node.tagName==='INPUT'){if(node.type==='checkbox'){p.runs.push(Object.assign(runOf('',node),{t:node.checked?'■':'□'}))}else if(node.value)p.runs.push(runOf(node.value,node));return}
 if(node.classList.contains('ls')){const lines=lsLines(node);lines.forEach((l,i)=>{if(i)p.runs.push(runOf(' ',node));p.runs.push(runOf(l,node))});return}
 node.childNodes.forEach(c=>addInline(c,p))}
function lsLines(ls){const kids=[...ls.children].filter(c=>c.tagName==='DIV');return kids.length?kids.map(k=>k.textContent):[ls.textContent]}
function lsParas(ls){const out=[];const mark=ls.classList.contains('m1')?'■':ls.classList.contains('m2')?'▪':'';
 const kids=[...ls.children].filter(c=>c.tagName==='DIV');(kids.length?kids:[ls]).forEach(k=>{const t=k.textContent.replace(/ /g,' ');if(!t.trim())return;
  const p=newPara(k);if(mark){p.left=Math.max(p.left,11);p.hang=11;p.runs.push(Object.assign(runOf(mark,k),{t:mark+'\t',sz:mark==='■'?6:10}))}
  p.runs.push(runOf(t,k));out.push(p)});return out}
function listParas(lst){const out=[];lst.querySelectorAll(':scope>.it').forEach(it=>{const p=newPara(it);const lab=it.querySelector('.lab'),tx=it.querySelector('.tx');
 const labT=lab&&getComputedStyle(lab).display!=='none'?lab.textContent.trim():'';
 const lw=lab?(parseFloat(getComputedStyle(lab).width)||26):0;
 if(labT){p.hang=lw;p.left+=lw;p.runs.push(Object.assign(runOf(labT+'\t',it),{}))}
 if(tx)tx.childNodes.forEach(c=>addInline(c,p));trimP(p);if(p.runs.length)out.push(p)});return out}
function lines(items){const s=items.map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left);const g=[];
 s.forEach(it=>{const x=g.find(q=>Math.min(q.b,it.r.bottom)-Math.max(q.t,it.r.top)>Math.min(q.b-q.t,it.r.height)*0.4);if(x){x.items.push(it);x.t=Math.min(x.t,it.r.top);x.b=Math.max(x.b,it.r.bottom)}else g.push({t:it.r.top,b:it.r.bottom,items:[it]})});
 g.forEach(q=>q.items.sort((a,b)=>a.r.left-b.r.left));return g}
function flexParas(n){const kids=[...n.children].filter(c=>{const cs=getComputedStyle(c);return !isHidden(c,cs)});
 if(!kids.length)return parasOf(n.childNodes,n);
 const jc=getComputedStyle(n).justifyContent;const sep=n.matches('.g,.ck')?'    ':n.matches('.hs,.pc,.tg,.sc>div,.row,.tl')?'':' ';
 const out=[];lines(kids).forEach(g=>{
  if(g.items.length===1&&!/^inline/.test(getComputedStyle(g.items[0].el).display)){const sub=parasOf([g.items[0].el],n);if(jc==='center')sub.forEach(x=>{if(x.type==='p')x.align='center'});out.push(...sub);return}
  const p=newPara(n);if(jc==='center')p.align='center';
  g.items.forEach((it,i)=>{if(i&&sep)p.runs.push(runOf(sep,n));addInline(it.el,p)});trimP(p);if(p.runs.length)out.push(p)});return out}
function parasOf(nodes,styleEl){
 const out=[];let cur=null;const flush=()=>{if(cur){trimP(cur);if(cur.runs.length)out.push(cur);cur=null}};const get=()=>cur||(cur=newPara(styleEl));
 for(const n of nodes){
  if(n.nodeType===3){const t=n.nodeValue.replace(/[\s ]+/g,' ');if(t.trim()||cur)get().runs.push(runOf(t,styleEl));continue}
  if(n.nodeType!==1)continue;const cs=getComputedStyle(n);if(isHidden(n,cs))continue;const tag=n.tagName;
  if(tag==='BR'){flush();continue}
  if((/^inline/.test(cs.display)||tag==='INPUT')&&tag!=='TABLE'&&!n.matches('.ls,.lst,.m,.gr')){addInline(n,get());continue}
  flush();
  if(tag==='TABLE'){out.push(tableModel(n));continue}
  if(n.classList.contains('lst')){out.push(...listParas(n));continue}
  if(n.classList.contains('ls')){out.push(...lsParas(n));continue}
  if(n.classList.contains('m')){const lab=n.querySelector('.lab'),bx=n.querySelector('.bx');if(lab)out.push(...parasOf([lab],n));if(bx)out.push(boxTable(bx));continue}
  if(n.classList.contains('gr')){out.push(gridTable(n));continue}
  if(n.classList.contains('sep')){const p=newPara(n);p.runs.push({t:' ',sz:3,b:false,i:false,u:false,c:'000000'});out.push(p);continue}
  const sub=(cs.display.includes('flex')||cs.display.includes('grid'))?flexParas(n):parasOf(n.childNodes,n);
  if(sub.length){const mt=(parseFloat(cs.marginTop)||0),mb=(parseFloat(cs.marginBottom)||0);if(sub[0].type==='p')sub[0].before+=mt;if(sub[sub.length-1].type==='p')sub[sub.length-1].after+=mb;out.push(...sub)}}
 flush();return out}
const cluster=a=>{a=a.slice().sort((x,y)=>x-y);const o=[];a.forEach(v=>{if(!o.length||v-o[o.length-1]>1.5)o.push(v)});return o};
const near=(arr,v)=>{let b=0,d=1e9;arr.forEach((x,i)=>{const e=Math.abs(x-v);if(e<d){d=e;b=i}});return b};
function bdOf(cs,S){const w=parseFloat(cs['border'+S+'Width'])||0,st=cs['border'+S+'Style'];if(!w||st==='none'||st==='hidden')return null;return {st,w,c:hex(cs['border'+S+'Color'])}}
const wider=(a,b)=>!a?b:!b?a:(b.w>a.w?b:a);
/* 인접한 칸의 선은 CSS(border-collapse)와 같은 규칙으로 하나로 정한다: 굵은 선 > 종류(이중>실선>점선) */
const bcls=w=>w<=1.5?1:w<=2.5?2:w<=3.5?3:4;
const bprio={double:4,solid:3,dashed:2,dotted:1};
const bwin=(a,b)=>{if(!a)return b;if(!b)return a;const wa=bcls(a.w),wb=bcls(b.w);if(wa!==wb)return wb>wa?b:a;return (bprio[b.st]||0)>(bprio[a.st]||0)?b:a};
function resolveBorders(rows,nR,nC,tb){
 const grid=Array.from({length:nR},()=>Array(nC).fill(null));
 rows.forEach((r,ri)=>r.cells.forEach(c=>{c.row=ri;c.o=Object.assign({},c.b);for(let i=0;i<c.rspan&&ri+i<nR;i++)for(let k=0;k<c.span;k++)if(c.col+k<nC)grid[ri+i][c.col+k]=c}));
 rows.forEach((r,ri)=>r.cells.forEach(c=>{let t=null,b=null,l=null,rt=null;
  for(let k=0;k<c.span;k++){
   const above=c.row>0?grid[c.row-1][c.col+k]:null,below=c.row+c.rspan<nR?grid[c.row+c.rspan][c.col+k]:null;
   t=bwin(t,bwin(c.o.t,c.row===0?tb.t:(above&&above!==c?above.o.b:null)));
   b=bwin(b,bwin(c.o.b,c.row+c.rspan>=nR?tb.b:(below&&below!==c?below.o.t:null)))}
  for(let i=0;i<c.rspan&&c.row+i<nR;i++){
   const lf=c.col>0?grid[c.row+i][c.col-1]:null,rg=c.col+c.span<nC?grid[c.row+i][c.col+c.span]:null;
   l=bwin(l,bwin(c.o.l,c.col===0?tb.l:(lf&&lf!==c?lf.o.r:null)));
   rt=bwin(rt,bwin(c.o.r,c.col+c.span>=nC?tb.r:(rg&&rg!==c?rg.o.l:null)))}
  c.b={t,b,l,r:rt}}))}
function tableModel(t){const tr=t.getBoundingClientRect();const tcs=getComputedStyle(t);
 const cellsAll=[...t.rows].flatMap(r=>[...r.cells]);const xs=[];
 cellsAll.forEach(c=>{const r=c.getBoundingClientRect();xs.push(r.left-tr.left,r.right-tr.left)});
 const E=cluster(xs);const cols=[];for(let i=1;i<E.length;i++)cols.push(E[i]-E[i-1]);
 const nR=t.rows.length,tb={t:bdOf(tcs,'Top'),b:bdOf(tcs,'Bottom'),l:bdOf(tcs,'Left'),r:bdOf(tcs,'Right')};
 const rows=[...t.rows].map((row,ri)=>{const rr=row.getBoundingClientRect();
  const cells=[...row.cells].filter(c=>getComputedStyle(c).display!=='none').map(c=>{const r=c.getBoundingClientRect(),cs=getComputedStyle(c);
   const col=near(E,r.left-tr.left),end=near(E,r.right-tr.left),span=Math.max(1,end-col),rs=c.rowSpan||1;
   const b={t:bdOf(cs,'Top'),r:bdOf(cs,'Right'),b:bdOf(cs,'Bottom'),l:bdOf(cs,'Left')};
   if(ri===0)b.t=wider(b.t,tb.t);if(ri+rs>=nR)b.b=wider(b.b,tb.b);if(col===0)b.l=wider(b.l,tb.l);if(end>=E.length-1)b.r=wider(b.r,tb.r);
   let blocks=parasOf(c.childNodes,c);if(!blocks.length){const p=newPara(c);p.runs.push(Object.assign(runOf(' ',c),{t:' '}));blocks=[p]}
   return {col,span,rspan:rs,b,v:cs.verticalAlign==='top'||cs.verticalAlign==='baseline'?'top':'center',blocks,w:r.width}});
  return {h:rr.height,cells}});
 resolveBorders(rows,nR,cols.length,tb);
 return {type:'table',cols,rows}}
function boxTable(bx){const rs=[...bx.querySelectorAll(':scope>.r')];const br=bx.getBoundingClientRect();const k0=rs[0]&&rs[0].children[0].getBoundingClientRect();
 const kw=k0?k0.width:150,tot=br.width;const D={st:'dashed',w:1,c:'000000'};
 const rows=rs.map(r=>{const rr=r.getBoundingClientRect();const cells=[...r.children].map((c,i)=>{let blocks=parasOf(c.childNodes,c);if(c.classList.contains('k'))blocks.forEach(x=>{if(x.type==='p')x.align='center'});if(!blocks.length){const p=newPara(c);p.runs.push(Object.assign(runOf(' ',c),{t:' '}));blocks=[p]}
  return {col:i,span:1,rspan:1,b:{t:D,r:D,b:D,l:D},v:'center',blocks,w:0}});return {h:rr.height,cells}});
 return {type:'table',box:true,cols:[kw,Math.max(50,tot-kw)],rows}}
function gridTable(gr){const kids=[...gr.children].filter(c=>!isHidden(c,getComputedStyle(c)));const w=gr.getBoundingClientRect().width/2;const D={st:'dashed',w:1,c:'000000'};const rows=[];
 for(let i=0;i<kids.length;i+=2){const cells=[kids[i],kids[i+1]].map((c,j)=>{let blocks=c?parasOf(c.childNodes,c):[];if(!blocks.length){const p=newPara(gr);p.runs.push(Object.assign(runOf(' ',gr),{t:' '}));blocks=[p]}
  return {col:j,span:1,rspan:1,b:{t:D,r:D,b:D,l:D},v:'top',blocks,w}});rows.push({h:(kids[i]?kids[i].getBoundingClientRect().height:20),cells})}
 return {type:'table',box:true,cols:[w,w],rows}}
function buildModel(){const doc=document.getElementById('doc');return parasOf(doc.childNodes,doc)}

/* 인쇄와 같은 상태로 만들어 읽기 */
async function withPrintState(fn){const main=document.getElementById('main');const z=main.style.zoom;const wasPv=document.body.classList.contains('pv');
 main.style.zoom='';document.body.classList.add('pm');
 try{return await fn()}finally{document.body.classList.remove('pm');main.style.zoom=z;if(typeof schedBreaks==='function')schedBreaks()}}

/* ========== 2. DOCX ========== */
const tw=px=>Math.round(px*15);
function dxRun(r){const t=String(r.t);if(!t)return '';const pr='<w:rPr><w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/>'+(r.b?'<w:b/>':'')+(r.i?'<w:i/>':'')+(r.u?'<w:u w:val="single"/>':'')+(r.c&&r.c!=='000000'?'<w:color w:val="'+r.c+'"/>':'')+'<w:sz w:val="'+Math.max(2,Math.round(r.sz*2))+'"/><w:szCs w:val="'+Math.max(2,Math.round(r.sz*2))+'"/></w:rPr>';
 return t.split('\t').map((seg,i)=>(i?'<w:r>'+pr+'<w:tab/></w:r>':'')+(seg?'<w:r>'+pr+'<w:t xml:space="preserve">'+esc(seg)+'</w:t></w:r>':'')).join('')}
function dxPara(p,scale){scale=scale||1;const left=tw(p.left*scale),hang=tw(p.hang*scale),first=tw(p.first*scale);
 const ppr='<w:pPr><w:jc w:val="'+(p.align==='justify'?'both':p.align)+'"/>'+((left||hang||first)?'<w:ind w:left="'+left+'"'+(hang?' w:hanging="'+hang+'"':first?' w:firstLine="'+first+'"':'')+'/>':'')+'<w:spacing w:before="'+tw(p.before)+'" w:after="'+tw(p.after)+'" w:line="'+Math.round(p.line*240)+'" w:lineRule="auto"/></w:pPr>';
 return '<w:p>'+ppr+p.runs.map(dxRun).join('')+'</w:p>'}
const bstyle={solid:'single',dashed:'dashed',double:'double',dotted:'dotted'};
function dxBorders(b){return '<w:tcBorders>'+[['t','top'],['l','left'],['b','bottom'],['r','right']].map(([k,n])=>{const x=b[k];return x?'<w:'+n+' w:val="'+(bstyle[x.st]||'single')+'" w:sz="'+({1:4,2:12,3:18,4:24})[bcls(x.w)]+'" w:space="0" w:color="'+x.c+'"/>':'<w:'+n+' w:val="nil"/>'}).join('')+'</w:tcBorders>'}
function dxTable(tb){const sum=tb.cols.reduce((a,b)=>a+b,0);const f=sum>TEXT_W_PX?TEXT_W_PX/sum:1;const cols=tb.cols.map(w=>Math.max(60,tw(w*f)));const total=cols.reduce((a,b)=>a+b,0);
 const occ=tb.rows.map(()=>({}));const rowsXml=tb.rows.map((r,ri)=>{const ents=r.cells.map(c=>({c,col:c.col}));
  tb.rows.forEach((rr,rj)=>{if(rj<ri)rr.cells.forEach(c=>{if(rj+c.rspan>ri){for(let k=0;k<c.span;k++)occ[ri][c.col+k]=c}})});
  Object.keys(occ[ri]).forEach(k=>{const c=occ[ri][k];if(+k===c.col)ents.push({cont:c,col:c.col})});
  ents.sort((a,b)=>a.col-b.col);
  const cells=ents.map(e=>{const c=e.cont||e.c;const span=c.span;const w=cols.slice(c.col,c.col+span).reduce((a,b)=>a+b,0);
   const vm=c.rspan>1?(e.cont?'<w:vMerge/>':'<w:vMerge w:val="restart"/>'):'';
   const body=e.cont?'<w:p/>':c.blocks.map(b=>b.type==='table'?dxTable(b)+'<w:p/>':dxPara(b,f)).join('')||'<w:p/>';
   return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(span>1?'<w:gridSpan w:val="'+span+'"/>':'')+vm+dxBorders(c.b)+'<w:vAlign w:val="'+(c.v==='top'?'top':'center')+'"/></w:tcPr>'+body+'</w:tc>'}).join('');
  return '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="'+Math.max(200,tw(r.h*f))+'" w:hRule="atLeast"/></w:trPr>'+cells+'</w:tr>'}).join('');
 return '<w:tbl><w:tblPr><w:tblW w:w="'+total+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="15" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="15" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+cols.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+rowsXml+'</w:tbl>'}
const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
async function buildDocx(model){await loadScript('jszip');const Z=new JSZip();
 let body='';model.forEach((b,i)=>{if(b.type==='table'){body+=dxTable(b);if(!model[i+1]||model[i+1].type==='table')body+='<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>'}else body+=dxPara(b)});
 if(!body.endsWith('</w:p>'))body+='<w:p/>';
 const sect='<w:sectPr><w:headerReference w:type="default" r:id="rId10"/><w:footerReference w:type="default" r:id="rId11"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
 Z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
 Z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 Z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');
 Z.file('word/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>');
 Z.file('word/header1.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+NS+'><w:p><w:pPr><w:jc w:val="center"/></w:pPr>'+dxRun({t:hdrText(),sz:8.5,b:true,i:true,u:false,c:'FF0000'})+'</w:p></w:hdr>');
 Z.file('word/footer1.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+NS+'><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">- </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> -</w:t></w:r></w:p></w:ftr>');
 Z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+sect+'</w:body></w:document>');
 return Z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'})}

/* ========== 3. HWPX ========== */
const HU=75; // px → HWPUNIT
function hxCtx(){const chars=[],paras=[],bfs=[];const ck={},pk={},bk={};
 return {chars,paras,bfs,
  char(r){const k=[Math.round(r.sz*10),r.b?1:0,r.i?1:0,r.u?1:0,r.c].join('|');if(ck[k]==null){ck[k]=chars.length;chars.push(r)}return ck[k]},
  para(p){const k=[p.align,Math.round(p.left),Math.round(p.hang),Math.round(p.first),Math.round(p.before),Math.round(p.after),Math.round(p.line*20)].join('|');if(pk[k]==null){pk[k]=paras.length;paras.push(p)}return pk[k]},
  bf(b){const k=['t','r','b','l'].map(s=>b[s]?b[s].st+bcls(b[s].w)+b[s].c:'-').join('|');if(bk[k]==null){bk[k]=bfs.length;bfs.push(b)}return bk[k]}}}
const mmList=[0.1,0.12,0.15,0.2,0.25,0.3,0.4,0.5,0.6,0.7,1.0];
const hwMm=px=>({1:'0.25 mm',2:'0.5 mm',3:'0.7 mm',4:'1.0 mm'})[bcls(px)];
const hwType={solid:'SOLID',dashed:'DASH',double:'DOUBLE_SLIM',dotted:'DOT'};
function hxHeader(base,ctx,c0,p0,b0){let h=base;
 const cx=ctx.chars.map((r,i)=>'<hh:charPr id="'+(c0+i)+'" height="'+Math.max(100,Math.round(r.sz*100))+'" textColor="#'+r.c+'" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1"><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>'+(r.i?'<hh:italic/>':'')+(r.b?'<hh:bold/>':'')+'<hh:underline type="'+(r.u?'BOTTOM':'NONE')+'" shape="SOLID" color="#000000"/><hh:strikeout shape="3D" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>').join('');
 const px=ctx.paras.map((p,i)=>{const m=(l,v)=>'<hc:'+l+' value="'+v+'" unit="HWPUNIT"/>';const left=Math.round((p.left)*HU),intent=Math.round((p.first-p.hang)*HU);const mg='<hh:margin>'+m('intent',intent)+m('left',left)+m('right',0)+m('prev',Math.round(p.before*HU))+m('next',Math.round(p.after*HU))+'</hh:margin><hh:lineSpacing type="PERCENT" value="'+Math.round(p.line*100)+'" unit="HWPUNIT"/>';
  return '<hh:paraPr id="'+(p0+i)+'" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="0" suppressLineNumbers="0" checked="0"><hh:align horizontal="'+({left:'LEFT',center:'CENTER',right:'RIGHT',justify:'JUSTIFY'})[p.align]+'" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">'+mg+'</hp:case><hp:default>'+mg+'</hp:default></hp:switch><hh:border borderFillIDRef="1" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>'}).join('');
 const side=(n,x)=>'<hh:'+n+'Border type="'+(x?(hwType[x.st]||'SOLID'):'NONE')+'" width="'+(x?hwMm(x.w):'0.1 mm')+'" color="#'+(x?x.c:'000000')+'"/>';
 const bx=ctx.bfs.map((b,i)=>'<hh:borderFill id="'+(b0+i)+'" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>'+side('left',b.l)+side('right',b.r)+side('top',b.t)+side('bottom',b.b)+'<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/><hc:fillBrush><hc:winBrush faceColor="none" hatchColor="#FF000000" alpha="0"/></hc:fillBrush></hh:borderFill>').join('');
 h=h.replace('</hh:charProperties>',()=>cx+'</hh:charProperties>').replace(/<hh:charProperties itemCnt="\d+"/,()=>'<hh:charProperties itemCnt="'+(c0+ctx.chars.length)+'"');
 h=h.replace('</hh:paraProperties>',()=>px+'</hh:paraProperties>').replace(/<hh:paraProperties itemCnt="\d+"/,()=>'<hh:paraProperties itemCnt="'+(p0+ctx.paras.length)+'"');
 h=h.replace('</hh:borderFills>',()=>bx+'</hh:borderFills>').replace(/<hh:borderFills itemCnt="\d+"/,()=>'<hh:borderFills itemCnt="'+(b0+ctx.bfs.length)+'"');
 return h}
let hxTblId=1975000000;
function hxPara(p,ctx,w,cbase){const pid=ctx.para(p);let mx=10;
 const runs=p.runs.filter(r=>String(r.t).length).map(r=>{mx=Math.max(mx,r.sz);return '<hp:run charPrIDRef="'+(ctx.charBase+ctx.char(r))+'"><hp:t>'+esc(String(r.t).replace(/\t/g,'  '))+'</hp:t></hp:run>'}).join('');
 const empty=runs?'':'<hp:run charPrIDRef="'+(ctx.charBase+ctx.char({t:'',sz:10,b:false,i:false,u:false,c:'000000'}))+'"/>';
 const hh=Math.round(mx*100);
 return '<hp:p id="2147483648" paraPrIDRef="'+(ctx.paraBase+pid)+'" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'+runs+empty+'<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="'+hh+'" textheight="'+hh+'" baseline="'+Math.round(hh*0.85)+'" spacing="'+Math.round(hh*0.6)+'" horzpos="0" horzsize="'+Math.max(1000,Math.round(w))+'" flags="393216"/></hp:linesegarray></hp:p>'}
const UNI=(()=>{const L={st:'solid',w:1,c:'000000'};return {t:L,r:L,b:L,l:L}})();
function hxTable(tb,ctx){const sum=tb.cols.reduce((a,b)=>a+b,0);const f=sum>TEXT_W_PX?TEXT_W_PX/sum:1;const cols=tb.cols.map(w=>Math.max(300,Math.round(w*f*HU)));const total=cols.reduce((a,b)=>a+b,0);
 const rowH=tb.rows.map(r=>Math.max(400,Math.round(r.h*f*HU)));const totalH=rowH.reduce((a,b)=>a+b,0);
 const rows=tb.rows.map((r,ri)=>'<hp:tr>'+r.cells.map(c=>{const w=cols.slice(c.col,c.col+c.span).reduce((a,b)=>a+b,0);let h=0;for(let k=0;k<c.rspan&&ri+k<rowH.length;k++)h+=rowH[ri+k];
  const inner=c.blocks.map(b=>b.type==='table'?'<hp:p id="2147483648" paraPrIDRef="'+(ctx.paraBase+ctx.para(newFlat()))+'" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="'+ctx.charBase+'"><hp:t> </hp:t></hp:run><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="'+w+'" flags="393216"/></hp:linesegarray></hp:p>':hxPara(b,ctx,w-300)).join('');
  return '<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="'+(ctx.bfBase+ctx.bf(tb.box?c.b:UNI))+'"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="'+(c.v==='top'?'TOP':'CENTER')+'" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'+inner+'</hp:subList><hp:cellAddr colAddr="'+c.col+'" rowAddr="'+ri+'"/><hp:cellSpan colSpan="'+c.span+'" rowSpan="'+c.rspan+'"/><hp:cellSz width="'+w+'" height="'+h+'"/><hp:cellMargin left="100" right="100" top="30" bottom="30"/></hp:tc>'}).join('')+'</hp:tr>').join('');
 const id=++hxTblId;
 const tbl='<hp:tbl id="'+id+'" zOrder="'+(id-1975000000)+'" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="'+tb.rows.length+'" colCnt="'+cols.length+'" cellSpacing="0" borderFillIDRef="'+ctx.bfBase+'" noAdjust="0"><hp:sz width="'+total+'" widthRelTo="ABSOLUTE" height="'+totalH+'" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="100" right="100" top="30" bottom="30"/>'+rows+'</hp:tbl>';
 const flat=newFlat();return '<hp:p id="2147483648" paraPrIDRef="'+(ctx.paraBase+ctx.para(flat))+'" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="'+ctx.charBase+'">'+tbl+'</hp:run><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="'+totalH+'" textheight="'+totalH+'" baseline="'+Math.round(totalH*0.85)+'" spacing="0" horzpos="0" horzsize="'+total+'" flags="393216"/></hp:linesegarray></hp:p>'}
const newFlat=()=>({type:'p',runs:[],align:'left',left:0,hang:0,first:0,before:0,after:0,line:1});
async function buildHwpx(model){await loadScript('jszip');await loadScript('hwpx');
 const ctx=hxCtx();const base=window.HWPX_HEADER;
 const c0=+base.match(/<hh:charProperties itemCnt="(\d+)"/)[1],p0=+base.match(/<hh:paraProperties itemCnt="(\d+)"/)[1],b0=+base.match(/<hh:borderFills itemCnt="(\d+)"/)[1];
 ctx.charBase=c0;ctx.paraBase=p0;ctx.bfBase=b0;
 ctx.char({t:'',sz:10,b:false,i:false,u:false,c:'000000'}); // index 0 = 기본 글자
 ctx.bf({t:null,r:null,b:null,l:null});               // index 0 = 테두리 없음
 const W=48190;
 const F=window.HWPX_FILES;
 /* 원본 양식의 쪽 설정(secPr)·쪽번호·머리글 run 을 첫 문단에 그대로 붙인다 */
 let ctl=window.HWPX_RUN1+window.HWPX_RUN2;
 const ht=hdrText(),cut=Math.max(1,ht.length-1);
 ctl=ctl.replace('@@H1@@',()=>esc(ht.slice(0,cut))).replace('@@H2@@',()=>esc(ht.slice(cut)));
 const items=model.slice();
 if(!items.length||items[0].type!=='p')items.unshift(Object.assign(newFlat(),{runs:[{t:' ',sz:10,b:false,i:false,u:false,c:'000000'}]}));
 let injected=false;
 const body=items.map(b=>{if(b.type==='table')return hxTable(b,ctx);let x=hxPara(b,ctx,W);
  if(!injected){x=x.replace(/^<hp:p [^>]*>/,m=>m.replace(/ id="\d+"/,' id="0"')+ctl);injected=true}return x}).join('');
 const nsDecl='xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"';
 const section='<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hs:sec '+nsDecl+'>'+body+'</hs:sec>';
 const header=hxHeader(base,ctx,c0,p0,b0);
 const hpf=F.hpf.replace('<opf:title/>','<opf:title>'+esc(safeName())+'</opf:title>');
 const Z=new JSZip();
 Z.file('mimetype','application/hwp+zip',{compression:'STORE'});
 Z.file('version.xml',F.version);
 Z.file('settings.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>');
 Z.file('META-INF/container.xml',F.container);
 Z.file('META-INF/manifest.xml',F.manifest);
 Z.file('META-INF/container.rdf',F.rdf);
 Z.file('Preview/PrvText.txt',model.filter(b=>b.type==='p').slice(0,12).map(p=>p.runs.map(r=>r.t).join('')).join('\r\n'));
 Z.file('Contents/content.hpf',hpf);Z.file('Contents/header.xml',header);Z.file('Contents/section0.xml',section);
 return Z.generateAsync({type:'blob',mimeType:'application/hwp+zip',compression:'DEFLATE'})}

/* ========== 4. PDF (화면 캡처 → A4 쪽 나눔) ========== */
async function buildPdf(){await Promise.all([loadScript('h2c'),loadScript('pdf')]);
 const docEl=document.getElementById('doc');
 const out=await withPrintState(async()=>{
  if(typeof drawBreaks==='function')drawBreaks();docEl.querySelectorAll('.pgl').forEach(x=>x.remove());const pg=window.__pg;if(!pg)throw new Error('쪽 나눔 계산에 실패했습니다.');
  const sheetRect=docEl.getBoundingClientRect();const cs=getComputedStyle(docEl);const padL=parseFloat(cs.paddingLeft)+parseFloat(cs.borderLeftWidth||0),padR=parseFloat(cs.paddingRight)+parseFloat(cs.borderRightWidth||0);
  const innerW=docEl.offsetWidth-padL-padR;const H=docEl.offsetHeight;
  const scale=Math.min(2,15000/H);
  const oldS=docEl.style.cssText;docEl.style.boxShadow='none';docEl.style.border='none';docEl.style.borderRadius='0';
  const onclone=cd=>{const w=cd.defaultView;
   cd.querySelectorAll('input[type=text]').forEach(i=>{const c=w.getComputedStyle(i),s=cd.createElement('span');s.textContent=i.value;
    s.style.cssText='display:inline-block;white-space:pre;overflow:hidden;font:'+c.font+';letter-spacing:'+c.letterSpacing+';color:'+c.color+';text-align:'+c.textAlign+';width:'+i.getBoundingClientRect().width+'px;line-height:'+c.lineHeight+';vertical-align:'+c.verticalAlign;i.parentNode.replaceChild(s,i)});
   cd.querySelectorAll('input[type=checkbox]').forEach(i=>{if(i.closest('.noprint')){i.remove();return}const s=cd.createElement('span');s.style.cssText='display:inline-block;width:9.3px;height:9.3px;border:1px solid #000;box-sizing:border-box;flex:none;background:'+(i.checked?'#000':'transparent');i.parentNode.replaceChild(s,i)})};
  const canvas=await html2canvas(docEl,{scale,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:Math.ceil(sheetRect.width)+40,onclone});
  docEl.style.cssText=oldS;return {canvas,pg,padL,innerW,H,scale}});
 const {canvas,pg,padL,innerW,scale}=out;const {jsPDF}=window.jspdf;
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 const ys=[pg.start].concat(pg.breaks);const ye=pg.breaks.concat([pg.end]);const mmPerPx=170/innerW;
 // 머리글 이미지(한글 글자는 PDF 기본 글꼴로 못 쓰므로 그림으로)
 const hc=document.createElement('canvas');hc.width=1600;hc.height=48;const hx=hc.getContext('2d');hx.fillStyle='#fff';hx.fillRect(0,0,1600,48);hx.fillStyle='#ff0000';hx.font='italic bold 28px "Malgun Gothic",Pretendard,sans-serif';hx.textAlign='center';hx.textBaseline='middle';hx.fillText(hdrText(),800,26);
 const hdrImg=hc.toDataURL('image/png');
 for(let i=0;i<ys.length;i++){const y0=ys[i],y1=Math.min(ye[i],pg.end);const h=Math.max(1,y1-y0);if(h<4&&i>0)continue;
  const sc=document.createElement('canvas');sc.width=Math.round((innerW+16)*scale);sc.height=Math.max(1,Math.round(h*scale));const x=sc.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,sc.width,sc.height);
  x.drawImage(canvas,Math.round((padL-8)*scale),Math.round(y0*scale),sc.width,sc.height,0,0,sc.width,sc.height);
  if(i>0)pdf.addPage();
  pdf.addImage(sc.toDataURL('image/jpeg',0.92),'JPEG',20-8*mmPerPx,18,(innerW+16)*mmPerPx,h*mmPerPx,undefined,'FAST');
  pdf.addImage(hdrImg,'PNG',20,8,170,5.1);
  pdf.setFontSize(9.5);pdf.setTextColor(0,0,0);pdf.text('- '+(i+1)+' -',105,289,{align:'center'})}
 return pdf.output('blob')}

/* ========== 5. Google 문서 ========== */
async function toGoogleDoc(model,w){const blob=await buildDocx(model);
 if(typeof gcid==='function'&&!gcid()){if(w)w.close();gSettings();throw new Error('Google 연결 설정(클라이언트 ID)이 필요합니다.')}
 toast('Google에 연결하는 중…',true);
 const folder=await gFolderId(false);const bnd='ap'+Math.random().toString(36).slice(2);
 const meta=JSON.stringify({name:safeName(),mimeType:'application/vnd.google-apps.document',parents:[folder]});
 const head='--'+bnd+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+meta+'\r\n--'+bnd+'\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n';
 const r=await gApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+bnd},body:new Blob([head,blob,'\r\n--'+bnd+'--'])});
 const j=await r.json();const url='https://docs.google.com/document/d/'+j.id+'/edit';
 if(w&&!w.closed)w.location.href=url;else window.open(url,'_blank');return url}

/* ========== UI ========== */
window.toggleX=function(e){if(e)e.stopPropagation();const p=document.getElementById('xpop');p.hidden=!p.hidden};
document.addEventListener('click',()=>{const p=document.getElementById('xpop');if(p)p.hidden=true});
window.exportAs=async function(kind){const p=document.getElementById('xpop');if(p)p.hidden=true;if(busy)return;busy=true;
 let w=null;if(kind==='gdoc')w=window.open('about:blank','_blank');
 try{if(typeof save==='function')save();
  toast('내보내는 중입니다… 잠시만 기다려 주세요.',true);
  const name=safeName();
  if(kind==='pdf'){const b=await buildPdf();download(b,name+'.pdf');toast('PDF를 내려받았습니다.')}
  else{const model=await withPrintState(buildModel);
   if(kind==='docx'){const b=await buildDocx(model);download(b,name+'.docx');toast('Word 파일(.docx)을 내려받았습니다.')}
   else if(kind==='hwpx'){const b=await buildHwpx(model);download(b,name+'.hwpx');toast('한글 파일(.hwpx)을 내려받았습니다. 한글에서 열어 확인해 주세요.')}
   else if(kind==='gdoc'){await toGoogleDoc(model,w);toast('Google 문서로 만들었습니다. 새 탭에서 열립니다.')}}}
 catch(e){console.error(e);if(w&&!w.closed)w.close();toast('내보내기 실패: '+(e&&e.message||e));}
 finally{busy=false}};
window.__exp={withPrintState,buildModel,buildDocx,buildHwpx,buildPdf};
})();
