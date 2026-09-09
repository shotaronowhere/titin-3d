// Reproduce the committed candidate in a clean detached worktree, with locked dependencies.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = resolve('.');
const base = mkdtempSync(join(tmpdir(), 'titin-final-reproduction-'));
const checkout = join(base, 'checkout');
const log = [];
function run(cmd, args, cwd=root) {
  const result = spawnSync(cmd, args, { cwd, encoding:'utf8', maxBuffer: 16*1024*1024 });
  log.push({cmd,args,cwd,status:result.status,output:result.stdout+result.stderr});
  writeFileSync(resolve(import.meta.dirname,'reproduction-commands.json'),JSON.stringify(log,null,2)+'\n');
  assert.equal(result.status,0,`${cmd} ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
const head = run('git',['rev-parse','HEAD']);
run('git',['worktree','add','--detach',checkout,head]);
run('npm',['ci'],checkout);
run('npm',['run','build:release'],checkout);
run('npm',['run','pack'],checkout);
function paths(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=join(dir,entry.name);
    return entry.isDirectory()?paths(path):[path];
  });
}
const files = ['index.html',...paths(join(root,'release')).map(p=>relative(root,p))].sort();
const rebuilt = ['index.html',...paths(join(checkout,'release')).map(p=>relative(checkout,p))].sort();
assert.deepEqual(rebuilt,files);
const matches = files.map(path=>{
  const expected=readFileSync(join(root,path)), actual=readFileSync(join(checkout,path));
  assert.ok(expected.equals(actual),`Reproduction differs: ${path}`);
  return {path,bytes:actual.length,sha256:createHash('sha256').update(actual).digest('hex')};
});
writeFileSync(resolve(import.meta.dirname,'reproduction.json'),JSON.stringify({head,checkout,files:matches,byte_identical:true},null,2)+'\n');
console.log(`Clean worktree reproduced ${files.length} candidate files byte-for-byte: ${checkout}`);
