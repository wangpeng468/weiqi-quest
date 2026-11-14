/* Local compatibility helpers. No CDN, external scripts, or runtime downloads. */
(function (w) {
 'use strict';
 function define(obj, name, value) { if (!obj[name]) Object.defineProperty(obj, name, {configurable:true,writable:true,value:value}); }
 define(Object,'assign',function(target){ if(target==null) throw new TypeError('Object.assign'); var t=Object(target),i,k,s; for(i=1;i<arguments.length;i++){s=arguments[i];if(s!=null) for(k in s) if(Object.prototype.hasOwnProperty.call(s,k)) t[k]=s[k];} return t; });
 define(Object,'values',function(obj){return Object.keys(Object(obj)).map(function(k){return obj[k];});});
 define(Object,'entries',function(obj){return Object.keys(Object(obj)).map(function(k){return [k,obj[k]];});});
 define(Object,'fromEntries',function(entries){var out={},i;for(i=0;i<entries.length;i++)out[entries[i][0]]=entries[i][1];return out;});
 define(Number,'isFinite',function(n){return typeof n==='number'&&isFinite(n);});
 define(Number,'isInteger',function(n){return Number.isFinite(n)&&Math.floor(n)===n;});
 define(Array,'from',function(a){return Array.prototype.slice.call(a);});
 define(Array.prototype,'includes',function(v,start){for(var i=Math.max(0,(start||0)<0?this.length+(start||0):(start||0));i<this.length;i++)if(this[i]===v||(this[i]!==this[i]&&v!==v))return true;return false;});
 define(Array.prototype,'find',function(fn,ctx){for(var i=0;i<this.length;i++)if(fn.call(ctx,this[i],i,this))return this[i];});
 define(Array.prototype,'findIndex',function(fn,ctx){for(var i=0;i<this.length;i++)if(fn.call(ctx,this[i],i,this))return i;return -1;});
 define(Array.prototype,'flatMap',function(fn,ctx){return Array.prototype.concat.apply([],this.map(fn,ctx));});
 define(String.prototype,'includes',function(text,start){return this.indexOf(text,start||0)!==-1;});
 define(String.prototype,'startsWith',function(text,start){start=start||0;return this.slice(start,start+text.length)===text;});
 define(String.prototype,'endsWith',function(text,end){var s=String(this);end=end===undefined?s.length:Math.min(end,s.length);return s.slice(end-text.length,end)===text;});
 define(String.prototype,'repeat',function(count){count=Math.floor(count);if(count<0||!isFinite(count))throw new RangeError('repeat');var out='',s=String(this);while(count>0){if(count%2)out+=s;count=Math.floor(count/2);if(count)s+=s;}return out;});
 define(String.prototype,'padStart',function(len,pad){var s=String(this);pad=String(pad===undefined?' ':pad);if(s.length>=len||!pad)return s;return pad.repeat(Math.ceil((len-s.length)/pad.length)).slice(0,len-s.length)+s;});
 if(w.NodeList)define(NodeList.prototype,'forEach',Array.prototype.forEach);
 if(w.Element){
  define(Element.prototype,'matches',Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector||function(s){var nodes=(this.ownerDocument||document).querySelectorAll(s);for(var i=0;i<nodes.length;i++)if(nodes[i]===this)return true;return false;});
  define(Element.prototype,'closest',function(s){var e=this;while(e&&e.nodeType===1){if(e.matches(s))return e;e=e.parentElement;}return null;});
  define(Element.prototype,'remove',function(){if(this.parentNode)this.parentNode.removeChild(this);});
  define(Element.prototype,'append',function(){for(var i=0;i<arguments.length;i++)this.appendChild(arguments[i] instanceof Node?arguments[i]:document.createTextNode(String(arguments[i])));});
  define(Element.prototype,'prepend',function(){var first=this.firstChild;for(var i=0;i<arguments.length;i++)this.insertBefore(arguments[i] instanceof Node?arguments[i]:document.createTextNode(String(arguments[i])),first);});
  define(Element.prototype,'replaceWith',function(node){if(this.parentNode)this.parentNode.replaceChild(node instanceof Node?node:document.createTextNode(String(node)),this);});
 }
 if(w.Blob&&w.Promise){
  define(Blob.prototype,'arrayBuffer',function(){var b=this;return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error);};r.readAsArrayBuffer(b);});});
  define(Blob.prototype,'text',function(){var b=this;return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error);};r.readAsText(b);});});
 }
 if(!w.Promise||!w.Map||!w.Set){if(w.AppBoot)w.AppBoot.fail('此设备的网页组件过旧，缺少必要功能。请导出诊断信息，练习记录未被清除。');}
})(window);
