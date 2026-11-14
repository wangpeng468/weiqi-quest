const ts=require('typescript');const fs=require('fs'),path=require('path');
for (const name of ['engine','catalog','voice','sfx','battle-engine','battle','app']) {
 const result=ts.transpileModule(fs.readFileSync(path.join(__dirname,'web-src',name+'.js'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None,allowJs:true,downlevelIteration:true,removeComments:false}});
 fs.writeFileSync(path.join(__dirname,'assets',name+'.js'),result.outputText);console.log(name,result.outputText.length);
}
