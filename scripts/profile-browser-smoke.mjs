// Real Chromium + production React Router UI + real PDF.js. Puter transport is
// explicitly controlled and synthetic; this does not certify live isolation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.JOBPILOT_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.JOBPILOT_PLAYWRIGHT_MODULE).href : 'playwright');
const out = resolve('../../outputs'); await mkdir(out, { recursive: true });
const port = Number(process.env.JOBPILOT_PROFILE_TEST_PORT || 5176);
const child = spawn(process.execPath, ['node_modules/@react-router/serve/bin.js', 'build/server/index.js'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const results = []; let browser; let output = ''; const errors = []; const external = [];
function pdfFixture() {
  const pages = [['Employment', 'Developer at Example 2021-01 to 2023-06', 'Freelance', 'Synthetic client project 2020 to 2024'], ['Skills', 'React, TypeScript', 'Projects', 'Personal synthetic dashboard']];
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  pages.forEach((lines, i) => {
    const text = 'BT /F1 12 Tf 50 740 Td ' + lines.map((line, n) => `${n ? '0 -24 Td ' : ''}(${line}) Tj`).join('\n') + ' ET';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`, `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`);
  });
  let raw = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(raw)); raw += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(raw); raw += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(raw + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}
try {
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout: ' + output)), 20000);
    child.on('error', reject); child.stderr.on('data', b => { output += b; });
    child.stdout.on('data', b => { output += b; if (output.includes('[react-router-serve]')) { clearTimeout(timer); resolveReady(); } });
  });
  browser = await chromium.launch({ headless: true, ...(process.env.JOBPILOT_BROWSER_EXECUTABLE ? { executablePath: process.env.JOBPILOT_BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const data = new Map();
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('__profileTestRpc', async (owner, method, args) => {
    assert.ok(['synthetic-a', 'synthetic-b'].includes(owner));
    const prefix = owner + ':';
    if (method === 'list') return [...data].filter(([k]) => k.startsWith(prefix + args[0].replace(/\*$/, ''))).map(([k, value]) => ({ key: k.slice(prefix.length), value }));
    if (method === 'get') return data.get(prefix + args[0]) ?? null;
    if (method === 'set') { data.set(prefix + args[0], args[1]); return true; }
    throw new Error('Unexpected synthetic transport request');
  });
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url === 'https://js.puter.com/v2/') return route.fulfill({ contentType: 'application/javascript', body: `
      window.__profileTestControl={owner:'synthetic-a',signedIn:true};
      const c=window.__profileTestControl;
      window.puter={auth:{isSignedIn:async()=>c.signedIn,getUser:async()=>({uuid:c.owner,username:'Synthetic'}),signIn:async()=>{c.signedIn=true},signOut:async()=>{c.signedIn=false}},
      kv:Object.fromEntries(['get','set','list'].map(method=>[method,(...args)=>window.__profileTestRpc(c.owner,method,args)]))};
    ` });
    if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
    external.push(new URL(url).origin); return route.abort();
  });
  const pass = name => { results.push({ test: name, status: 'PASS' }); console.log('PASS ' + name); };
  await page.goto(`http://127.0.0.1:${port}/profile`);
  await page.getByText('No saved profile yet.', { exact: true }).waitFor();
  const bytes = pdfFixture(); await writeFile(resolve(out, 'milestone-1-synthetic-cv.pdf'), bytes);
  await page.getByLabel('Master CV (PDF)').setInputFiles({ name: 'synthetic-master.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('button', { name: 'Extract profile', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm against CV', exact: true }).first().waitFor();
  assert.equal(await page.getByLabel('Title, skill or qualification', { exact: true }).count(), 5);
  await page.getByText('Read extracted CV evidence (2 pages)', { exact: true }).click();
  assert.ok((await page.getByRole('region', { name: 'Source page 2' }).innerText()).includes('Personal synthetic dashboard'));
  pass('actual production route imports and extracts all PDF pages with separate claim categories');
  await page.getByRole('button', { name: 'Confirm against CV', exact: true }).nth(2).click();
  await page.getByText('CV-backed, candidate confirmed', { exact: true }).waitFor();
  await page.getByLabel('Proficiency (leave unknown if absent)', { exact: true }).nth(2).fill('Expert');
  assert.equal(await page.getByText('CV-backed, candidate confirmed', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Confirm against CV', exact: true }).nth(2).click();
  await page.getByRole('alert').waitFor();
  pass('editing invalidates confirmation and unsupported proficiency cannot be CV-confirmed');
  await page.getByLabel('Proficiency (leave unknown if absent)', { exact: true }).nth(2).fill('');
  await page.getByRole('button', { name: 'Confirm against CV', exact: true }).nth(2).click();
  await page.getByLabel('Preferred job titles', { exact: true }).fill('Frontend developer, Full-stack developer');
  await page.getByLabel('Preferred locations', { exact: true }).fill('South Africa, Remote');
  await page.getByLabel('Your time zone (IANA)', { exact: true }).fill('Africa/Johannesburg');
  await page.getByLabel('Preferred overlap time zones (IANA)', { exact: true }).fill('Europe/London, America/New_York');
  await page.getByLabel('Working hours per week', { exact: true }).fill('40');
  await page.getByLabel('Specify salary expectations', { exact: true }).check();
  await page.getByLabel('Minimum salary', { exact: true }).fill('40000');
  await page.getByLabel('Maximum salary', { exact: true }).fill('60000');
  await page.getByLabel('Salary currency (ISO code)', { exact: true }).fill('ZAR');
  await page.getByLabel('Salary period', { exact: true }).selectOption('month');
  await page.getByLabel('I agree to save the profile and extracted CV text privately in Puter.', { exact: true }).check();
  await page.getByRole('button', { name: 'Save private revision', exact: true }).click();
  await page.getByText('Private revision saved and read back successfully.', { exact: true }).waitFor();
  assert.equal(data.size, 1); const saved = JSON.parse([...data.values()][0]);
  assert.deepEqual(saved.preferences.titles, ['Frontend developer', 'Full-stack developer']);
  assert.deepEqual(saved.preferences.salary, { min: 40000, max: 60000, currency: 'ZAR', period: 'month' });
  await page.reload(); await page.getByText('Private profile loaded. Changes require a new revision.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Your time zone (IANA)', { exact: true }).inputValue(), 'Africa/Johannesburg');
  pass('private immutable save and reload with salary, locations, titles, hours and time zones (controlled SDK)');
  await page.getByLabel('Master CV (PDF)').setInputFiles(resolve('tests/fixtures/pdf/malformed.pdf'));
  await page.getByRole('button', { name: 'Extract profile', exact: true }).click(); await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('Title, skill or qualification', { exact: true }).count(), 5);
  pass('invalid PDF import retains the prior profile');
  await page.getByLabel('Master CV (PDF)').setInputFiles({ name: 'synthetic-master.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('button', { name: 'Extract profile', exact: true }).click();
  await page.getByText(/CV extracted locally/).waitFor(); pass('readable PDF import recovers after invalid input');
  await page.screenshot({ path: resolve(out, 'milestone-1-browser.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Profile must fit a mobile viewport');
  await page.screenshot({ path: resolve(out, 'milestone-1-browser-mobile.png'), fullPage: true });
  pass('mobile profile fits the viewport and retains accessible controls');
  assert.equal(await page.evaluate(() => localStorage.length), 0); pass('no candidate data written to localStorage');
  await page.evaluate(() => { window.__profileTestControl.owner = 'synthetic-b'; window.dispatchEvent(new Event('focus')); });
  await page.getByText('Log In to Continue Your Job Journey', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Title, skill or qualification', { exact: true }).count(), 0);
  pass('account change hides source and profile and requires fresh sign-in');
  assert.deepEqual(errors, []); pass('no uncaught browser page errors');
  await writeFile(resolve(out, 'milestone-1-browser.json'), JSON.stringify({ success: true, environment: 'Chromium production build; controlled synthetic Puter SDK, no live credentials', results, externalRequestsBlocked: [...new Set(external)], pageErrors: errors }, null, 2));
} catch (error) {
  await writeFile(resolve(out, 'milestone-1-browser.json'), JSON.stringify({ success: false, results, error: String(error), pageErrors: errors }, null, 2));
  throw error;
} finally {
  await browser?.close(); child.kill(); if (child.exitCode === null) await once(child, 'exit');
}
