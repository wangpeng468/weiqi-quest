from pathlib import Path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import ast,mimetypes,json,time
R=Path(__file__).parent;ns={}
for node in ast.parse((R/'test_repair.py').read_text()).body:
 if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['MOCK','NATIVEVOICE']:ns[node.targets[0].id]=ast.literal_eval(node.value)
old=ZipFile('/mnt/data/围棋背谱闯关_离线对战版_v2.7.0.apk');new=ZipFile(R/'dist/围棋背谱闯关_自动胜负版_v2.8.0.apk');current=[old];base='https://appassets.androidplatform.net/assets/';origin=base[:-8]
assert old.read('classes.dex')==new.read('classes.dex')
checks=[]
def check(s):checks.append(s);print('PASS',s,flush=True)
def wait(p,expr):
 for _ in range(250):
  if p.evaluate(expr):return
  p.wait_for_timeout(40)
 raise RuntimeError(expr)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
 def route(r):
  u=r.request.url;assert u.startswith(base);name='assets/'+u[len(base):];r.fulfill(body=current[0].read(name),content_type=mimetypes.guess_type(name)[0] or 'text/plain')
 ctx.route('**/*',route)
 def page(seed):
  p=ctx.new_page();p.evaluate(ns['MOCK'],seed);p.evaluate(ns['NATIVEVOICE']);html=current[0].read('assets/index.html').decode().replace("'self'","'self' "+origin).replace("base-uri 'none'","base-uri "+origin).replace('<script src="boot.js">','<base href="'+base+'"><script src="boot.js">');p.set_content(html,wait_until='load');wait(p,'window.GoTrainer && AppBoot.state().ready');return p
 p=page({});p.evaluate('GoTrainer.startTraining()');p.evaluate("()=>{while(GoTrainer.mode==='training'){let c=GoTrainer.current;GoTrainer.attempt(c.game.moves[c.start+GoTrainer.at].p)}}");p.click('#nextLevel');p.click('#startTraining')
 p.click('[data-tab=battle]');p.evaluate('GoBattle.play(20)');wait(p,'GoBattle.game.moves.length===2 && !GoBattle.busy');p.click('#battleResign');p.click('#battleDialogYes');p.evaluate('GoBattle.newGame(13,1,1)');p.evaluate('GoBattle.play(42)');wait(p,'GoBattle.game.moves.length===2 && !GoBattle.busy');state=p.evaluate('GoTrainer.state');seed=p.evaluate('mockStore');p.close()
 current[0]=new;p=page(seed);now=p.evaluate('GoTrainer.state');assert now['records']==state['records'];assert now['lastId']==state['lastId'];assert now['session']==state['session'];check('actual v2.7 packaged lesson scores and unfinished lesson retained')
 p.click('[data-tab=battle]');assert p.evaluate('GoBattle.game.moves.map(m=>({p:m.p,c:m.c}))')==state['battle']['moves'];assert p.evaluate('GoBattle.game.n')==13;assert len(now['battleHistory'])==1
 for field in ['id','date','n','human','winner','difficulty','moves','reason']:assert now['battleHistory'][0][field]==state['battleHistory'][0][field]
 check('v2.7 win/loss record and unfinished 13x13 match preserved')
 p.click('#battleScore');p.click('#battleDialogYes');wait(p,"GoBattle.phase==='finished'");assert p.evaluate('GoTrainer.state.battleHistory.length')==2;assert p.evaluate('GoTrainer.state.battleHistory[0].black') is not None;check('new result coexists with legacy record; old missing scores not invented')
 p.evaluate('GoBattle.newGame(9,1,0)');p.evaluate('GoBattle.autoFinish();GoBattle.leave()');seed=p.evaluate('mockStore');p.close();p=page(seed);p.click('[data-tab=battle]');wait(p,"GoBattle.phase==='finished'");assert p.evaluate('GoTrainer.state.battleHistory.length')==3;check('interrupted automatic judging resumes once after app reopen')
 # All lessons still compile and have title recordings after the package update.
 missing=p.evaluate('GoTrainer.levels.filter(l=>!ButtonVoice.has(l.title)).map(l=>l.title)');assert not missing
 count=p.evaluate('''()=>{let count=0; for(const l of GoTrainer.levels){if(l.game){GoEngine.compile(l.game);count++;}}return count;}''');assert count==548;check('all 548 bundled lessons compile, all 548 title-read keys available')
 report={'oldVersion':'2.7.0','newVersion':'2.8.0','environment':'actual packaged webpages and copied mock native/local storage, not an Android installation test','checks':checks,'unchangedNativeDex':True,'passed':True};(R/'upgrade-28-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));browser.close()
