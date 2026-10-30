// Genuine loopback HTTP transfer calibration; NOT Puter account isolation evidence.
import {createServer as httpServer} from 'node:http';
import {createServer} from 'vite';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const vite=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
const server=httpServer((req,res)=>{
 if(req.url==='/stream'){
  res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});
  let count=0;const timer=setInterval(()=>{res.write(Buffer.alloc(16384,83));if(++count===40){clearInterval(timer);res.end();}},100);
  res.on('close',()=>clearInterval(timer));return;
 }
 if(req.url==='/'){res.end('<!doctype html><title>Network observer calibration</title>');return;}
 vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const {chromium}=await import(pathToFileURL(process.env.JOBPILOT_PLAYWRIGHT_MODULE).href);
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.JOBPILOT_BROWSER_EXECUTABLE});
 const page=await browser.newPage();await page.goto(base);
 await page.evaluate(async()=>{
  const {NetworkEvidence,observeXHR}=await import('/verification/network-evidence.ts');
  window.calibration=new NetworkEvidence();window.restore=observeXHR(window,u=>u.origin===location.origin&&u.pathname==='/stream',window.calibration);
  const x=new XMLHttpRequest();x.open('GET','/stream');window.done=new Promise(r=>x.addEventListener('loadend',r,{once:true}));x.send();
 });
 await page.waitForFunction(()=>window.calibration.summary().transfers===1);
 const pending=await page.evaluate(()=>{window.calibration.changed(performance.now());return window.calibration.summary();});
 assert.equal(pending.pending,1);assert.equal(pending.overlap,true);
 await page.evaluate(async()=>{await window.done;window.restore();});
 const complete=await page.evaluate(()=>window.calibration.summary());assert.equal(complete.pending,0);assert.equal(complete.overlap,true);
 const negative=await page.evaluate(async()=>{
  const {NetworkEvidence,observeXHR}=await import('/verification/network-evidence.ts');const e=new NetworkEvidence();const restore=observeXHR(window,()=>false,e);
  const x=new XMLHttpRequest();x.open('GET','/stream');const done=new Promise(r=>x.addEventListener('loadend',r,{once:true}));x.send();await done;restore();return e.summary();
 });assert.equal(negative.requests,0);
 await writeFile('../../outputs/milestone-6a-network-calibration.json',JSON.stringify({status:'PASS',scope:'Real Chrome XHR and loopback HTTP bytes. Identity-change timestamp is synthetic calibration only. No Puter sign-in or live isolation tested.',pending,complete,ignoredTraffic:negative,livePuterIsolation:'NOT TESTED'},null,2));
 console.log('PASS actual browser transfer, completion and ignored-traffic calibration. Puter isolation NOT TESTED.');
}finally{await browser?.close();await new Promise(r=>server.close(r));await vite.close();}
