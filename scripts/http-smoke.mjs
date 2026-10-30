import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Run parent, child and client in one execution context to avoid crossing sandbox
// network boundaries. Never contact public services or load third-party scripts.
const control = http.createServer((_, response) => response.end('local-control'));
control.listen(0, '127.0.0.1');
await once(control, 'listening');
const port = control.address().port;
try {
  const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(await response.text(), 'local-control');
  console.log('PASS control loopback HTTP');
} finally { await new Promise(resolve => control.close(resolve)); }

const child = spawn(process.execPath, ['node_modules/@react-router/serve/bin.js', 'build/server/index.js'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let output = '';
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Production server startup timeout: ' + output)), 10000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
    child.stderr.on('data', value => { output += value.toString(); });
    child.stdout.on('data', value => {
      output += value.toString();
      if (output.includes('[react-router-serve]')) { clearTimeout(timeout); resolve(); }
    });
  });
  for (const path of ['/', '/auth', '/upload', '/resume/test', '/wipe', '/profile', '/prepare', '/applications', '/jobs', '/match/ashby/Ashby/test']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(html.includes(path === '/auth' ? 'Log In to Continue Your Job Journey' : 'Verifying your session'), path);
    assert.ok(!html.includes('resumePath'), path + ' must not serialize a private record');
    console.log(`PASS production HTTP ${path}: 200`);
  }
  for (const path of ['/pdf.worker.min.mjs', '/favicon.ico']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, path);
    console.log(`PASS static HTTP ${path}: 200`);
  }
  for (const path of ['/images/resume-1.png', '/images/resume-2.png', '/images/resume-3.png', '/verification/release-account-harness.html', '/verification/inspect-release-files.html', '/verification/recover-release-fixtures.html', '/verification/release-isolation.ts', '/tests/fixtures/pdf/synthetic-two-page.pdf']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404, 'Local verification assets and unverified CV samples must not be publicly served: ' + path);
    console.log(`PASS privacy HTTP ${path}: 404`);
  }
  const invalid=await fetch(`http://127.0.0.1:${port}/api/jobs?url=https://127.0.0.1/private`,{signal:AbortSignal.timeout(5000)});
  assert.equal(invalid.status,400);console.log('PASS public API rejects arbitrary URL input: 400');
  const mutation=await fetch(`http://127.0.0.1:${port}/api/jobs`,{method:'POST',signal:AbortSignal.timeout(5000)});
  assert.equal(mutation.status,405);console.log('PASS public API rejects mutations: 405');
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, 'exit');
}
