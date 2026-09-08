// Run the bounded candidate checks serially and retain real process exit statuses.
import { spawn } from 'node:child_process';
import { openSync, closeSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = import.meta.dirname;
const checks = [
  ['verify', 'npm', ['run', 'verify']],
  ['identity', 'npm', ['run', 'verify:identity']],
  ['chromium', 'npx', ['playwright', 'test', ...['mvp-preview','stretch','learn','evidence','workbench','smoke','ux-overhaul'].map(n=>`test/browser/${n}.spec.js`), '--project=chromium', '--grep-invert', '@sweep']],
  ['keyboard-picking', 'npx', ['playwright', 'test', 'test/browser/picking.spec.js', '--project=chromium', '--grep', 'direct labels are operable|touch tap selects']],
  ...['firefox','webkit'].map(engine=>[engine, 'npx', ['playwright','test', ...['mvp-preview','stretch','learn','evidence'].map(n=>`test/browser/${n}.spec.js`), `--project=${engine}`]]),
];
const results = [];
const manifest = JSON.parse(readFileSync('release/MANIFEST.json', 'utf8'));
for (const [name, command, args] of checks) {
  const started = new Date().toISOString();
  console.log(`Starting ${name} at ${started}`);
  const fd = openSync(resolve(out, `final-${name}.log`), 'w');
  const code = await new Promise((done, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', fd, fd] });
    child.once('error', reject);
    child.once('close', done);
  });
  closeSync(fd);
  results.push({ name, command, args, started, finished: new Date().toISOString(), exit_code: code });
  writeFileSync(resolve(out, 'final-check-results.json'), JSON.stringify({ app_revision: manifest.app_revision, build_inputs_fingerprint: manifest.build_inputs_fingerprint, results }, null, 2)+'\n');
  console.log(`${name}: exit ${code}`);
  if (code !== 0) process.exit(code || 1);
}
