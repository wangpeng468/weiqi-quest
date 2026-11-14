/* Regression tests for same-tablet two-player battles and backward-compatible results. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('./web-src/battle-engine.js');
const html = fs.readFileSync('assets/index.html', 'utf8');
const src = fs.readFileSync('web-src/battle.js', 'utf8');
for (const id of [...new Set([...src.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]))]) {
  assert(html.includes('id="' + id + '"'), 'Missing HTML element: ' + id);
}
function createHarness(originalState) {
  const nodes = Object.create(null), attrs = [];
  function el(id, attr = {}) {
    return {
      id, dataset: Object.fromEntries(Object.entries(attr).filter(([k]) => k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g, (_,c)=>c.toUpperCase()),v])),
      attributes: attr, hidden:false, disabled:false, innerHTML:'', textContent:'', className:'',
      classList:{toggle(){}}, setAttribute(k,v){this.attributes[k]=String(v);},
      getAttribute(k){return this.attributes[k];},addEventListener(){},
      querySelector(){return {textContent:''};}, getBoundingClientRect(){return {left:0,top:0,width:600,height:600};}
    };
  }
  for (const m of html.matchAll(/<button\b([^>]*)>/g)) {
    const attr = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
    if (attr.id) nodes[attr.id] = el(attr.id,attr);
    if (Object.keys(attr).some(k=>k.startsWith('data-'))) attrs.push(el(attr.id||'button',attr));
  }
  const document = {
    hidden:false,body:{dataset:{page:'battle'}},getElementById(id){return nodes[id] ||= el(id);},
    querySelectorAll(sel){const q=sel.match(/^\[(data-[\w-]+)(?:="([^"]+)")?\]$/);return q?attrs.filter(n=>Object.hasOwn(n.attributes,q[1])&&(q[2]===undefined||n.attributes[q[1]]===q[2])):[];},
    querySelector(sel){return this.querySelectorAll(sel)[0]||null;},addEventListener(){}
  };
  const window = {BattleEngine:E,innerHeight:800,addEventListener(){}};
  const spoken=[];
  const voice={say:key=>spoken.push(key)};
  vm.runInNewContext(src,{window,document,ButtonVoice:voice,console,setTimeout,clearTimeout,Date,Math}, {filename:'web-src/battle.js'});
  const state=originalState||{version:2,battle:null,battleHistory:[],battleVoids:[],recordView:'lessons'};
  const host={getState:()=>state,save(){},download(){},layout(){},toast(){},showTab(tab){document.body.dataset.page=tab;}};
  window.GoBattle.init(host);
  return {battle:window.GoBattle,state,document,nodes,spoken};
}
async function run(){
  const {battle:b,state,document,nodes}=createHarness();
  b.enter();assert.equal(b.mode,'ai','old users start in AI mode');
  nodes.battleNew.onclick();
  const modes=document.querySelectorAll('[data-opponent]');
  assert.equal(modes.length,2,'both opponent modes exist');
  modes[1].onclick();
  assert.equal(nodes.battleSetup.dataset.mode,'local');
  nodes.battleSetupGo.onclick();
  assert.equal(b.mode,'local');assert.equal(state.battle.mode,'local');
  assert.equal(nodes.battleModeTitle.textContent,'两个人下围棋');
  assert.equal(nodes.battleHint.disabled,false);
  assert.equal(b.play(0),true);assert.equal(b.game.turn,2);
  assert.equal(b.play(0),false,'occupied point rejected without changing turn');
  assert.equal(b.play(1),true);assert.equal(b.game.turn,1);
  assert.match(nodes.battleLiveScore.textContent,/临时计分/);
  assert.match(nodes.battleLiveScore.textContent,/7\.5/);
  b.undo();assert.equal(b.game.moves.length,1,'local undo removes only the last move');
  assert.equal(b.game.turn,2);
  assert.equal(b.play(1),true);
  nodes.battleHint.onclick();assert.match(nodes.battleInfoBody.innerHTML,/临时面积估算/);
  b.showRecords();assert.equal(state.recordView,'local');
  nodes.battlePass.onclick();nodes.battleDialogYes.onclick();
  assert.equal(b.game.passes,1);
  nodes.battlePass.onclick();nodes.battleDialogYes.onclick();
  await new Promise(resolve=>setTimeout(resolve,340));
  assert.equal(b.phase,'finished','two consecutive passes must finish game');
  assert.equal(state.battleHistory.length,1);
  assert.equal(state.battleHistory[0].mode,'local');
  assert.match(nodes.battleRecordList.innerHTML,/双人对战/);
  const originalId=state.battleHistory[0].id;
  b.beginScoring();assert.equal(b.phase,'scoring');
  b.finish(b.score());assert.equal(state.battleHistory.length,1,'manual score replaces previous result');
  assert.equal(state.battleHistory[0].id,originalId);assert.equal(state.battleHistory[0].method,'manual');
  const backup=JSON.parse(JSON.stringify(state));
  const recovered=createHarness({...backup,battleHistory:backup.battleHistory.slice()});
  assert.equal(recovered.battle.mode,'local','saved games restore in local mode');
  assert.equal(recovered.state.battleHistory[0].mode,'local');
  b.resumeGame();assert.equal(state.battleHistory.length,0,'continuation retracts saved result');
  assert.equal(b.phase,'playing');assert.equal(b.game.passes,0);
  b.newGame(9,1,0,'local');assert.equal(b.play(20),true);
  nodes.battleResign.onclick();nodes.battleDialogYes.onclick();
  assert.equal(state.battleHistory[0].winner,1,'resigning player loses to other color');
  assert.match(nodes.battleResultTitle.textContent,/黑棋胜/);
  b.newGame(9,1,0);assert.equal(b.mode,'ai','newGame with three args is backward-compatible');
  const legacy=[{id:'old-ai',date:'2026-11-01T00:00:00Z',n:9,human:1,winner:2,difficulty:1,moves:9}];
  assert.equal(b.cleanHistory(legacy)[0].mode,'ai','old history defaults to AI');
  const many=[];
  for(let i=0;i<120;i++){
    const row={...legacy[0],id:'ai-'+i,date:new Date(2026,10,1,0,i).toISOString(),winner:1};
    many.push(row,{...row,id:'local-'+i,mode:'local',winner:2});
  }
  const kept=b.cleanHistory(many);
  assert.equal(kept.length,200,'retain 100 games per mode');
  assert.equal(kept.filter(x=>x.mode==='local').length,100);
  assert.equal(kept.filter(x=>x.mode==='ai').length,100);
  const before=JSON.stringify(backup.battleHistory);
  recovered.battle.importProgress({battleHistory:legacy,battleVoids:[]});
  assert.equal(recovered.state.battleHistory.length,2,'old and local backup history merge');
  assert.equal(JSON.stringify(backup.battleHistory),before,'backup stays untouched');
  b.leave();recovered.battle.leave();
  console.log('PASS local 2-player: setup, alternating turns, live tally, single undo, double pass, scoring, records, save/restore, resign, legacy backup');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
