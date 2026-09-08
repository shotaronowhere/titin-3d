// Retain the interrupted timeout run and rerun the unchanged WebKit matrix once.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=import.meta.dirname;
const path=`${out}/final-check-results.json`;
const record=JSON.parse(readFileSync(path));
const manifest=JSON.parse(readFileSync('release/MANIFEST.json'));
assert.equal(record.app_revision,manifest.app_revision);
const old=record.results.find(r=>r.name==='webkit');
assert.equal(old.exit_code,130);
const args=['-di','npx','playwright','test',...['mvp-preview','stretch','learn','evidence'].map(n=>`test/browser/${n}.spec.js`),'--project=webkit'];
const fd=openSync(`${out}/final-webkit.log`,'w');
const started=new Date().toISOString();
const code=await new Promise((done,reject)=>{
 const child=spawn('/usr/bin/caffeinate',args,{stdio:['ignore',fd,fd]});
 child.once('error',reject);child.once('close',done);
});
closeSync(fd);
record.prior_attempts=[{...old,log:'webkit-first-attempt.log',traces:'webkit-first-attempt-traces',note:'Three timeouts during element/click operations coincided with slow host tool responses; run interrupted. Cause not established. Fresh WebKit matrix uses the same application, assertions, and timeouts, with process-scoped idle-sleep prevention.'}];
record.results=record.results.map(r=>r.name==='webkit'?{name:'webkit',command:'/usr/bin/caffeinate',args,started,finished:new Date().toISOString(),exit_code:code}:r);
writeFileSync(path,JSON.stringify(record,null,2)+'\n');
console.log(`WebKit fresh run: exit ${code}`);
process.exit(code||0);
