/* Local Go rules and child-oriented tactical opponent. MIT.
 * No network, external engine, neural model or claimed rank.
 * Positional superko; no suicide; pass always legal; area = stones + surrounded empties.
 * Automatic scoring uses pass-alive regions and bounded local capture reading.
 * Unresolved groups are kept on the board and the result is explicitly provisional.
 */
(function(root){
'use strict';
const neighbours={};
function adjacent(n){if(neighbours[n])return neighbours[n];const a=[];for(let p=0;p<n*n;p++){const x=p%n,y=Math.floor(p/n),v=[];if(x)v.push(p-1);if(x<n-1)v.push(p+1);if(y)v.push(p-n);if(y<n-1)v.push(p+n);a.push(v);}return neighbours[n]=a;}
function key(b){return b.join('');}
function group(b,p,n){if(!b[p])return {stones:[],libs:[]};const ns=adjacent(n),colour=b[p],seen={},lib={},todo=[p],stones=[];seen[p]=1;while(todo.length){const q=todo.pop();stones.push(q);for(const v of ns[q]){if(!b[v])lib[v]=1;else if(b[v]===colour&&!seen[v]){seen[v]=1;todo.push(v);}}}return {stones,libs:Object.keys(lib).map(Number)};}
function analyse(b,n){const groups=[],at=new Array(b.length).fill(-1);for(let p=0;p<b.length;p++)if(b[p]&&at[p]<0){const g=group(b,p,n);g.c=b[p];for(const q of g.stones)at[q]=groups.length;groups.push(g);}return {groups,at};}
function tryMove(b,n,p,c,seen){
 if(!Number.isInteger(p)||p<0||p>=b.length)return {ok:false,reason:'outside'};
 if(b[p])return {ok:false,reason:'occupied'};
 const out=b.slice(),ns=adjacent(n);out[p]=c;let captured=[];
 for(const q of ns[p])if(out[q]===3-c){const g=group(out,q,n);if(!g.libs.length){for(const k of g.stones)out[k]=0;captured=captured.concat(g.stones);}}
 const own=group(out,p,n);if(!own.libs.length)return {ok:false,reason:'suicide'};
 const hash=key(out);if(seen&&seen[hash])return {ok:false,reason:'ko'};
 return {ok:true,board:out,captured,own,hash};
}
function create(n=9){if([9,13,19].indexOf(n)<0)throw Error('棋盘大小不支持');const b=new Array(n*n).fill(0);return {n,board:b,turn:1,passes:0,captures:[0,0,0],moves:[],hashes:[key(b)]};}
function play(s,p){
 if(p===-1){s.moves.push({p:-1,c:s.turn,captured:0});s.turn=3-s.turn;s.passes++;s.hashes.push(key(s.board));return {ok:true,passed:true,captured:[]};}
 const seen={};for(const h of s.hashes)seen[h]=true;const r=tryMove(s.board,s.n,p,s.turn,seen);if(!r.ok)return r;
 s.captures[s.turn]+=r.captured.length;s.moves.push({p,c:s.turn,captured:r.captured.length});s.board=r.board;s.turn=3-s.turn;s.passes=0;s.hashes.push(r.hash);return r;
}
function rebuild(n,moves){const s=create(n);for(const m of moves){if(!m||m.c!==s.turn||!Number.isInteger(m.p)||!play(s,m.p).ok)throw Error('对局记录包含无效落子');}return s;}
function undo(s,human){if(!s.moves.length)return s;let len=s.moves.length-1;while(len>0&&s.moves[len].c!==human)len--;if(s.moves[len].c!==human)return s;return rebuild(s.n,s.moves.slice(0,len));}
function area(b,n,dead=[]){
 const board=b.slice();for(const p of dead)if(Number.isInteger(p)&&p>=0&&p<board.length)board[p]=0;
 const ns=adjacent(n),seen={},owner=new Array(board.length).fill(0),score=[0,0,0];
 for(let p=0;p<board.length;p++){
  if(board[p]){score[board[p]]++;owner[p]=board[p];continue;}if(seen[p])continue;
  const todo=[p],region=[],touch={};seen[p]=1;
  while(todo.length){const q=todo.pop();region.push(q);for(const v of ns[q]){if(board[v])touch[board[v]]=true;else if(!seen[v]){seen[v]=1;todo.push(v);}}}
  const col=touch[1]&&!touch[2]?1:touch[2]&&!touch[1]?2:0;
  score[col]+=region.length;for(const q of region)owner[q]=col;
 }
 return {black:score[1],white:score[2],neutral:score[0],owner,board};
}
function eye(b,n,p,c){const ns=adjacent(n)[p];if(!ns.length||ns.some(q=>b[q]!==c))return false;let bad=0,off=0;const x=p%n,y=Math.floor(p/n);for(const dx of [-1,1])for(const dy of [-1,1]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)off++;else if(b[yy*n+xx]===3-c)bad++;}return off?bad===0:bad<=1;}
function staticValue(b,n,c){const a=analyse(b,n);let value=0;for(const g of a.groups){const sign=g.c===c?1:-1;value+=sign*(g.stones.length*3+(g.libs.length===1?-g.stones.length*13-7:g.libs.length===2?-g.stones.length*2:Math.min(g.libs.length,8)*.3));}return value;}
function candidates(s,level,limit){
 const b=s.board,n=s.n,c=s.turn,opp=3-c,ns=adjacent(n),info=analyse(b,n),seen={};for(const h of s.hashes)seen[h]=true;
 const list=[],step=s.moves.length,stoneCount=b.reduce((a,v)=>a+(v?1:0),0);
 for(let p=0;p<b.length;p++){
  if(b[p])continue;const move=tryMove(b,n,p,c,seen);if(!move.ok)continue;
  const ownEye=eye(b,n,p,c);let val=move.captured.length*24,save=0,threat=0,friend=0,enemy=0,unique={};
  for(const q of ns[p]){if(b[q]===c)friend++;else if(b[q]===opp)enemy++;const gi=info.at[q];if(gi<0||unique[gi])continue;unique[gi]=1;const g=info.groups[gi];if(g.c===c&&g.libs.length===1&&move.own.libs.length>1)save+=g.stones.length*22+8;if(g.c===opp&&g.libs.length===2)threat+=Math.min(g.stones.length,5)*4+6;}
  val+=save+threat;
  if(move.own.libs.length===1&&!move.captured.length)val-=40+move.own.stones.length*14;
  if(ownEye&&!move.captured.length)val-=70;
  const x=p%n,y=Math.floor(p/n),edge=Math.min(x,y,n-1-x,n-1-y),desired=n===9?2:3;
  let nearF=99,nearE=99;
  for(let q=0;q<b.length;q++)if(b[q]){const d=Math.abs(x-q%n)+Math.abs(y-Math.floor(q/n));if(b[q]===c)nearF=Math.min(nearF,d);else nearE=Math.min(nearE,d);}
  // Open with corners, extend with space; gradually fill neutral points, not own eyes.
  if(stoneCount<n*2){val+=Math.max(0,4-Math.abs(edge-desired))*1.5;const corners=[[desired,desired],[n-1-desired,desired],[desired,n-1-desired],[n-1-desired,n-1-desired]];let corner=99;for(const pt of corners)corner=Math.min(corner,Math.abs(x-pt[0])+Math.abs(y-pt[1]));val+=Math.max(0,4-corner)*1.5;if(nearF>=3&&nearF<=5)val+=3;if(nearF<=1)val-=3;if(edge===0)val-=7;if(enemy&&!move.captured.length)val-=2;}
  else {if(nearF<=3&&nearE<=4)val+=3;if(nearE===1)val+=1;if(nearF===1&&nearE>4)val-=5;if(edge===0&&nearE>2)val-=3;}
  if(friend>=2&&enemy===0&&!save)val-=friend*1.7;
  val+=Math.min(move.own.libs.length,5)*.5;
  list.push({p,val,move,ownEye,save,threat});
 }
 list.sort((a,b)=>b.val-a.val||a.p-b.p);return limit?list.slice(0,limit):list;
}
function choose(s,difficulty=1,random=Math.random){
 const list=candidates(s,difficulty,0);if(!list.length)return -1;
 const useful=list.filter(v=>!v.ownEye&&(v.move.own.libs.length>1||v.move.captured.length));if(!useful.length)return -1;
 // Answer a human pass with a pass once there is no tactical urgency and little disputed area.
 if(s.passes){const a=area(s.board,s.n);const danger=useful[0].save>0||useful[0].move.captured.length>0||useful[0].threat>=14;
  if(!danger&&(a.neutral<=Math.max(4,s.n)||s.moves.length>=s.n*s.n*1.3))return -1;
 }
 if(difficulty===0){const urgent=useful.filter(v=>v.move.captured.length>0||v.save>0);const pool=urgent.length&&random()<.7?urgent:useful.slice(0,Math.min(16,useful.length));return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].p;}
 if(difficulty===1){const best=useful[0].val,near=useful.filter(v=>v.val>=best-2).slice(0,5);return near[Math.min(near.length-1,Math.floor(random()*near.length))].p;}
 // Challenge level checks the strongest few local opponent replies (bounded two-ply search).
 const base=staticValue(s.board,s.n,s.turn),top=useful.slice(0,7);
 for(const candidate of top){const after={n:s.n,board:candidate.move.board,turn:3-s.turn,moves:s.moves.concat([{p:candidate.p,c:s.turn}]),hashes:s.hashes.concat([candidate.move.hash]),passes:0};
  const replies=candidates(after,1,4);let worst=staticValue(after.board,s.n,s.turn);
  if(replies.length)worst=Math.min(...replies.map(r=>staticValue(r.move.board,s.n,s.turn)));
  candidate.search=candidate.val*.6+(worst-base)*1.5+random()*.4;
 }
 top.sort((a,b)=>b.search-a.search);return top[0].p;
}

// Conservative pass-alive analysis: a chain needs two vital empty regions;
// removing an unsafe chain also removes regions that depend on its boundary.
// This deliberately does NOT label "not proven alive" as "dead".
function passAlive(board,n){
 const info=analyse(board,n),ns=adjacent(n),regions=[],visited={},alive={};
 for(let p=0;p<board.length;p++)if(!board[p]&&!visited[p]){
  const todo=[p],points=[],boundary={},colours={};visited[p]=1;
  while(todo.length){const q=todo.pop();points.push(q);for(const v of ns[q])if(board[v]){boundary[info.at[v]]=true;colours[board[v]]=true;}else if(!visited[v]){visited[v]=1;todo.push(v);}}
  const colour=colours[1]&&!colours[2]?1:colours[2]&&!colours[1]?2:0;
  if(colour)regions.push({points,boundary:Object.keys(boundary).map(Number),colour});
 }
 for(const c of [1,2]){
  const blocks={};info.groups.forEach((g,i)=>{if(g.c===c)blocks[i]=true;});
  const rs=regions.filter(r=>r.colour===c).map(r=>({boundary:r.boundary,vital:r.boundary.filter(i=>r.points.every(p=>info.groups[i].libs.indexOf(p)>=0))}));
  let changed=true;
  while(changed){changed=false;const valid=rs.filter(r=>r.boundary.every(i=>blocks[i]));const remove=Object.keys(blocks).map(Number).filter(i=>valid.filter(r=>r.vital.indexOf(i)>=0).length<2);for(const i of remove){delete blocks[i];changed=true;}}
  for(const i of Object.keys(blocks))for(const p of info.groups[i].stones)alive[p]=c;
 }
 return {alive,info};
}
// Only read small regions whose entire external stone boundary is pass-alive
// enemy stones. Defender moves first and every legal local defence must fail.
// Ko, depth/time limits, and large/open regions never become a dead-stone claim.
function localCapture(board,n,anchor,zone,hashes,budget){
 const defender=board[anchor],attacker=3-defender,initial={},ns=adjacent(n);
 for(const h of hashes||[])initial[h]=true;initial[key(board)]=true;
 function solve(b,turn,depth,seen,previousPass){
  if(!b[anchor])return 1;
  if(--budget.nodes<0||Date.now()>budget.end||depth<=0)return 0;
  const chain=group(b,anchor,n);
  if(chain.libs.some(p=>zone.indexOf(p)<0))return 0;
  const options=[];let ko=false;
  for(const p of zone)if(!b[p]){const r=tryMove(b,n,p,turn,seen);if(r.ok)options.push({p,r});else if(r.reason==='ko')ko=true;}
  if(ko)return 0; // A ko threat outside this local region may change the result.
  options.sort((a,b)=>b.r.captured.length-a.r.captured.length||(chain.libs.indexOf(a.p)>=0?-1:1)-(chain.libs.indexOf(b.p)>=0?-1:1));
  function child(o){const path=Object.assign({},seen);path[o.r.hash]=true;return solve(o.r.board,3-turn,depth-1,path,false);}
  if(turn===attacker){
   for(const o of options)if(child(o)===1)return 1;
   return 0; // Passing cannot establish a forced capture in this conservative reader.
  }
  // Defender may also pass; an empty set of stone moves is not proof of death.
  if(previousPass||solve(b,attacker,depth-1,seen,true)!==1)return 0;
  for(const o of options)if(child(o)!==1)return 0;
  return 1;
 }
 return solve(board,defender,Math.min(22,zone.length*2+6),initial,false)===1;
}
function autoScore(state,options={}){
 const n=state.n,original=state.board,ns=adjacent(n),dead=[],notes=[];
 const life=passAlive(original,n),visited={},regions=[];
 const budget={nodes:Math.max(0,Math.min(8000,Number(options.nodes)||2800)),end:Date.now()+Math.max(10,Math.min(1000,Number(options.timeMs)||300))};
 for(let p=0;p<original.length;p++)if(!life.alive[p]&&!visited[p]){
  const todo=[p],points=[],boundary={};visited[p]=1;
  while(todo.length){const q=todo.pop();points.push(q);for(const v of ns[q])if(life.alive[v])boundary[life.alive[v]]=true;else if(!visited[v]){visited[v]=1;todo.push(v);}}
  regions.push({points,boundary});
 }
 for(const region of regions){
  const attacker=region.boundary[1]&&!region.boundary[2]?1:region.boundary[2]&&!region.boundary[1]?2:0;
  if(!attacker||region.points.length>18)continue;
  const targets={};for(const p of region.points)if(original[p]===3-attacker)targets[life.info.at[p]]=true;
  for(const gi of Object.keys(targets)){
   const g=life.info.groups[gi];
   if(localCapture(original,n,g.stones[0],region.points,state.hashes,budget))for(const p of g.stones)dead.push(p);
  }
 }
 const after=original.slice();for(const p of dead)after[p]=0;
 const finalLife=passAlive(after,n),unsettled=[];
 for(const g of finalLife.info.groups)if(!finalLife.alive[g.stones[0]])unsettled.push(g.stones.slice());
 const a=area(original,n,dead),komi=7.5,difference=a.black-(a.white+komi),winner=difference>0?1:difference<0?2:0;
 const early=(state.moves||[]).filter(m=>m.p>=0).length<Math.floor(n*n*.25);
 if(unsettled.length)notes.push('有 '+unsettled.length+' 块棋的死活未确定，暂时留在盘上计分。');
 if(a.neutral)notes.push('双方交界的 '+a.neutral+' 个空点不计入任何一方。');
 if(early)notes.push('落子较少或提前结束，只能作为练习估算。');
 return {black:a.black,white:a.white,neutral:a.neutral,komi,winner,margin:Math.abs(difference),reason:'score',method:'auto',provisional:unsettled.length>0||early,unsettledGroups:unsettled.length,uncertain:unsettled.reduce((all,g)=>all.concat(g),[]),dead:dead.slice(),autoDead:dead.length,early,notes,algorithm:'conservative-area-v1'};
}

function restore(raw){
 if(!raw||raw.version!==1||[9,13,19].indexOf(raw.n)<0||[1,2].indexOf(raw.human)<0||!Array.isArray(raw.moves)||raw.moves.length>3000)return null;
 try{const game=rebuild(raw.n,raw.moves);if(raw.phase==='playing')game.passes=Math.min(2,Math.max(0,Number(raw.passes)||0));
  return {game,human:raw.human,mode:raw.mode==='local'?'local':'ai',difficulty:[0,1,2].indexOf(raw.difficulty)>=0?raw.difficulty:1,phase:['playing','scoring','finished','judging'].indexOf(raw.phase)>=0?raw.phase:'playing',dead:Array.isArray(raw.dead)?raw.dead.filter(p=>Number.isInteger(p)&&p>=0&&p<game.board.length&&game.board[p]):[],result:raw.result&&typeof raw.result==='object'?raw.result:null,id:typeof raw.id==='string'?raw.id.slice(0,80):'game-'+Date.now(),updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:''};
 }catch(e){return null;}
}
const api={adjacent,key,group,analyse,tryMove,create,play,rebuild,undo,area,eye,candidates,choose,restore,passAlive,localCapture,autoScore};root.BattleEngine=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
