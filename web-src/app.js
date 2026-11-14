/* 围棋背谱闯关 2.0 — MIT; all application work runs locally. */
(() => {
'use strict';
// Do not serialize the entire page at startup. Audio is loaded only on demand.
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Native=window.GoAndroid||null;
const KEY='weiqi-memory-v2-progress', CACHE_PREFIX='weiqi-memory-v2-sgf-'; let PAGE_SIZE=12;
const docs=new Map(), volatileDocs=new Set(), embeddedIds=new Set();let db=null,storageOK=true,toastTimer=null,loadSerial=0,autoTimer=null,bulkRunning=false,bulkStop=false;
let levels=[],current=null,mode='preview',at=0,errors=0,bad=new Set(),hints=new Set(),startedAt=0,hintVisible=false,wrongPoint=-1,zoom=true,page=0;
let boardGeometry=null,feedbackMessage='',feedbackKind='',activeTab='practice',layoutFrame=0,confirmAction=null,lastWrongVoiceAt=0;
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function safeDoc(d){return d&&typeof d.id==='string'&&/^(ggg-(easy|intermediate|hard)-\d{1,3}|import-[a-z0-9]+)$/.test(d.id)&&typeof d.sgf==='string'&&d.sgf.length<=3000000;}
function numeric(x,max=1000000){return Number.isFinite(+x)?Math.max(0,Math.min(max,+x)):0;}
function cleanRecord(r){if(!r||typeof r!=='object')return null;const out={};for(const k of ['plays','passes','bestStars','bestAccuracy','lastAccuracy','lastErrors','lastHints','totalMs'])out[k]=numeric(r[k],k.includes('Accuracy')?100:k==='bestStars'?3:1000000000);out.lastPlayed=typeof r.lastPlayed==='string'&&Number.isFinite(Date.parse(r.lastPlayed))?r.lastPlayed:'';return out;}
function cleanRecords(rs){const o=Object.create(null);if(!rs||typeof rs!=='object')return o;for(const [id,r]of Object.entries(rs).slice(0,50000))if(/^[a-zA-Z0-9_-]{1,160}$/.test(id)){const c=cleanRecord(r);if(c)o[id]=c;}return o;}
let state={version:2,records:Object.create(null),lastId:null,session:null,battle:null,battleHistory:[],battleVoids:[],recordView:'lessons'};
let startupRaw='';try{localStorage.setItem(KEY+'-test','1');localStorage.removeItem(KEY+'-test');startupRaw=localStorage.getItem(KEY)||'';}catch(e){storageOK=false;}try{if(Native){const raw=Native.loadProgress();if(raw)startupRaw=raw;}}catch(e){}try{const s=JSON.parse(startupRaw||'null');if(s&&s.version===2)state={version:2,records:cleanRecords(s.records),lastId:typeof s.lastId==='string'?s.lastId:null,session:s.session&&typeof s.session==='object'?s.session:null,battle:s.battle||null,battleHistory:Array.isArray(s.battleHistory)?s.battleHistory.slice(0,100):[],battleVoids:Array.isArray(s.battleVoids)?s.battleVoids.slice(0,1000):[],recordView:s.recordView==='battle'?'battle':'lessons'};}catch(e){storageOK=false;throw Error('本地记录解析失败；原记录仍保留，请使用启动页导出记录。');}
function warnStorage(){if(!storageOK){$('storageWarning').hidden=false;$('storageWarning').textContent='当前无法保存记录。请先导出 JSON 备份，并检查平板剩余存储空间。';$('saveState').textContent='记录暂未持久保存';}}
function saveState(){const raw=JSON.stringify(state);let ok=false;try{localStorage.setItem(KEY,raw);ok=true;}catch(e){}try{if(Native&&Native.saveProgress(raw))ok=true;}catch(e){}storageOK=ok;if(ok){$('saveState').textContent='✓ 记录已存本机';$('storageWarning').hidden=true;}else warnStorage();}
function sessionSave(){if(current){state.lastId=current.level.id;state.session={id:current.level.id,mode,at,errors,bad:[...bad],hints:[...hints],startedAt};}saveState();}
function saveNativeDocs(){try{if(Native&&Native.saveDocuments)Native.saveDocuments(JSON.stringify([...docs.values()]));}catch(e){}}
async function openCache(){
 try{if(Native&&Native.loadDocuments){const saved=JSON.parse(Native.loadDocuments()||'[]');for(const d of saved)if(safeDoc(d))docs.set(d.id,d);}}catch(e){}

 try{db=await new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('no IndexedDB'));const rq=indexedDB.open('weiqi-memory-v2',1),timer=setTimeout(()=>reject(Error('缓存打开超时')),2500);rq.onupgradeneeded=()=>{if(!rq.result.objectStoreNames.contains('docs'))rq.result.createObjectStore('docs',{keyPath:'id'});};rq.onsuccess=()=>{clearTimeout(timer);resolve(rq.result);};rq.onerror=()=>{clearTimeout(timer);reject(rq.error);};rq.onblocked=()=>{clearTimeout(timer);reject(Error('缓存被其他页面占用'));};});
 const list=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('读取缓存超时')),2000);const r=db.transaction('docs','readonly').objectStore('docs').getAll();r.onsuccess=()=>{clearTimeout(timer);resolve(r.result);};r.onerror=()=>{clearTimeout(timer);reject(r.error);};});for(const d of list)if(safeDoc(d))docs.set(d.id,d);
 }catch(e){db=null;}
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(CACHE_PREFIX)){try{const d=JSON.parse(localStorage.getItem(k));if(safeDoc(d)&&!docs.has(d.id))docs.set(d.id,d);}catch(e){}}}}catch(e){}
 try{const data=JSON.parse($('extraData').textContent||'[]');for(const d of Array.isArray(data)?data:[])if(safeDoc(d)){docs.set(d.id,d);embeddedIds.add(d.id);}}catch(e){toast('离线扩展数据读取失败，内置内容仍可使用。');}
}
async function cacheSave(d){
 docs.set(d.id,d);let stored=false;
 if(db)try{await new Promise((resolve,reject)=>{const t=db.transaction('docs','readwrite');t.objectStore('docs').put(d);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});stored=true;}catch(e){}
 if(!stored)try{localStorage.setItem(CACHE_PREFIX+d.id,JSON.stringify(d));stored=true;}catch(e){}
 if(!stored&&!embeddedIds.has(d.id))volatileDocs.add(d.id);else volatileDocs.delete(d.id);saveNativeDocs();return stored;
}
function available(l){return !!l.game||docs.has(l.id);}
function rebuildCatalog(){levels=makeCatalog([...docs.values()]);}
function rec(id){return state.records[id]||{plays:0,passes:0,bestStars:0,bestAccuracy:0,lastAccuracy:0,lastErrors:0,lastHints:0,lastPlayed:'',totalMs:0};}
function groupList(){return current?levels.filter(l=>l.group===current.level.group):[];}
function nextLevel(){const a=groupList(),i=a.findIndex(l=>l.id===current?.level.id);return i>=0?a[i+1]:null;}
function setFeedback(msg='',kind=''){feedbackMessage=msg;feedbackKind=kind;$('feedback').textContent=msg;$('feedback').className='feedback'+(kind?' '+kind:'');}
function stopAuto(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}$('autoPlay').textContent='▶ 自动';}
function showTab(tab){stopAuto();if(window.GoBattle)GoBattle.leave();activeTab=tab;document.body.dataset.page=tab;const header=$('appHeader');if(tab==='practice'||tab==='battle'){$(tab).querySelector('.lesson-card').prepend(header);}else{document.body.insertBefore(header,$('storageWarning'));}document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==tab);document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});if(tab==='battle'&&window.GoBattle)GoBattle.enter();if(tab==='levels')renderLevels();if(tab==='progress')renderProgress();if(tab==='library')renderLibrary();scheduleLayout();}

function fitLayout(){
 document.documentElement.style.setProperty('--app-height',Math.floor(window.visualViewport?.height||window.innerHeight)+'px');
 if(activeTab==='practice'||activeTab==='battle'){
  const container=$(activeTab),grid=container.querySelector('.practice-grid'),style=getComputedStyle(grid),gap=parseFloat(style.columnGap)||10;
  // Reserve a usable touch-control rail, then give the board the largest possible square.
  // Spare width on wide tablets belongs to controls, not to empty space around the board.
  const minimum=window.innerWidth<960?292:320;
  const sidebar=Math.max(minimum,grid.clientWidth-grid.clientHeight-gap);
  grid.style.setProperty('--sidebar-width',Math.floor(sidebar)+'px');
  const stage=container.querySelector('.board-stage'),size=Math.max(1,Math.floor(Math.min(stage.clientWidth,stage.clientHeight)));
  const wrap=$(activeTab==='battle'?'battleBoardWrap':'boardWrap');wrap.style.width=size+'px';wrap.style.height=size+'px';document.documentElement.style.setProperty('--sidebar-width',Math.floor(sidebar)+'px');
 }
 if(activeTab==='levels'){
  const grid=$('levelGrid'),w=grid.clientWidth,h=grid.clientHeight;
  const cols=Math.max(3,Math.min(6,Math.floor((w+10)/205))),rows=Math.max(1,Math.min(4,Math.floor((h+10)/120)));
  grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';grid.style.gridTemplateRows='repeat('+rows+',minmax(0,1fr))';
  const size=cols*rows;if(size!==PAGE_SIZE){const first=page*PAGE_SIZE;PAGE_SIZE=size;page=Math.floor(first/PAGE_SIZE);renderLevels();}
 }
}
function scheduleLayout(){if(layoutFrame)cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;fitLayout();});}
function askAction(action,text,label){
 confirmAction=action;$('confirmText').textContent=text;$('confirmGo').textContent=label;$('confirmGo').setAttribute('data-say',label);$('confirmDialog').hidden=false;stopAuto();$('confirmStay').focus({preventScroll:true});
}
function closeConfirm(){confirmAction=null;$('confirmDialog').hidden=true;}
function safeLoadLevel(id){
 if(current&&mode==='training'&&at>0&&id!==current.level.id){askAction(()=>loadLevel(id),'切换后，本次尚未完成的挑战会结束。已经通关的成绩仍然保留。','切换关卡');return;}
 loadLevel(id);
}
function updateLevelSwitch(){
 const list=groupList(),i=list.findIndex(l=>l.id===current?.level.id);
 $('previousLevel').disabled=i<=0;$('forwardLevel').disabled=i<0||i>=list.length-1;
 $('previousLevel').title=i>0?list[i-1].title:'这是本组第一关';$('forwardLevel').title=i>=0&&i<list.length-1?list[i+1].title:'本组最后一关，可点选关换组';
}

function downloadFile(name,text,type){if(Native){if(!Native.exportFile(name,String(text),type.split(';')[0]))throw Error('无法开始保存，请检查文件大小');return;}const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function obtainGame(l){
 if(l.game)return GoEngine.compile(l.game);
 const cached=docs.get(l.id);if(cached)return GoEngine.compile(GoEngine.parse(cached.sgf,l.title)[0]);
 throw Error('本地棋谱缺失，请检查安装包或恢复导入棋谱。');
}
async function loadLevel(id,{resume=false,focus=true}={}){
 const l=levels.find(x=>x.id===id);if(!l)return toast('找不到该关卡；请先恢复对应的 SGF 棋谱。');stopAuto();const serial=++loadSerial;
 if(!available(l)){$('loadingText').textContent='正在读取本地棋谱…';$('loading').hidden=false;}
 try{
  const game=await obtainGame(l);if(serial!==loadSerial)return;current={level:l,game,start:l.start||0,end:l.end||game.moves.length};mode='preview';at=0;errors=0;bad=new Set();hints=new Set();startedAt=0;hintVisible=false;wrongPoint=-1;
  const total=current.end-current.start,s=state.session;
  if(resume&&s?.id===id&&s.mode==='training'&&Number.isInteger(s.at)&&s.at>=0&&s.at<total){mode='training';at=s.at;errors=numeric(s.errors);bad=new Set((Array.isArray(s.bad)?s.bad:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<total));hints=new Set((Array.isArray(s.hints)?s.hints:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<total));for(const p of hints)bad.add(p);startedAt=Number.isFinite(s.startedAt)?s.startedAt:Date.now();hintVisible=hints.has(at);}
  setFeedback(mode==='training'?'已接着上次的位置。请继续复摆下一手。':'先点“下一手”看棋谱；记住后，再开始背。');showTab('practice');renderPractice();sessionSave();scheduleLayout();
 }catch(e){toast(e.message);}finally{if(serial===loadSerial)$('loading').hidden=true;}
}
function setPreview(p){if(!current)return;at=Math.max(0,Math.min(current.end-current.start,p));setFeedback(at===current.end-current.start?'已经看到本关最后一手。准备好就遮住答案，自己摆一遍。':'看位置，也记住黑白棋的先后顺序。');renderPractice();sessionSave();}
function startTraining(){
 if(!current)return;stopAuto();mode='training';at=0;errors=0;bad=new Set();hints=new Set();hintVisible=false;wrongPoint=-1;startedAt=Date.now();const r=rec(current.level.id);r.plays++;r.lastPlayed=new Date().toISOString();state.records[current.level.id]=r;setFeedback('轮到你了！按刚才的顺序，把黑白棋都摆出来。');renderPractice();sessionSave();
}
function finish(){
 mode='complete';hintVisible=false;const total=current.end-current.start,accuracy=Math.round((total-bad.size)/total*1000)/10,stars=bad.size===0?3:accuracy>=80?2:1,r=rec(current.level.id);
 r.passes++;r.bestAccuracy=Math.max(r.bestAccuracy,accuracy);r.bestStars=Math.max(r.bestStars,stars);r.lastAccuracy=accuracy;r.lastErrors=errors;r.lastHints=hints.size;r.lastPlayed=new Date().toISOString();r.totalMs+=Math.min(Math.max(0,Date.now()-startedAt),3600000);state.records[current.level.id]=r;
 setFeedback(stars===3?'全部独立记住了，获得三星！':'已经摆完这关！再练一遍，就能记得更稳。','success');renderPractice();sessionSave();if(window.ButtonVoice)ButtonVoice.say('本关完成鼓励');
}
function attempt(p){
 if(!current||mode!=='training')return;const expected=current.game.moves[current.start+at];if(!expected)return;
 if(p>=0&&current.game.boards[current.start+at][p]){setFeedback('这个交叉点已经有棋子了，请选空点。');return;}
 if(p!==expected.p){errors++;bad.add(at);wrongPoint=p;setFeedback('这手与参考棋谱不同。再想一想，也可以看提示。','error');renderPractice();sessionSave();if(window.ButtonVoice&&Date.now()-lastWrongVoiceAt>1600){lastWrongVoiceAt=Date.now();ButtonVoice.say('落子再想想');}const id=current.level.id;setTimeout(()=>{if(current?.level.id===id){wrongPoint=-1;renderBoard();}},700);return;}
 at++;hintVisible=false;wrongPoint=-1;if(at===current.end-current.start)return finish();setFeedback('这一手记对了！继续下一手。','success');renderPractice();sessionSave();
}
function showHint(){if(mode!=='training'||!current)return;hints.add(at);bad.add(at);hintVisible=true;const p=current.game.moves[current.start+at].p;setFeedback(p<0?'下一手是“停一手”，点击下方的停一手按钮。':'绿色虚线圈就是下一手的位置。看清楚后，再自己落子。');renderPractice();sessionSave();}
function viewport(){
 const g=current.game,n=g.n;
 if(!zoom||n<=9||current.level.group==='classic')return {x0:0,y0:0,count:n};
 const pts=[];g.initial.forEach((c,p)=>{if(c)pts.push(p);});g.moves.forEach(m=>{if(m.p>=0)pts.push(m.p);});if(!pts.length)return {x0:0,y0:0,count:n};
 const xs=pts.map(p=>p%n),ys=pts.map(p=>Math.floor(p/n)),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),count=Math.min(n,Math.max(7,xmax-xmin+3,ymax-ymin+3));
 return {x0:Math.max(0,Math.min(n-count,Math.floor((xmin+xmax-count+1)/2))),y0:Math.max(0,Math.min(n-count,Math.floor((ymin+ymax-count+1)/2))),count};
}
function renderBoard(){
 if(!current)return;const g=current.game,n=g.n,v=viewport(),margin=Math.max(32,Math.ceil(280/(v.count-1)+13)),step=(600-2*margin)/(v.count-1),board=g.boards[current.start+at],numbers=g.numbers[current.start+at],last=current.start+at>0?g.moves[current.start+at-1]:null;
 boardGeometry={...v,step,margin,n};const pos=p=>({x:margin+(p%n-v.x0)*step,y:margin+(Math.floor(p/n)-v.y0)*step}),inView=p=>p>=0&&p%n>=v.x0&&p%n<v.x0+v.count&&Math.floor(p/n)>=v.y0&&Math.floor(p/n)<v.y0+v.count;
 let svg='<defs><linearGradient id="wood" x2="1" y2="1"><stop stop-color="#eed6a6"/><stop offset="1" stop-color="#e4bf7e"/></linearGradient><radialGradient id="blackStone" cx=".33" cy=".25" r=".8"><stop stop-color="#48504b"/><stop offset="1" stop-color="#101b16"/></radialGradient><radialGradient id="whiteStone" cx=".35" cy=".25" r=".85"><stop stop-color="#fffef6"/><stop offset="1" stop-color="#e7e5d9"/></radialGradient></defs><rect width="600" height="600" fill="url(#wood)"/>';
 for(let i=0;i<v.count;i++){const p=margin+i*step;svg+='<path d="M '+margin+' '+p+' H '+(600-margin)+' M '+p+' '+margin+' V '+(600-margin)+'" stroke="#7a613a" stroke-width="1.1"/>';}
 const letters='ABCDEFGHJKLMNOPQRSTUVWXYZ';for(let i=0;i<v.count;i++){const p=margin+i*step;svg+='<text x="'+p+'" y="18" text-anchor="middle" font-size="'+Math.min(16,step*.47)+'" fill="#705c39">'+letters[v.x0+i]+'</text><text x="14" y="'+(p+5)+'" text-anchor="middle" font-size="'+Math.min(16,step*.47)+'" fill="#705c39">'+(n-v.y0-i)+'</text>';}
 const stars=n===19?[3,9,15]:n===13?[3,6,9]:n===9?[2,4,6]:[];
 for(const y of stars)for(const x of stars){if(n===9&&((x===4)!==(y===4)))continue;const p=y*n+x;if(inView(p)){const q=pos(p);svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+Math.max(2.4,step*.065)+'" fill="#705b39"/>';}}
 board.forEach((c,p)=>{if(!c||!inView(p))return;const q=pos(p),r=step*.435;svg+='<circle cx="'+(q.x+1)+'" cy="'+(q.y+2)+'" r="'+r+'" fill="#3e2f2025"/><circle cx="'+q.x+'" cy="'+q.y+'" r="'+r+'" fill="url(#'+(c===1?'blackStone':'whiteStone')+')" stroke="'+(c===1?'#15231b':'#bbb9aa')+'" stroke-width=".8"/>';if($('showNumbers').checked&&numbers[p]>current.start){svg+='<text x="'+q.x+'" y="'+q.y+'" dominant-baseline="central" text-anchor="middle" font-size="'+(step*.36)+'" font-weight="650" fill="'+(c===1?'#fffaf0':'#233d31')+'">'+(numbers[p]-current.start)+'</text>';}else if(last?.p===p&&at>0){svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(step*.105)+'" fill="'+(c===1?'#eef5e6':'#396d50')+'"/>';}});
 if(mode==='training'&&hintVisible){const m=g.moves[current.start+at];if(m&&inView(m.p)){const q=pos(m.p);svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(step*.35)+'" fill="#ffffff50" stroke="#1a7353" stroke-width="3" stroke-dasharray="5 3"/>';}}
 if(wrongPoint>=0&&inView(wrongPoint)){const q=pos(wrongPoint),r=step*.2;svg+='<path d="M '+(q.x-r)+' '+(q.y-r)+' L '+(q.x+r)+' '+(q.y+r)+' M '+(q.x-r)+' '+(q.y+r)+' L '+(q.x+r)+' '+(q.y-r)+'" stroke="#b1492e" stroke-width="3"/>';}
 $('board').innerHTML=svg;$('board').setAttribute('aria-label',n+'路围棋棋盘，'+(mode==='training'?'点击交叉点复摆':'看谱模式'));
 $('zoomButton').textContent=v.count<n?'查看全盘':'局部放大';$('zoomButton').disabled=n<=9||current.level.group==='classic';$('zoomButton').setAttribute('aria-pressed',String(v.count<n));
}
function renderPractice(){
 if(!current)return;const l=current.level,total=current.end-current.start,r=rec(l.id),next=current.game.moves[current.start+at];
 $('currentCategory').textContent=CATEGORY[l.group]+' · '+(groupList().findIndex(x=>x.id===l.id)+1)+' / '+groupList().length;
 $('levelTitle').textContent=l.title;$('readLevelName').setAttribute('data-say',l.title);$('readLevelName').setAttribute('aria-label','朗读关卡名称：'+l.title);$('levelSubtitle').textContent=l.subtitle+' · 本关 '+total+' 手';$('modeLabel').textContent=mode==='preview'?'① 先看棋谱':mode==='training'?'② 自己复摆':'✓ 已完成';$('moveLabel').textContent=at+' / '+total+' 手';
 $('turnLabel').textContent=mode==='complete'?'完成了！可以继续下一关':mode==='training'?(next?.c===1?'● 黑棋':'○ 白棋')+' · 请摆第 '+(at+1)+' 手':(at===total?'看完了，可以开始背了':'先看懂位置和落子顺序');
 $('previewControls').hidden=mode!=='preview';$('trainingControls').hidden=mode!=='training';$('completeControls').hidden=mode!=='complete';$('moveSlider').max=total;$('moveSlider').value=at;$('prevMove').disabled=at===0;$('nextMove').disabled=at===total;$('rewind').disabled=at===0;
 $('stepMetric').textContent=at;$('errorMetric').textContent=errors;$('hintMetric').textContent=hints.size;$('hint').disabled=hints.has(at);$('lessonNote').textContent=l.note;
 $('bestResult').textContent=r.passes?'已经通关 '+r.passes+' 次 · 最佳独立正确率 '+r.bestAccuracy+'% · '+r.bestStars+' 星':'还没有通关记录，完成一遍就会自动保存。';
 $('levelSource').textContent=l.source;$('levelLicense').textContent=l.license;$('levelTitle').title=l.title;updateLevelSwitch();
 if(mode==='complete'){const acc=Math.round((total-bad.size)/total*1000)/10,stars=bad.size===0?3:acc>=80?2:1;$('stars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);$('resultText').textContent='首次独立摆对 '+(total-bad.size)+' / '+total+' 手（'+acc+'%）\n错手 '+errors+' 次 · 提示 '+hints.size+' 手';$('nextLevel').textContent=nextLevel()?'继续下一关 →':'本组练完啦 · 去选新关';}
 renderBoard();scheduleLayout();
}
function renderLevels(){
 const category=$('categoryFilter').value,status=$('statusFilter').value,q=$('searchLevels').value.trim().toLowerCase();
 const a=levels.filter(l=>{const r=rec(l.id);return(category==='all'||l.group===category)&&(!q||(l.title+' '+l.subtitle+' '+l.id+' '+CATEGORY[l.group]).toLowerCase().includes(q))&&(status==='all'||status==='offline'&&available(l)||status==='new'&&!r.passes||status==='passed'&&r.passes||status==='review'&&r.passes&&r.bestStars<3);});
 page=Math.max(0,Math.min(page,Math.ceil(a.length/PAGE_SIZE)-1));$('filterCount').textContent='共 '+a.length+' 关 · 绿色卡片为已通关';$('catalogCount').textContent=levels.length+' 个关卡入口';$('offlineCount').textContent=levels.filter(available).length+' 关当前可离线练';
 $('levelGrid').innerHTML=a.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(l=>{const r=rec(l.id);return '<button class="level-card '+(r.passes?'passed ':'')+(current?.level.id===l.id?'current':'')+'" data-level="'+esc(l.id)+'"><span class="number">'+esc(CATEGORY[l.group])+' · '+esc(l.id.split('-').slice(-1)[0])+'</span><strong>'+esc(l.title)+'</strong><small>'+esc(l.subtitle)+(l.game?' · '+(l.end-l.start)+' 手':'')+'</small><small>'+(available(l)?'<i class="offline-dot"></i>已离线可用':'本地数据缺失')+'</small><span class="level-stars">'+(r.passes?'★'.repeat(r.bestStars)+'☆'.repeat(3-r.bestStars)+' <small>最佳 '+r.bestAccuracy+'%</small>':'<small>尚未通关</small>')+'</span></button>';}).join('')||'<p class="empty-message">没有符合条件的关卡。可以调整分类或搜索词。</p>';
 $('pageLabel').textContent=(a.length?page+1:0)+' / '+Math.ceil(a.length/PAGE_SIZE)+' 页';$('pagePrev').disabled=page===0;$('pageNext').disabled=(page+1)*PAGE_SIZE>=a.length;
 $('continueLast').disabled=!state.lastId;
}
function renderProgress(){
 if(window.GoBattle)GoBattle.renderRecords();
 const known=new Set(levels.map(l=>l.id)),entries=Object.entries(state.records).filter(([id])=>known.has(id)),passed=entries.filter(([,r])=>r.passes).length,perfect=entries.filter(([,r])=>r.bestStars===3).length,plays=entries.reduce((a,[,r])=>a+r.plays,0),passes=entries.reduce((a,[,r])=>a+r.passes,0);
 $('progressMetrics').innerHTML=[[passed,'已通关的关卡'],[perfect,'三星关卡'],[plays,'累计挑战次数'],[passes,'累计完成次数']].map(([v,t])=>'<div><b>'+v+'</b><small>'+t+'</small></div>').join('');
 $('groupProgress').innerHTML=Object.entries(CATEGORY).map(([k,title])=>{const a=levels.filter(l=>l.group===k),n=a.filter(l=>rec(l.id).passes).length;return a.length?'<div class="group-row"><header><span>'+title+'</span><span>'+n+' / '+a.length+'</span></header><div class="bar-track"><i style="width:'+(n/a.length*100)+'%"></i></div></div>':'';}).join('');
 const rows=entries.sort((a,b)=>b[1].lastPlayed.localeCompare(a[1].lastPlayed)).slice(0,12);
 $('recentList').innerHTML=rows.map(([id,r])=>{const l=levels.find(x=>x.id===id),time=r.lastPlayed?new Date(r.lastPlayed).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';return '<div class="recent-row"><div><strong>'+esc(l.title)+'</strong><small>'+esc(l.subtitle)+' · '+esc(time)+'</small><br><small>挑战 '+r.plays+' 次 · 通关 '+r.passes+' 次'+(r.passes?' · 最佳 '+r.bestAccuracy+'%':' · 尚未完成')+'</small></div><button class="secondary small" data-level="'+esc(id)+'">再练</button></div>';}).join('')||'<p class="muted">还没有练习记录。去完成第一关吧。</p>';
}
function renderLibrary(){const n=[...docs.keys()].filter(k=>k.startsWith('import-')).length;$('cacheStatus').textContent='内置 548 关全部可用；已导入自己的棋谱 '+n+' 个。'+(volatileDocs.size?'有导入棋谱未写入缓存，请导出 JSON 备份。':'');}
async function importSGF(text,title){
 const games=GoEngine.parse(text,title||'导入棋谱');for(const g of games)GoEngine.compile(g);const id='import-'+GoEngine.hash(text),doc={id,title:String(title||games[0].title||'导入棋谱').slice(0,100),sgf:text,source:'用户导入'};const existed=docs.has(id);await cacheSave(doc);rebuildCatalog();return {id,existed,levels:levels.filter(l=>l.docId===id).length};
}
async function importFiles(files){
 if(files.length>100)return toast('每次最多导入 100 个 SGF 文件。');let ok=0,fail=0,last=null,details=[];
 for(const f of files){try{if(f.size>3000000)throw Error('文件超过 3 MB');const bytes=await f.arrayBuffer();let text=new TextDecoder('utf-8').decode(bytes);const encoding=text.match(/CA\[(GB2312|GBK|GB18030|Big5)\]/i)?.[1];if(encoding)text=new TextDecoder(encoding.toLowerCase()==='big5'?'big5':'gb18030').decode(bytes);last=await importSGF(text,f.name.replace(/\.sgf$/i,''));ok++;}catch(e){fail++;details.push(f.name+'：'+e.message);}}
 $('importStatus').textContent='导入成功 '+ok+' 个文件，失败 '+fail+' 个。'+details.slice(0,4).join('；');renderLibrary();if(last){$('categoryFilter').value='imported';page=0;toast('棋谱已加入“我的棋谱”，共 '+levels.filter(l=>l.group==='imported').length+' 关。');}
}
function exportBackup(){
 sessionSave();const payload={app:'weiqi-memory-trainer',version:2,exportedAt:new Date().toISOString(),progress:state,docs:[...docs.values()].map(d=>({id:d.id,sgf:d.sgf,title:d.title,source:d.source}))};downloadFile('围棋闯关备份_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(payload), 'application/json;charset=utf-8');$('backupStatus').textContent='已准备备份，请在系统窗口中选择保存位置。';toast(Native?'请选择备份保存位置。':'备份文件已生成。');
}
async function importBackup(file){
 try{if(file.size>30000000)throw Error('备份文件超过 30 MB');const data=JSON.parse(await file.text());if(data.app!=='weiqi-memory-trainer'||data.version!==2||!data.progress)throw Error('不是本应用支持的备份文件');const items=Array.isArray(data.docs)?data.docs:[];if(items.length>2000)throw Error('备份棋谱条目过多');let count=0,skipped=0;
 for(const d of items){try{if(!safeDoc(d))throw Error('无效条目');for(const g of GoEngine.parse(d.sgf,d.title))GoEngine.compile(g);await cacheSave({id:d.id,sgf:d.sgf,title:String(d.title||'棋谱').slice(0,100),source:typeof d.source==='string'?d.source.slice(0,400):''});count++;}catch(e){skipped++;}}
 const incoming=cleanRecords(data.progress.records);for(const [id,r]of Object.entries(incoming)){const old=rec(id),latest=r.lastPlayed>old.lastPlayed?r:old;state.records[id]={...latest,plays:Math.max(old.plays,r.plays),passes:Math.max(old.passes,r.passes),bestStars:Math.max(old.bestStars,r.bestStars),bestAccuracy:Math.max(old.bestAccuracy,r.bestAccuracy),totalMs:Math.max(old.totalMs,r.totalMs)};}
 if(!state.lastId&&typeof data.progress.lastId==='string'){state.lastId=data.progress.lastId;state.session=data.progress.session||null;}
 if(window.GoBattle)GoBattle.importProgress(data.progress);rebuildCatalog();saveState();renderLibrary();renderProgress();if(current)renderPractice();$('backupStatus').textContent='已合并 '+Object.keys(incoming).length+' 条记录、恢复 '+count+' 个扩展棋谱。'+(skipped?'跳过 '+skipped+' 个无效棋谱条目。':'')+'相同关卡保留更高成绩与较大次数，不重复累加。';toast('备份已恢复，已有最佳成绩不会降低。');
 }catch(e){$('backupStatus').textContent='恢复失败：'+e.message;toast('恢复失败：'+e.message);}
}
async function exportOffline(){
 try {
  toast('正在打包离线网页。此操作较大；练习记录仍请另行备份。');
  function readLocal(path){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('GET',path,true);x.onload=()=>x.status===200?resolve(x.responseText):reject(Error('读取失败：'+path));x.onerror=()=>reject(Error('读取失败：'+path));x.send();});}
  const html=await readLocal('index.html'),doc=new DOMParser().parseFromString(html,'text/html');
  doc.getElementById('extraData').textContent=JSON.stringify([...docs.values()]).replace(/</g,'\\u003c');
  const style=doc.querySelector('link[rel=stylesheet]'),sty=doc.createElement('style');sty.textContent=await readLocal('app.css');style.replaceWith(sty);
  const links=[...doc.querySelectorAll('script[src]')];
  for(const node of links){const path=node.getAttribute('src');let text=await readLocal(path);
   if(path==='voice-map.js'){
    const map={};for(const [k,path] of Object.entries(window.VOICE_FILES)){if(!map[path]){map[path]=await new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('GET',path);x.responseType='blob';x.onload=()=>{if(x.status!==200)return reject(Error('声音读取失败'));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(x.response);};x.onerror=reject;x.send();});}}
    const embedded={};for(const [k,path] of Object.entries(window.VOICE_FILES))embedded[k]=map[path];text='window.VOICE_FILES='+JSON.stringify(embedded)+';';
   }
   node.removeAttribute('src');node.removeAttribute('defer');node.textContent=text.replace(/<\/script/gi,'<\\/script');
  }
  const csp=doc.querySelector('meta[http-equiv="Content-Security-Policy"]');csp.setAttribute('content',csp.getAttribute('content').replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
  downloadFile('围棋背谱闯关_离线整合版.html','<!doctype html>\n'+doc.documentElement.outerHTML,'text/html;charset=utf-8');
  $('backupStatus').textContent='离线网页已准备保存。练习记录请另外导出 JSON。';
 }catch(e){toast('导出失败：'+e.message);}
}

function bindEvents(){
 $('readLevelName').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('readLevelName').click();}};
 $('readLevelName').onclick=()=>{if(window.ButtonVoice&&!ButtonVoice.enabled)toast('先点右上角小喇叭打开语音，再听关卡名称。');};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
 $('chooseLevel').onclick=()=>{if(current)$('categoryFilter').value=current.level.group;page=0;showTab('levels');};$('completeMap').onclick=()=>showTab('levels');
 $('startTraining').onclick=startTraining;$('retry').onclick=startTraining;$('restart').onclick=()=>askAction(startTraining,'从本关第一手重新挑战？已经获得的最佳成绩不会改变。','重新挑战');
 $('review').onclick=()=>askAction(()=>{mode='preview';at=0;hintVisible=false;setFeedback('先重新看一遍，再开始新的挑战。');renderPractice();sessionSave();},'结束本次挑战并重新看谱？已经获得的最佳成绩不会改变。','重看棋谱');
 $('rewind').onclick=()=>{stopAuto();setPreview(0);};$('prevMove').onclick=()=>{stopAuto();setPreview(at-1);};$('nextMove').onclick=()=>{stopAuto();setPreview(at+1);};$('moveSlider').oninput=e=>{stopAuto();setPreview(+e.target.value);};
 $('autoPlay').onclick=()=>{if(autoTimer)return stopAuto();if(!current)return;if(at===current.end-current.start)setPreview(0);$('autoPlay').textContent='Ⅱ 暂停';autoTimer=setInterval(()=>{if(mode!=='preview')return stopAuto();setPreview(at+1);if(at===current.end-current.start)stopAuto();},1200);};
 $('hint').onclick=showHint;$('pass').onclick=()=>attempt(-1);$('nextLevel').onclick=()=>{const n=nextLevel();if(n)loadLevel(n.id);else showTab('levels');};$('showNumbers').onchange=()=>{renderBoard();if(window.ButtonVoice)ButtonVoice.say($('showNumbers').checked?'手数显示':'手数隐藏');};$('zoomButton').onclick=()=>{zoom=!zoom;renderBoard();};
 $('board').addEventListener('click',e=>{if(mode!=='training'||!boardGeometry)return;const r=$('board').getBoundingClientRect(),b=boardGeometry,x=(e.clientX-r.left)/r.width*600,y=(e.clientY-r.top)/r.height*600,xx=Math.round((x-b.margin)/b.step),yy=Math.round((y-b.margin)/b.step);if(xx<0||yy<0||xx>=b.count||yy>=b.count||Math.abs(x-(b.margin+xx*b.step))>b.step*.48||Math.abs(y-(b.margin+yy*b.step))>b.step*.48)return;attempt((yy+b.y0)*b.n+xx+b.x0);});
 for(const id of ['categoryFilter','statusFilter'])$(id).onchange=()=>{page=0;renderLevels();};$('searchLevels').oninput=()=>{page=0;renderLevels();};$('pagePrev').onclick=()=>{page--;renderLevels();};$('pageNext').onclick=()=>{page++;renderLevels();};
 for(const id of ['levelGrid','recentList'])$(id).onclick=e=>{const b=e.target.closest('[data-level]');if(b)safeLoadLevel(b.dataset.level);};
 $('continueLast').onclick=()=>loadLevel(state.lastId,{resume:true});$('randomReview').onclick=()=>{const cat=$('categoryFilter').value,a=levels.filter(l=>rec(l.id).passes&&(cat==='all'||l.group===cat));if(!a.length)return toast('当前分类还没有通关关卡，先完成一关吧。');loadLevel(a[Math.floor(Math.random()*a.length)].id);};
 $('sgfFiles').onchange=async e=>{await importFiles([...e.target.files]);e.target.value='';};$('importText').onclick=async()=>{try{const r=await importSGF($('sgfText').value,$('sgfTitle').value.trim());$('importStatus').textContent=(r.existed?'这个棋谱已存在，保留原有记录。':'导入成功。')+'共有 '+r.levels+' 个分段关卡。';renderLibrary();$('categoryFilter').value='imported';page=0;toast('已加入“我的棋谱”。');}catch(e){$('importStatus').textContent='导入失败：'+e.message;}};
 $('exportBackup').onclick=exportBackup;$('backupTop').onclick=exportBackup;$('backupFile').onchange=async e=>{if(e.target.files[0])await importBackup(e.target.files[0]);e.target.value='';};$('exportOffline').onclick=exportOffline;

 $('previousLevel').onclick=()=>{const a=groupList(),i=a.findIndex(l=>l.id===current?.level.id);if(i>0)safeLoadLevel(a[i-1].id);};
 $('forwardLevel').onclick=()=>{const n=nextLevel();if(n)safeLoadLevel(n.id);};
 $('lessonHelp').onclick=()=>{stopAuto();$('lessonHelpDialog').hidden=false;$('closeLessonHelp').focus({preventScroll:true});};
 $('closeLessonHelp').onclick=()=>{$('lessonHelpDialog').hidden=true;$('lessonHelp').focus({preventScroll:true});};
 $('confirmStay').onclick=closeConfirm;$('confirmGo').onclick=()=>{const action=confirmAction;closeConfirm();if(action)action();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('lessonHelpDialog').hidden=true;closeConfirm();}});
 window.addEventListener('resize',scheduleLayout);window.addEventListener('orientationchange',scheduleLayout);if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleLayout);
 if(window.ResizeObserver){const ro=new ResizeObserver(scheduleLayout);ro.observe(document.querySelector('.board-stage'));ro.observe($('levelGrid'));}

 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();if(window.GoBattle)GoBattle.leave();sessionSave();}else if(activeTab==='battle'&&window.GoBattle)GoBattle.enter();});window.addEventListener('pagehide',sessionSave);
}
window.GoNativeSaveResult=ok=>{$('backupStatus').textContent=ok?'文件已保存到所选位置。':'已取消保存。';};
window.GoNativePause=()=>{stopAuto();if(window.GoBattle)GoBattle.leave();sessionSave();if(window.ButtonVoice)ButtonVoice.stop();};
async function init(){
 if(window.GoBattle)GoBattle.init({getState:()=>state,save:saveState,download:downloadFile,layout:scheduleLayout,toast,showTab});
 warnStorage();for(const [k,v]of Object.entries(CATEGORY)){const o=document.createElement('option');o.value=k;o.textContent=v;$('categoryFilter').append(o);}bindEvents();await openCache();saveNativeDocs();rebuildCatalog();renderLibrary();saveState();
 const saved=levels.some(l=>l.id===state.lastId)?state.lastId:levels[0].id;await loadLevel(saved,{resume:true,focus:false});
 // A small documented test surface; contains no network credentials or private data.
 window.GoTrainer={get levels(){return levels;},get state(){return state;},get current(){return current;},get mode(){return mode;},get at(){return at;},get geometry(){return boardGeometry;},loadLevel,startTraining,attempt,showHint,importSGF,importBackup,exportBackup,exportOffline,showTab,renderLevels,get docs(){return docs;},ready:true,fitLayout,get pageSize(){return PAGE_SIZE;}};scheduleLayout();requestAnimationFrame(()=>{if(current&&$('board').childNodes.length){if(window.AppBoot)window.AppBoot.ready();}});
}
init().catch(e=>{toast('启动失败：'+e.message);console.error(e);if(window.AppBoot)window.AppBoot.fail('初始化失败：'+e.message);});
})();
