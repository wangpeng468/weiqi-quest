from pathlib import Path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import ast,mimetypes,json,time
R=Path(__file__).parent;ns={};tree=ast.parse((R/'test_repair.py').read_text())
for node in tree.body:
 if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['MOCK','NATIVEVOICE']:ns[node.targets[0].id]=ast.literal_eval(node.value)
old=ZipFile('/mnt/data/围棋背谱闯关_普通话B版_启动修复_v2.6.1.apk');new=ZipFile(next((R/'dist').glob('*.apk')));current=[old];base='https://appassets.androidplatform.net/assets/';origin=base[:-8]
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
 p=page({});p.evaluate('GoTrainer.startTraining()');p.evaluate('''()=>{while(GoTrainer.mode==='training'){let c=GoTrainer.current;GoTrainer.attempt(c.game.moves[c.start+GoTrainer.at].p)}}''');p.click('#nextLevel');p.click('#startTraining');state=p.evaluate('GoTrainer.state');seed=p.evaluate('mockStore');p.close()
 current[0]=new;p=page(seed);now=p.evaluate('GoTrainer.state');assert now['records']==state['records'];assert now['lastId']==state['lastId'];assert now['session']==state['session'];p.click('[data-tab=battle]');p.evaluate('GoBattle.play(20)');wait(p,'GoBattle.game.moves.length===2');assert p.evaluate('GoTrainer.state.records')==state['records'];seed=p.evaluate('mockStore');p.close()
 p=page(seed);p.click('[data-tab=battle]');assert p.evaluate('GoBattle.game.moves.length')==2;assert p.evaluate('GoTrainer.state.records')==state['records']
 # Clean demonstration images, separate from the migration records.
 p.close();p=page({});p.wait_for_timeout(120);p.screenshot(path=str(R/'tests-battle/title-preview.png'));p.click('[data-tab=battle]');p.click('[data-difficulty="1"]');p.evaluate('GoBattle.play(20)');wait(p,'GoBattle.game.moves.length===2');p.evaluate('GoBattle.play(60)');wait(p,'GoBattle.game.moves.length===4');p.wait_for_timeout(100);p.screenshot(path=str(R/'tests-battle/battle-preview.png'))
 p.set_viewport_size({'width':1004,'height':565});p.wait_for_timeout(100);p.screenshot(path=str(R/'tests-battle/battle-user-size.png'));p.click('[data-tab=practice]');p.wait_for_timeout(100);p.screenshot(path=str(R/'tests-battle/title-user-size.png'))
 p.click('[data-tab=battle]');p.click('#battleNew');p.wait_for_timeout(50);p.screenshot(path=str(R/'tests-battle/setup-user-size.png'))
 # All built-in title keys must have a bundled MP3.
 missing=p.evaluate('GoTrainer.levels.filter(l=>!ButtonVoice.has(l.title)).map(l=>l.title)');assert not missing,missing
 report={'oldVersion':'2.6.1','newVersion':'2.7.0','test':'actual old and new packaged webpages with copied mocked native/local storage; not Android installation','recordsUnchanged':True,'unfinishedLessonSessionUnchanged':True,'battleSavedAndRestored':True,'all548BuiltinTitleReadingsPresent':True};(R/'upgrade-simulation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(report);browser.close()
