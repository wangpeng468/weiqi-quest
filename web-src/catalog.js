/* Sources are credited in the application and SOURCES.md. */
'use strict';
const STARTER_SEEDS = [
 ['角上提一子','ba','aa','ab','填掉最后一口气，角上的白子就会被提走。'],
 ['边上提一子','aa ca','ba','bb','先数气，再观察提子后留下的空点。'],
 ['中间提一子','cd dc ed','dd','de','白子只剩一口气；记住最后一手的位置。'],
 ['提走相连两子','cd ce dc ed ee','dd de','df','连在一起的两颗白子，共用最后一口气。'],
 ['提走一串三子','ab ac ad cb cc cd ba','bb bc bd','be','把一整串棋子的气一起数。'],
 ['打吃、逃跑、紧气','cd dc','dd','ed de ce','黑棋先打吃，白棋逃跑，再记住黑棋的回应。'],
 ['向外逃出打吃','dd','cd dc ed','de ce df','先伸出去，再沿着开阔处继续走。'],
 ['补上连接点','cc dd','cd','dc bc ec','黑棋先连接，再把三手连起来记。'],
 ['三个角 · 3 手','','','cc gg gc','这是落点顺序记忆，不是最佳布局推荐。'],
 ['四个角 · 4 手','','','cc gg cg gc','看看落点经过了哪几个角。'],
 ['找到天元 · 5 手','','','cc gg cg gc ee','四角之后，再记住棋盘正中。'],
 ['星位之间 · 6 手','','','cc gg gc cg ce ge','把六手拆成前后三手观察。'],
 ['不同的角部落点','','','cd fg cf gd','关注三线、四线的差别。'],
 ['沿边移动 · 5 手','','','cc gg ec eg gc','先看上下位置，再记左右顺序。'],
 ['连着长 · 5 手','','','cc gg cd gf ce','分别观察黑棋和白棋的延伸方向。'],
 ['小跳步 · 5 手','','','cc gg ce ge cg','记住中间隔开的交叉点。'],
 ['斜着相遇 · 5 手','','','cc gg dd ff ee','黑白棋逐步靠近中间。'],
 ['大跳步 · 5 手','','','bc hg ec eg hc','这一关的落点距离更远。'],
 ['两边展开 · 6 手','','','cc gg fc dg ec fg','观察双方各自的三颗棋子。'],
 ['中间会合 · 6 手','','','cd fg dd ff ed ef','分清上下两排，交替记忆。'],
 ['左右两列 · 6 手','','','cc gc cd gd ce ge','先按列看棋形，再按手数复摆。'],
 ['上下一起走 · 8 手','','','cc cg dc dg ec eg fc fg','可以先看前四手，再看后四手。'],
 ['边与角 · 8 手','','','cb gh db fh fb dh gb ch','用左右分组帮助记忆。'],
 ['围绕中点 · 8 手','','','cd fg dc gf de fe ed ef','这是顺序记忆图，不用于判断实战好坏。']
];
const GGG_EXCERPTS = [
 ['op pp qp rp sp mq oq nr qs','pq qq sq or qr sr os','rs rr ns'],
 ['qo ro so qp nq oq pq nr ns qs','rp qq sq or pr qr sr os','rs sp rr'],
 ['po ro np pp rp oq qq or os','qp pq rq sq pr rr ps','ss rs qr qs qq'],
 ['pq rq sq pr ps','op pp qp rp sp oq or os','rs'],
 ['sr oq or os qr rr ss','ns nr nq np op pp qq rp rs','pq ps pr'],
 ['np nq nr ns op po qo rp rq os','oq or pp qq qr rr sr qs ps','pq pr qp'],
 ['rq or pr qr os qs ss','qp rp sp mq oq pq nr rr','qq sq sr rs sr ss sr'],
 ['pq or pr rr sr','op pp qp rp mq oq rq sq nr','qq qs rs os qr ns ps'],
 ['pq rq pr rr ps','op pp qp rp sp oq or os','rs'],
 ['pp oq qq nr or qr rr rs','qn po np op qp rp lq nq rq mr sr','ps pq ns'],
 ['or pr qr os rs','rp sp nq oq pq qq nr ps','sr rq rr'],
 ['rp sp rq pr rr ps','po qo ro so oq pq sq or os rs','qr sr qs']
];
const CLASSIC_SEEDS = [
 {id:'1835',name:'1835 年经典对局',detail:'本因坊丈和 对 赤星因彻 · 通称“呕血之局”',file:'1835-blood-vomiting-game.sgf',moves:'cp pq qd ed oc eq qo qk qi op iq dn ep dp do dq co eo fp cq bq br cm gr hp en bp ck dl dk el gn cr dr bs fq go ar hn gm hm gl ek hl di io ho fo ch cd lq pn gc qn dc cc ec cf il gp nq ic fd lc bg bf af bi dj eh fj qg oi qe pd nf ok pk ol pj'},
 {id:'1846',name:'秀策 · 耳赤之局',detail:'1846 年 · 秀策 对 井上幻庵因硕',file:'1846-ear-reddening-game.sgf',moves:'qd dc pq oc cp cf ep qo pe np po pp op qp oq oo pn qq nq on pm om pl mp mq ol pk lq lr kr lp kq qr rr rs mr nr pr ps qs no mo qr rm rl qs lo mn qr qm or ql qj rj ri rk ln mm qi rq jn ls ns gq go ck kc ic pc nj ke og oh pb qb ng mi mj nd ph'},
 {id:'1933',name:'吴清源 · 1933 年名局',detail:'吴清源 对 本因坊秀哉',file:'1933-game-of-the-century.sgf',moves:'qc cd dp pq jj pd qd pe ob qn jp lq dj ed lo nq kq lp ko ch gj fq fo iq gp cq cp dq nd ph pj ne me mf nf ng oe of ne nj om mg ke hc qm rm rn rl ro pm ql qk pl pn pk qj nl pi qp on nn no mo op qr qq rq pr rr mn nm lm ll kp mp mq ip jq kk cn'},
 {id:'2017',name:'柯洁 对 AlphaGo · 第 1 局',detail:'2017 年 5 月 23 日 · 乌镇',file:'2017-alphago-ke-jie-game-1.sgf',moves:'qd pp cc cp nc fp qq pq qp qn qo po rn qr rr rm pr or pn qm qs on dj nk ph ch cf eh ci de df dc cd dd ef di ei dh cj ce be bf bg bd af bc fi cm hq ek fh gq hp ej eq gr cq dp dq ep bp bh ah bo bq fg gg kp ko jo jn in jp io lp kq lq kr lr ir'}
];
const GGG_OFFLINE = window.BUNDLED_GAMES;
const CATEGORY = {starter:'启蒙练习',easy:'公开初级题',intermediate:'公开中级题',hard:'公开高级题',classic:'名局分段',imported:'我的棋谱'};
function gggSource(d,i){return 'https://github.com/gogameguru/go-problems/blob/master/weekly-go-problems/'+d+'/ggg-'+d+'-'+String(i).padStart(2,'0')+'.sgf';}
function makeCatalog(extraDocs=[]) {
 const levels=[];
 for(let r=0;r<4;r++)STARTER_SEEDS.forEach((a,i)=>{
  const g=GoEngine.rotate(GoEngine.seed(9,a[1],a[2],a[3]),r);
  levels.push({id:'s-'+String(i+1).padStart(2,'0')+'-r'+r,group:'starter',title:a[0],subtitle:r===0?'原方向':'旋转 '+(r*90)+'° 复习',note:a[4],game:g,start:0,end:g.moves.length,builtin:true,source:'原创教学示例。共 24 个基础图，各含 4 个方向；方向练习不是新增棋谱。',license:'CC0-1.0'});
 });
 for(const d of ['easy','intermediate','hard'])for(let i=1;i<=140;i++){
   const game=GGG_OFFLINE['ggg-'+d+'-'+i];if(!game)throw Error('安装包缺少棋谱：'+d+'-'+i);
   levels.push({id:'ggg-'+d+'-'+i,group:d,title:({easy:'初级',intermediate:'中级',hard:'高级'})[d]+'第'+i+'关',subtitle:'参考主线记忆',note:'先看主线，再复摆。其他着法不一定错误；这里只检查与参考手顺是否一致。',game,start:0,end:game?.moves.length||0,builtin:true,source:gggSource(d,i),license:'Go Game Guru · CC BY-NC-SA 4.0'});
 }
 for(const c of CLASSIC_SEEDS){const g=GoEngine.seed(19,'','',c.moves);for(let start=0;start<g.moves.length;start+=10)levels.push({id:'c-'+c.id+'-'+start,group:'classic',title:c.name,subtitle:'第 '+(start+1)+'–'+Math.min(start+10,g.moves.length)+' 手',note:c.detail+'。本关保留前面的局面，只背当前 10 手。内置的是前 80 手节选。',game:g,start,end:Math.min(start+10,g.moves.length),builtin:true,source:'https://github.com/akitaonrails/frank_go/blob/main/data/games/famous/'+c.file,license:'公开对局记录（不含原解说）'});}
 for(const doc of extraDocs.filter(x=>x.id.startsWith('import-'))){try{const games=GoEngine.parse(doc.sgf,doc.title);games.forEach((g,j)=>{for(let start=0;start<g.moves.length;start+=10)levels.push({id:doc.id+'-g'+j+'-p'+start,docId:doc.id,gameIndex:j,group:'imported',title:doc.title||g.title,subtitle:'第 '+(j+1)+' 谱 · '+(start+1)+'–'+Math.min(start+10,g.moves.length)+' 手',note:'用户导入：只读取每个棋谱的第一个变化主线；已有摆子保留。',game:g,start,end:Math.min(start+10,g.moves.length),builtin:true,source:'用户本地导入，不上传',license:'版权归原权利人'});});}catch(e){console.warn('跳过无效导入',doc.id,e.message);}}
 return levels;
}
if(typeof module!=='undefined')module.exports={STARTER_SEEDS,GGG_EXCERPTS,CLASSIC_SEEDS,CATEGORY,makeCatalog,gggSource};
