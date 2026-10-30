import assert from 'node:assert/strict';
import { createRequestHandler } from 'react-router';
import * as build from '../build/server/index.js';

const handle = createRequestHandler(build, 'production');
for (const path of ['/', '/auth', '/upload', '/resume/test', '/wipe', '/profile', '/prepare', '/applications', '/jobs', '/match/ashby/Ashby/test']) {
  const response = await handle(new Request(`http://localhost${path}`));
  const html = await response.text();
  assert.equal(response.status, 200, `${path} status`);
  if (path !== '/auth') {
    assert.ok(html.includes('Verifying your session'), `${path} must render only private loading shell`);
    assert.ok(!html.includes('resumePath'), `${path} must not serialize private file records`);
  } else {
    assert.ok(html.includes('Log In to Continue Your Job Journey'));
  }
  console.log(`${path}: 200; ${path === '/auth' ? 'auth screen' : 'private loading shell'}`);
}
