/* 围棋背谱闯关 — local Go/SGF engine, MIT. No network dependencies. */
'use strict';
const GoEngine = (() => {
  const chars='abcdefghijklmnopqrstuvwxyz';
  function coord(s,n){
    if(s==='' || (s==='tt'&&n<=19))return -1;
    if(!/^[a-z]{2}$/.test(s))throw Error('棋谱坐标格式不正确：'+s);
    const x=chars.indexOf(s[0]), y=chars.indexOf(s[1]);
    if(x>=n||y>=n)throw Error('棋谱坐标超出棋盘：'+s);
    return y*n+x;
  }
  function sgfPoint(p,n){return p<0?'':chars[p%n]+chars[Math.floor(p/n)];}
  function neighbors(p,n){let a=[];if(p%n)a.push(p-1);if(p%n<n-1)a.push(p+1);if(p>=n)a.push(p-n);if(p<n*(n-1))a.push(p+n);return a;}
  function group(board,p,n){
    const stones=[],libs=new Set(),seen=new Set([p]),todo=[p],c=board[p];
    while(todo.length){const q=todo.pop();stones.push(q);for(const r of neighbors(q,n)){if(!board[r])libs.add(r);else if(board[r]===c&&!seen.has(r)){seen.add(r);todo.push(r);}}}
    return {stones,libs};
  }
  function play(board,p,color,n,previous=null){
    if(p===-1)return {board:board.slice(),captured:[]};
    if(!Number.isInteger(p)||p<0||p>=n*n)throw Error('落点超出棋盘');
    if(board[p])throw Error('这个位置已有棋子');
    const b=board.slice();b[p]=color;const captured=[];
    for(const q of neighbors(p,n))if(b[q]&&b[q]!==color){const g=group(b,q,n);if(!g.libs.size){for(const r of g.stones){b[r]=0;captured.push(r);}}}
    if(!group(b,p,n).libs.size)throw Error('棋谱出现自杀着法，当前版本不支持');
    if(previous && b.every((v,i)=>v===previous[i]))throw Error('棋谱出现立即回提劫的着法');
    return {board:b,captured};
  }
  function parseTrees(text){
    if(typeof text!=='string'||text.length>3000000)throw Error('SGF 文件过大（上限 3 MB 文本）');
    text=text.replace(/^\uFEFF/,'');let i=0,count=0;
    const ws=()=>{while(i<text.length&&/\s/.test(text[i]))i++;};
    function value(){
      if(text[i++]!=='[')throw Error('SGF 缺少左括号');let out='';
      while(i<text.length){let c=text[i++];if(c===']')return out;if(c==='\\'){if(i>=text.length)break;c=text[i++];if(c==='\r'){if(text[i]==='\n')i++;continue;}if(c==='\n')continue;}out+=c;}
      throw Error('SGF 属性没有结束');
    }
    function node(){
      i++;if(++count>30000)throw Error('SGF 节点过多');const p=Object.create(null);ws();
      while(i<text.length&&/[A-Za-z]/.test(text[i])){let key='';while(i<text.length&&/[A-Za-z]/.test(text[i]))key+=text[i++];key=key.toUpperCase();ws();const vals=[];while(text[i]==='['){vals.push(value());ws();}if(!vals.length)throw Error('SGF 属性缺少值：'+key);p[key]=(p[key]||[]).concat(vals);}
      return p;
    }
    function tree(depth){
      if(depth>128)throw Error('SGF 变化分支过深');if(text[i++]!=='(')throw Error('SGF 格式错误');ws();const seq=[],children=[];
      while(text[i]===';'){seq.push(node());ws();}
      if(!seq.length)throw Error('SGF 棋谱没有节点');
      while(text[i]==='('){children.push(tree(depth+1));ws();}
      if(text[i++]!==')')throw Error('SGF 缺少结束括号');return {seq,children};
    }
    ws();const trees=[];while(i<text.length){if(text[i]!=='(')throw Error('不是有效的 SGF 文件（应以 (; 开始）');trees.push(tree(0));ws();}if(!trees.length)throw Error('SGF 文件为空');return trees;
  }
  function mainline(t){let a=[];while(t){a.push(...t.seq);t=t.children[0];}return a;}
  function expand(s,n){
    if(!s.includes(':'))return [coord(s,n)];
    const parts=s.split(':');if(parts.length!==2)throw Error('摆子范围错误');const a=coord(parts[0],n),b=coord(parts[1],n);if(a<0||b<0)throw Error('摆子范围不能为空');
    const x=a%n,y=Math.floor(a/n),xx=b%n,yy=Math.floor(b/n),out=[];if(x>xx||y>yy)throw Error('摆子范围方向错误');for(let j=y;j<=yy;j++)for(let k=x;k<=xx;k++)out.push(j*n+k);return out;
  }
  function fromTree(t,fallback='导入棋谱'){
    const nodes=mainline(t),root=nodes[0],sizeText=(root.SZ||['19'])[0];
    if(root.GM&&root.GM[0]!=='1')throw Error('这个文件不是围棋棋谱');
    if(!/^\d+$/.test(sizeText))throw Error('暂不支持长方形棋盘');const n=Number(sizeText);if(n<2||n>25)throw Error('支持 2–25 路棋盘');
    const board=Array(n*n).fill(0),moves=[];let begun=false;
    for(const node of nodes){
      if(node.AB||node.AW||node.AE){if(begun)throw Error('暂不支持对局中途增删摆子的 SGF，请另存为纯对局主线');const placed=new Set();for(const [key,c] of [['AE',0],['AB',1],['AW',2]])for(const s of node[key]||[])for(const p of expand(s,n)){if(p<0)throw Error('初始摆子坐标为空');if(placed.has(p))throw Error('同一节点的摆子坐标重复或冲突');placed.add(p);board[p]=c;}}
      if(node.B&&node.W)throw Error('同一节点同时包含黑棋和白棋');
      for(const [key,c] of [['B',1],['W',2]])if(node[key]){if(node[key].length!==1)throw Error('落子节点包含多个落点');begun=true;moves.push({c,p:coord(node[key][0],n)});}
    }
    if(!moves.length)throw Error('这个棋谱只有摆子，没有可背的落子手顺');if(moves.length>2500)throw Error('单谱主线不能超过 2500 手');
    const pair=[root.PB?.[0],root.PW?.[0]].filter(Boolean).join(' 对 ');
    return {n,initial:board,moves,title:root.GN?.[0]||pair||fallback,date:root.DT?.[0]||'',players:pair};
  }
  function parse(text,fallback){return parseTrees(text).map(t=>fromTree(t,fallback));}
  function compile(g){
    let b=g.initial.slice(),nums=Array(g.n*g.n).fill(0),prev=null;const boards=[b],numbers=[nums];
    for(let i=0;i<g.moves.length;i++){
      const m=g.moves[i];if(m.c!==1&&m.c!==2)throw Error('棋子颜色无效');let next;
      try{next=play(b,m.p,m.c,g.n,prev);}catch(e){throw Error('主线第 '+(i+1)+' 手：'+e.message);}
      nums=nums.slice();for(const p of next.captured)nums[p]=0;if(m.p>=0)nums[m.p]=i+1;prev=b;b=next.board;boards.push(b);numbers.push(nums);
    }
    return {...g,boards,numbers};
  }
  function rotate(g,k){
    const n=g.n,point=p=>{if(p<0)return p;let x=p%n,y=Math.floor(p/n);for(let i=0;i<k;i++)[x,y]=[n-1-y,x];return y*n+x;};
    const initial=Array(n*n).fill(0);g.initial.forEach((c,p)=>{initial[point(p)]=c;});return {...g,initial,moves:g.moves.map(m=>({c:m.c,p:point(m.p)}))};
  }
  function seed(n,ab,aw,seq,first=1){const initial=Array(n*n).fill(0);for(const s of (ab||'').split(/\s+/).filter(Boolean))initial[coord(s,n)]=1;for(const s of (aw||'').split(/\s+/).filter(Boolean))initial[coord(s,n)]=2;return {n,initial,moves:seq.split(/\s+/).filter(Boolean).map((s,i)=>({c:i%2?3-first:first,p:coord(s==='--'?'':s,n)}))};}
  function toSGF(g){const a=[],w=[];g.initial.forEach((c,p)=>{if(c===1)a.push(sgfPoint(p,g.n));if(c===2)w.push(sgfPoint(p,g.n));});return '(;GM[1]FF[4]CA[UTF-8]SZ['+g.n+']'+(a.length?'AB['+a.join('][')+']':'')+(w.length?'AW['+w.join('][')+']':'')+g.moves.map(m=>';'+(m.c===1?'B':'W')+'['+sgfPoint(m.p,g.n)+']').join('')+')';}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36);}
  return {coord,sgfPoint,neighbors,group,play,parseTrees,mainline,parse,compile,rotate,seed,toSGF,hash};
})();
if(typeof module!=='undefined')module.exports=GoEngine;
