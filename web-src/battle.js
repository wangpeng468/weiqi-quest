/* Offline battle screen. Keeps its state inside the existing progress envelope,
 * so native backup, export and in-place Android upgrades retain it with the lessons. */
(function(){
'use strict';
const E=window.BattleEngine,$=id=>document.getElementById(id),labels=['轻松','认真','挑战'];
let host=null,game=null,human=1,difficulty=0,phase='playing',dead=[],result=null,id='',updatedAt='',active=false,busy=false,timer=null,ticket=0,geometry=null,hint=-1,wrong=-1,dialogAction=null,setup={n:9,human:1,difficulty:0},recordsPage=0,recordFilter='all';
function speak(key){if(window.ButtonVoice)ButtonVoice.say(key);}
function stamp(){return new Date().toISOString();}
function save(){if(!host||!game)return;updatedAt=stamp();host.getState().battle={version:1,n:game.n,human,difficulty,phase,dead:dead.slice(),result,id,updatedAt,passes:game.passes,moves:game.moves.map(m=>({p:m.p,c:m.c}))};host.save();}
function cancelAI(){ticket++;clearTimeout(timer);timer=null;busy=false;}
function leave(){active=false;cancelAI();}
function newGame(n,h,d){cancelAI();game=E.create(n);human=h;difficulty=d;phase='playing';dead=[];result=null;hint=-1;wrong=-1;id='battle-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);save();render();if(active)scheduleAI();}
function load(raw){const r=E.restore(raw);if(!r)return false;game=r.game;human=r.human;difficulty=r.difficulty;phase=r.phase;dead=r.dead;result=r.result;id=r.id;updatedAt=r.updatedAt;hint=-1;wrong=-1;return true;}
function enter(){active=true;if(!game){newGame(9,1,0);}render();if(phase==='judging'||phase==='playing'&&game.passes>=2)autoFinish();else scheduleAI();}
function status(text,key,icon,kind=''){$('battleStatusText').textContent=text;$('battleStatus').setAttribute('data-say',key);$('battleStatusIcon').textContent=icon||'●';$('battleStatus').className='battle-status'+(kind?' '+kind:'');}
function canUndo(){return game&&phase==='playing'&&game.moves.some(m=>m.c===human);}
function scheduleAI(){
 if(!active||!game||phase!=='playing'||game.turn===human||busy||document.hidden)return;
 busy=true;render();const token=++ticket;
 timer=setTimeout(()=>{if(token!==ticket||!active||document.hidden)return;try{const p=E.choose(game,difficulty);if(token!==ticket)return;busy=false;apply(p,false);}catch(e){busy=false;status('电脑暂停了，点这里重试。','电脑重试','↻','error');console.warn('offline AI',e);} },450);
}
function apply(p,isHuman){
 if(!game||phase!=='playing'||(isHuman&&(busy||game.turn!==human)))return false;
 const r=E.play(game,p);if(!r.ok){wrong=p;const k=r.reason==='occupied'?'这里已经有棋子':r.reason==='suicide'?'这里没有气':r.reason==='ko'?'不能马上打劫':'点交叉点';status(k,k,'!','error');speak(k);renderBoard();return false;}
 hint=-1;wrong=-1;
 if(game.passes>=2){autoFinish();return true;}
 save();render();
 if(isHuman)scheduleAI();else if(p<0){status('电脑停一手，轮到你了。','电脑停一手','✋');speak('电脑停一手');}else if(active)speak('轮到你了');
 return true;
}
function ask(title,text,key,action,yes='✓ 确定',yesKey='对战确定'){
 dialogAction=action;$('battleDialogTitle').textContent=title;$('battleDialogText').textContent=text;$('battleDialogYes').textContent=yes;$('battleDialogYes').setAttribute('data-say',yesKey);$('battleDialog').hidden=false;speak(key);
}
function closeDialog(){$('battleDialog').hidden=true;dialogAction=null;}

function beginScoring(){cancelAI();phase='scoring';hint=-1;wrong=-1;save();render();speak('对战标记死子');}
function score(){const s=E.area(game.board,game.n,dead),komi=7.5,d=s.black-s.white-komi;return {black:s.black,white:s.white,neutral:s.neutral,komi,winner:d>0?1:d<0?2:0,margin:Math.abs(d),reason:'score',method:'manual',provisional:false,dead:dead.slice(),notes:[]};}
function autoFinish(){
 if(!game||phase==='finished')return;cancelAI();phase='judging';hint=-1;wrong=-1;save();render();speak('自动判胜负中');const token=++ticket;
 timer=setTimeout(()=>{if(token!==ticket||!active)return;try{const r=E.autoScore(game);dead=r.dead.slice();finish(r);}catch(e){phase='scoring';save();render();status('自动算分未完成，可以继续下或请家长检查。','自动判分失败','ⓘ');speak('自动判分失败');console.warn('automatic scoring',e);}},180);
}
function history(){const a=host.getState().battleHistory;return Array.isArray(a)?a:[];}
function cleanHistory(a){
 if(!Array.isArray(a))return [];
 const seen={},out=[];
 for(const x of a.slice(0,1000)){
  if(!x||typeof x.id!=='string'||typeof x.date!=='string'||!Number.isFinite(Date.parse(x.date))||[9,13,19].indexOf(x.n)<0||[1,2].indexOf(x.human)<0||[0,1,2].indexOf(x.winner)<0||[0,1,2].indexOf(x.difficulty)<0)continue;
  const row={id:x.id.slice(0,80),date:x.date.slice(0,35),updatedAt:typeof x.updatedAt==='string'&&Number.isFinite(Date.parse(x.updatedAt))?x.updatedAt.slice(0,35):x.date.slice(0,35),n:x.n,human:x.human,winner:x.winner,difficulty:x.difficulty,moves:Math.max(0,Math.min(3000,Math.floor(Number(x.moves)||0))),reason:x.reason==='resign'?'resign':'score',method:['auto','manual'].indexOf(x.method)>=0?x.method:'legacy',provisional:x.provisional===true,black:null,white:null,komi:null,margin:null,autoDead:Math.max(0,Math.min(x.n*x.n,Number(x.autoDead)||0)),unsettledGroups:Math.max(0,Math.min(x.n*x.n,Number(x.unsettledGroups)||0))};
  if(row.reason==='score'&&Number.isFinite(x.black)&&Number.isFinite(x.white)&&Number.isFinite(x.komi)&&x.black>=0&&x.white>=0&&x.black+x.white<=x.n*x.n&&Math.abs(x.komi)<=100){row.black=x.black;row.white=x.white;row.komi=x.komi;row.margin=Math.abs(x.black-x.white-x.komi);row.winner=x.black>x.white+x.komi?1:x.black<x.white+x.komi?2:0;}
  if(!seen[row.id]||row.updatedAt>seen[row.id].updatedAt)seen[row.id]=row;
 }
 for(const k of Object.keys(seen))out.push(seen[k]);return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
}
function cleanVoids(a){const m={};for(const x of Array.isArray(a)?a.slice(0,1000):[])if(x&&typeof x.id==='string'&&typeof x.date==='string'&&Number.isFinite(Date.parse(x.date)))if(!m[x.id]||m[x.id]<x.date)m[x.id]=x.date;return Object.keys(m).map(id=>({id:id.slice(0,80),date:m[id]}));}
function syncRows(rows){const v={};for(const x of cleanVoids(host.getState().battleVoids))v[x.id]=x.date;host.getState().battleHistory=cleanHistory(rows).filter(x=>!v[x.id]||x.updatedAt>v[x.id]);}
function resultVoice(r){return r.provisional?(r.winner===0?'估算和棋':r.winner===human?'估算你赢了':'估算电脑赢了'):(r.winner===0?'对战和棋':r.winner===human?'对战赢了':'对战结束鼓励');}
function finish(r){
 if(!game||!r||[0,1,2].indexOf(r.winner)<0)return;cancelAI();result=r;phase='finished';
 const rows=history().filter(x=>x.id!==id),date=stamp();
 rows.unshift({id,date,updatedAt:date,n:game.n,human,difficulty,moves:game.moves.length,winner:r.winner,reason:r.reason,method:r.method||'manual',provisional:!!r.provisional,black:r.black,white:r.white,komi:r.komi,margin:r.margin,autoDead:r.autoDead||0,unsettledGroups:r.unsettledGroups||0});
 host.getState().battleVoids=cleanVoids(host.getState().battleVoids).filter(x=>x.id!==id);syncRows(rows);save();render();renderRecords();speak(resultVoice(r));
}
function resumeGame(){
 if(!game)return;cancelAI();
 if(history().some(x=>x.id===id)){host.getState().battleHistory=history().filter(x=>x.id!==id);host.getState().battleVoids=cleanVoids((host.getState().battleVoids||[]).concat([{id,date:stamp()}]));}
 phase='playing';result=null;game.passes=0;dead=[];hint=-1;wrong=-1;save();render();renderRecords();scheduleAI();
}
function undo(){if(!canUndo())return;cancelAI();game=E.undo(game,human);hint=-1;wrong=-1;dead=[];save();render();speak('对战悔棋完成');scheduleAI();}
function suggest(){if(!game||phase!=='playing'||busy||game.turn!==human)return;hint=E.choose(game,2,()=>.5);wrong=-1;renderBoard();if(hint<0){status('没有合适的落点，可以停一手。','提示停一手','✋');speak('提示停一手');}else{speak('对战提示落点');}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderBoard(){
 if(!game)return;const n=game.n,margin=33,step=(600-2*margin)/(n-1),b=game.board;
 geometry={n,margin,step};const pos=p=>({x:margin+p%n*step,y:margin+Math.floor(p/n)*step});
 const scored=phase==='scoring'||phase==='finished'&&result&&result.reason==='score',territory=scored?E.area(b,n,dead):null;
 let svg='<defs><linearGradient id="battleWood" x2="1" y2="1"><stop stop-color="#eed6a6"/><stop offset="1" stop-color="#e4bf7e"/></linearGradient><radialGradient id="battleBlack" cx=".33" cy=".25" r=".8"><stop stop-color="#48504b"/><stop offset="1" stop-color="#101b16"/></radialGradient><radialGradient id="battleWhite" cx=".35" cy=".25" r=".85"><stop stop-color="#fffef6"/><stop offset="1" stop-color="#e7e5d9"/></radialGradient></defs><rect width="600" height="600" fill="url(#battleWood)"/>';
 for(let i=0;i<n;i++){const p=margin+i*step;svg+='<path d="M '+margin+' '+p+' H '+(600-margin)+' M '+p+' '+margin+' V '+(600-margin)+'" stroke="#7a613a" stroke-width="1.1"/>';}
 const letters='ABCDEFGHJKLMNOPQRST';for(let i=0;i<n;i++){const p=margin+i*step;svg+='<text x="'+p+'" y="18" text-anchor="middle" font-size="14" fill="#705c39">'+letters[i]+'</text><text x="14" y="'+(p+5)+'" text-anchor="middle" font-size="14" fill="#705c39">'+(n-i)+'</text>';}
 const stars=n===19?[3,9,15]:n===13?[3,6,9]:[2,4,6];for(const y of stars)for(const x of stars){if(n===9&&((x===4)!==(y===4)))continue;svg+='<circle cx="'+(margin+x*step)+'" cy="'+(margin+y*step)+'" r="2.8" fill="#705b39"/>';}
 const last=game.moves.length?game.moves[game.moves.length-1].p:-1;
 for(let p=0;p<b.length;p++){
  const q=pos(p),c=b[p],isDead=dead.indexOf(p)>=0;
  if(!c){if(territory&&territory.owner[p]){const rr=step*.13;svg+='<rect x="'+(q.x-rr)+'" y="'+(q.y-rr)+'" width="'+(rr*2)+'" height="'+(rr*2)+'" fill="'+(territory.owner[p]===1?'#1b3025':'#fffdf5')+'" stroke="#78653e" stroke-width=".6"/>';}continue;}
  const r=step*.435;svg+='<circle cx="'+(q.x+1)+'" cy="'+(q.y+2)+'" r="'+r+'" fill="#3e2f2025"/><circle cx="'+q.x+'" cy="'+q.y+'" r="'+r+'" fill="url(#'+(c===1?'battleBlack':'battleWhite')+')" stroke="'+(c===1?'#15231b':'#bbb9aa')+'" stroke-width=".8"'+(isDead?' opacity=".42"':'')+'/>';
  if(p===last&&!isDead)svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(step*.11)+'" fill="'+(c===1?'#fff8d0':'#205c49')+'"/>';
  if(isDead){const rr=step*.22;svg+='<path d="M '+(q.x-rr)+' '+(q.y-rr)+' L '+(q.x+rr)+' '+(q.y+rr)+' M '+(q.x-rr)+' '+(q.y+rr)+' L '+(q.x+rr)+' '+(q.y-rr)+'" stroke="#ad3e2f" stroke-width="3"/>';}
 }
 if(hint>=0&&phase==='playing'){const q=pos(hint);svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(step*.35)+'" fill="#fff9" stroke="#205c49" stroke-width="3" stroke-dasharray="5 3"/>';}
 if(wrong>=0&&wrong<b.length){const q=pos(wrong);svg+='<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(step*.35)+'" fill="none" stroke="#b1492e" stroke-width="3"/>';}
 $('battleBoard').innerHTML=svg;
 $('battleBoard').setAttribute('aria-label',n+'路围棋棋盘，'+(phase==='scoring'?'点击棋块标记或取消死子':'点击交叉点落子'));
 if(territory)$('battleScorePreview').innerHTML='<span>● '+territory.black+'</span><span>○ '+territory.white+' + 7.5</span>';
}
function render(){
 if(!game)return;
 $('battleSummary').textContent=game.n+' 路 · 你执'+(human===1?'黑棋 ●':'白棋 ○')+' · 白贴 7.5';
 $('battleMoveCount').textContent='已下 '+game.moves.length+' 手';$('battleCaptures').textContent='提子 ● '+game.captures[1]+' / ○ '+game.captures[2];
 $('battle').setAttribute('data-phase',phase);
 for(const el of document.querySelectorAll('[data-difficulty]')){const yes=Number(el.dataset.difficulty)===difficulty;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));el.disabled=phase!=='playing';}
 $('battleJudging').hidden=phase!=='judging';$('battlePlay').hidden=phase!=='playing';$('battleScoring').hidden=phase!=='scoring';$('battleResult').hidden=phase!=='finished';
 $('battleUndo').disabled=!canUndo();for(const key of ['battleHint','battlePass'])$(key).disabled=busy||game.turn!==human||phase!=='playing';
 $('battleScore').disabled=busy||game.turn!==human||!game.moves.length;
 $('battleResign').disabled=phase!=='playing';
 if(phase==='judging')status('正在自动计算胜负…','自动判胜负中','◷');
 else if(phase==='scoring')status('请和家长一起检查死子。','对战标记死子','▦');
 else if(phase==='finished')status(result&&result.provisional?'估算结果已保存，可请家长复核。':'胜负已保存到记录。','对战结果已保存','✓');
 else if(busy||game.turn!==human)status('电脑正在想…','电脑在想','◷');
 else status('轮到你了，放'+(human===1?'黑棋':'白棋')+'。',human===1?'请下黑棋':'请下白棋',human===1?'●':'○');
 $('battleTip').textContent=busy?'电脑正在选择落点。想改上一步，可以点“悔棋”。':game.moves.length===0?'先看棋盘，点击交叉点落子。':'圈点是刚刚落下的棋子。想改一改，就点“悔棋”。';
 const rows=history();$('battleRecord').textContent='本机已完成 '+rows.length+' 局 · 对局自动保存';
 if(phase==='finished'&&result){
  const won=result.winner===human,draw=result.winner===0;
  $('battleResultIcon').textContent=draw?'＝':won?'★':'♡';
  $('battleResultTitle').textContent=(result.provisional?'估算：':'')+(draw?'这一局和棋':won?'你赢啦！':'电脑赢了，再加油！');
  $('battleResultTitle').setAttribute('data-say',resultVoice(result));
  $('battleResultDetails').textContent=result.reason==='resign'?'认输结束，结果已记录。':('● '+Number(result.black)+' 点 · ○ '+Number(result.white)+' + '+Number(result.komi==null?7.5:result.komi)+' 点\n'+(draw?'双方分数相同。':(result.winner===1?'黑棋':'白棋')+'胜 '+Number(result.margin==null?Math.abs(result.black-result.white-7.5):result.margin)+' 点。'));
  $('battleResultDetails').textContent=$('battleResultDetails').textContent.replace(/\\n/g,'\n');
  $('battleResultCaution').textContent=result.provisional?'死活或早停有疑点：这是练习估算，不是最终裁判。':result.reason==='resign'?'认输胜负已确定。':result.method==='manual'?'已按家长确认的死子标记计分。':'按活棋子与围住的空点计算。';
  $('battleCorrect').hidden=result.reason==='resign';$('battleContinueAfter').hidden=result.reason==='resign';
 }

 renderBoard();if(host)host.layout();
}
function point(event){const r=$('battleBoard').getBoundingClientRect(),g=geometry;if(!g||!r.width)return -2;const x=(event.clientX-r.left)/r.width*600,y=(event.clientY-r.top)/r.height*600,xx=Math.round((x-g.margin)/g.step),yy=Math.round((y-g.margin)/g.step);if(xx<0||yy<0||xx>=g.n||yy>=g.n||Math.abs(x-g.margin-xx*g.step)>g.step*.48||Math.abs(y-g.margin-yy*g.step)>g.step*.48)return -2;return yy*g.n+xx;}
function boardClick(event){const p=point(event);if(p<0)return;if(phase==='scoring'){if(!game.board[p])return;const stones=E.group(game.board,p,game.n).stones;const remove=dead.indexOf(p)>=0;if(remove)dead=dead.filter(q=>stones.indexOf(q)<0);else dead=dead.concat(stones.filter(q=>dead.indexOf(q)<0));save();renderBoard();speak(remove?'取消死子标记':'已标记死子');return;}if(phase!=='playing')return;if(busy||game.turn!==human){speak('电脑在想');return;}apply(p,true);}
function updateSetup(){for(const [selector,field] of [['[data-board-size]','n'],['[data-human]','human'],['[data-setup-difficulty]','difficulty']])for(const el of document.querySelectorAll(selector)){const value=Number(el.getAttribute(selector.slice(1,-1)));const selected=value===setup[field];el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected));}}
function openSetup(){setup={n:game?game.n:9,human,difficulty};updateSetup();$('battleSetup').hidden=false;speak('设置新对局');}
function info(title,body){$('battleInfoClose').setAttribute('data-say',document.body.dataset.page==='progress'?'返回记录':'返回对战');$('battleInfoTitle').textContent=title;$('battleInfoBody').innerHTML=body;$('battleInfo').hidden=false;}
function exportSGF(){if(!game)return;const coords=p=>p<0?'':String.fromCharCode(97+p%game.n,97+Math.floor(p/game.n));let s='(;GM[1]FF[4]CA[UTF-8]SZ['+game.n+']KM[7.5]PB['+(human===1?'小棋手':'本地电脑')+']PW['+(human===2?'小棋手':'本地电脑')+']';if(result){s+='RE['+(result.winner===0?'0':(result.winner===1?'B':'W')+'+'+(result.reason==='resign'?'R':Math.abs(result.black-result.white-(result.komi==null?7.5:result.komi)) ))+']';if(result.provisional)s+='C[练习自动估算，死活未完全确认，结果需要复核。]';}for(const m of game.moves)s+=';'+(m.c===1?'B':'W')+'['+coords(m.p)+']';s+=')';host.download('围棋对战_'+new Date().toISOString().slice(0,10)+'.sgf',s,'application/x-go-sgf');}

function importProgress(incoming){
 host.getState().battleVoids=cleanVoids((host.getState().battleVoids||[]).concat(incoming.battleVoids||[]));
 syncRows(history().concat(Array.isArray(incoming.battleHistory)?incoming.battleHistory:[]));
 const raw=incoming.battle,voidRow=raw&&(host.getState().battleVoids||[]).find(x=>x.id===raw.id);
 if(raw&&E.restore(raw)&&(!voidRow||String(raw.updatedAt||'')>voidRow.date)&&(!game||String(raw.updatedAt||'')>updatedAt)){
  cancelAI();if(load(raw)){host.getState().battle=raw;render();if(active){if(phase==='judging')autoFinish();else scheduleAI();}}
 }
 renderRecords();
}
function recordOutcome(r){return r.winner===0?'和棋':r.winner===r.human?'你赢了':'电脑赢了';}
function recordVoice(r){return r.provisional?(r.winner===0?'估算和棋':r.winner===r.human?'估算你赢了':'估算电脑赢了'):(r.winner===0?'记录和棋':r.winner===r.human?'记录你赢了':'记录电脑赢了');}
function recordScore(r){return r.reason==='resign'?'认输结束':r.black==null?'旧版记录 · 未保存分数':'● '+r.black+' · ○ '+r.white+' + '+r.komi+(r.winner===0?' · 和棋':' · 胜 '+r.margin+' 点');}
function setRecordView(view){host.getState().recordView=view==='battle'?'battle':'lessons';host.save();renderRecords();}
function showRecords(){host.getState().recordView='battle';host.save();host.showTab('progress');renderRecords();}
function summary(rows){const win=rows.filter(r=>r.winner===r.human).length,draw=rows.filter(r=>r.winner===0).length,loss=rows.length-win-draw;return {total:rows.length,win,loss,draw,provisional:rows.filter(r=>r.provisional).length,rate:rows.length?Math.round(win/rows.length*100):0};}
function renderRecords(){
 if(!host||!$('battleRecordsPane'))return;
 const isBattle=host.getState().recordView==='battle';
 $('lessonRecordsPane').hidden=isBattle;$('battleRecordsPane').hidden=!isBattle;
 for(const el of document.querySelectorAll('[data-record-view]')){const yes=el.dataset.recordView===(isBattle?'battle':'lessons');el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));}
 $('progressTitle').textContent=isBattle?'我的对战记录':'我的闯关记录';
 $('progressDescription').textContent=isBattle?'胜负自动存本机 · 闯关成绩另存，不会混在一起。':'保留最佳成绩、挑战次数、通关次数和最近练习时间。';
 const all=history(),stat=summary(all);
 $('battleRecordMetrics').innerHTML=[[stat.win,'★ 赢了'],[stat.loss,'♡ 再加油'],[stat.draw,'＝ 和棋'],[stat.total?stat.rate+'%':'—','胜率']].map(([v,t])=>'<div><b>'+v+'</b><small>'+t+'</small></div>').join('');
 $('battleRecordTotals').textContent='最近 '+stat.total+' 局：胜 '+stat.win+' · 负 '+stat.loss+' · 和 '+stat.draw+'。'+(stat.provisional?'其中 '+stat.provisional+' 局为估算，已计入上述统计。':'')+' 未结束不计入；保留最近 100 局。';
 const rows=all.filter(r=>recordFilter==='all'||recordFilter==='win'&&r.winner===r.human||recordFilter==='loss'&&r.winner!==0&&r.winner!==r.human||recordFilter==='estimate'&&r.provisional);
 const size=window.innerHeight<600?2:window.innerHeight<760?3:5,totalPages=Math.max(1,Math.ceil(rows.length/size));recordsPage=Math.max(0,Math.min(recordsPage,totalPages-1));
 $('battleRecordList').innerHTML=rows.slice(recordsPage*size,recordsPage*size+size).map(r=>{
  const won=r.winner===r.human,draw=r.winner===0,date=new Date(r.date),time=date.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return '<button class="battle-record-row '+(draw?'draw':won?'won':'lost')+'" data-record-id="'+esc(r.id)+'" data-say="'+recordVoice(r)+'"><span class="record-medal" aria-hidden="true">'+(draw?'＝':won?'★':'♡')+'</span><span class="record-main"><strong>'+recordOutcome(r)+(r.provisional?' <em>估算待复核</em>':'')+'</strong><small>'+esc(time)+' · '+r.n+'路 · '+labels[r.difficulty]+' · 执'+(r.human===1?'黑':'白')+' · '+r.moves+'手</small></span><span class="record-score">'+recordScore(r)+'<small>'+(r.provisional?'自动估算':r.reason==='resign'?'认输结算':r.method==='manual'?'家长复核':r.method==='auto'?'自动计分':'旧版保存')+' ◖))</small></span></button>';
 }).join('')||'<div class="records-empty">⚔<br>还没有这类对战记录<br><small>完成一局后，胜负会自动出现在这里。</small></div>';
 $('battleRecordsPageLabel').textContent=(recordsPage+1)+' / '+totalPages+' 页';$('battleRecordsPrev').disabled=recordsPage<=0;$('battleRecordsNext').disabled=recordsPage>=totalPages-1;
 for(const el of document.querySelectorAll('[data-record-filter]'))el.classList.toggle('active',el.dataset.recordFilter===recordFilter);
}
function init(h){
 host=h;host.getState().battleVoids=cleanVoids(host.getState().battleVoids);syncRows(host.getState().battleHistory);
 if(host.getState().battle&&!load(host.getState().battle))host.toast('旧对战记录无法读取，闯关成绩不受影响。');
 $('battleBoard').addEventListener('click',boardClick);
 for(const el of document.querySelectorAll('[data-difficulty]'))el.onclick=()=>{difficulty=Number(el.dataset.difficulty);if(busy)cancelAI();save();render();scheduleAI();};
 $('battleUndo').onclick=undo;$('battleHint').onclick=suggest;
 $('battlePass').onclick=()=>{if(busy||game.turn!==human)return;ask('停一手？','这一手先不落子，让电脑下。双方都停一手后，会自动判胜负并保存记录。','对战停手确认',()=>apply(-1,true),'✋ 停一手','对战确认停手');};
 $('battleScore').onclick=()=>{if(busy||game.turn!==human||!game.moves.length)return;ask('现在自动判胜负？','将按当前盘面结束并保存这一局。还没下清楚或有复杂死活时，会标为估算；之后仍可继续下或请家长复核。','自动判分确认',autoFinish,'✓ 判胜负','确认自动判分');};
 $('battleResign').onclick=()=>ask('要结束这一局吗？','认输后这局结束。闯关记录不会改变。','对战认输确认',()=>finish({reason:'resign',winner:3-human}),'⚑ 确认认输','对战确认认输');
 $('battleNew').onclick=openSetup;$('battleAgain').onclick=openSetup;
 $('battleResume').onclick=resumeGame;
 $('battleFinish').onclick=()=>finish(score());
 $('battleCorrect').onclick=beginScoring;
 $('battleContinueAfter').onclick=()=>ask('继续下这一局？','会撤回本局的胜负记录，恢复下棋；下完后再结算。其他对局和闯关成绩不变。','撤回结算说明',resumeGame,'▶ 继续下','对战继续下棋');
 $('battleOpenRecords').onclick=showRecords;
 $('battleDialogNo').onclick=closeDialog;$('battleDialogYes').onclick=()=>{const action=dialogAction;closeDialog();if(action)action();};
 $('battleSetupClose').onclick=()=>{$('battleSetup').hidden=true;};
 for(const el of document.querySelectorAll('[data-board-size]'))el.onclick=()=>{setup.n=Number(el.dataset.boardSize);updateSetup();};
 for(const el of document.querySelectorAll('[data-human]'))el.onclick=()=>{setup.human=Number(el.dataset.human);updateSetup();};
 for(const el of document.querySelectorAll('[data-setup-difficulty]'))el.onclick=()=>{setup.difficulty=Number(el.dataset.setupDifficulty);updateSetup();};
 $('battleSetupGo').onclick=()=>{$('battleSetup').hidden=true;newGame(setup.n,setup.human,setup.difficulty);};
 $('battleStatus').onclick=()=>{if(phase==='playing'&&game.turn!==human&&!busy)scheduleAI();};
 $('battleHelp').onclick=()=>info('和电脑下围棋','<p>● 黑棋先走，○ 白棋后走。你和电脑轮流点击交叉点；没有气的棋子会被提走。</p><p>↶ <b>悔棋</b>：回到你上次落子前，也会撤销电脑随后的一手。💡 <b>提示</b>：圈出一个参考落点，不保证最优。</p><p>✋ <b>停一手</b>：不落子，把回合让给对手。双方连续停手后自动判胜负，并保存到记录。</p><p>▦ <b>判胜负</b>：按“活棋子 + 围住的空点”计面积，白棋加 7.5；已提走的棋子不另外加分。对明显包围的小块死棋作有限的本地分析；未确定的棋块留在盘上，结果标为<b>估算待复核</b>。这不是职业级裁判。复杂劫争、双活或未下完的局面，可请家长复核或继续下清楚。</p><p>⚑ <b>认输</b>和＋<b>新一局</b>都先确认。三档难度使用不同的本地启蒙选点策略，不对应专业棋力或段位。</p><p>题库与对战分别保存，切换不会清除成绩。备份导出的 JSON 也包含当前对局和最近结果。</p>');
 $('battleHistory').onclick=showRecords;
 for(const el of document.querySelectorAll('[data-record-view]'))el.onclick=()=>setRecordView(el.dataset.recordView);
 for(const el of document.querySelectorAll('[data-record-filter]'))el.onclick=()=>{recordFilter=el.dataset.recordFilter;recordsPage=0;renderRecords();};
 $('battleRecordsPrev').onclick=()=>{recordsPage--;renderRecords();};$('battleRecordsNext').onclick=()=>{recordsPage++;renderRecords();};
 $('battleRecordsPlay').onclick=()=>host.showTab('battle');
 $('battleRecordList').addEventListener('click',e=>{const el=e.target.closest('[data-record-id]');if(!el)return;const r=history().find(x=>x.id===el.dataset.recordId);if(!r)return;info('这局：'+recordOutcome(r),'<p>'+esc(new Date(r.date).toLocaleString('zh-CN'))+' · '+r.n+' 路 · '+labels[r.difficulty]+'难度 · 你执'+(r.human===1?'黑棋':'白棋')+'</p><p><b>'+recordScore(r)+'</b></p><p>'+(r.provisional?'本局为自动练习估算，未确定的棋块按存活暂计；不是经确认的最终死活判决。':r.reason==='resign'?'认输结算。':r.method==='manual'?'已按家长确认的死子标记计分。':r.method==='legacy'?'这是升级前的记录。旧版未保存黑白具体分数，无法补出。':'按盘面面积自动计分。')+'</p><p class="muted">胜率按最近保存的全部结果计算，估算记录也包含在内。</p>');});
 window.addEventListener('resize',()=>{if(document.body.dataset.page==='progress')renderRecords();});
 $('battleReview').onclick=()=>info('看看这盘棋','<p>棋盘保留了最终局面。想逐手回看，请导出这盘 SGF，然后在“备份”页导入，即可用看谱功能逐手查看。</p><button id="battleExportSGF" class="primary wide" data-say="导出对战棋谱">▣ 导出这盘 SGF</button>');
 $('battleInfoBody').addEventListener('click',e=>{if(e.target.closest('#battleExportSGF'))exportSGF();});
 $('battleInfoClose').onclick=()=>{$('battleInfo').hidden=true;};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDialog();$('battleSetup').hidden=true;$('battleInfo').hidden=true;}});
}
window.GoBattle={init,enter,leave,importProgress,render,save,play:p=>apply(p,true),undo,beginScoring,autoFinish,resumeGame,finish,score,newGame,exportSGF,renderRecords,showRecords,cleanHistory,summary,get game(){return game;},get human(){return human;},get phase(){return phase;},get result(){return result;},get busy(){return busy;},get geometry(){return geometry;},get difficulty(){return difficulty;},get dead(){return dead;},get active(){return active;}};
})();
